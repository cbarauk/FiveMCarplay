local Cars = {}
local Subs = {}
local Cache = {}
local CacheCount = 0
local lastResolve, lastSave = {}, {}

local function dbg(...) if Config.Debug then print('^5[BCarplay]^7', ...) end end
local function now() return os.time() end

local function clip(s, n)
    s = tostring(s or '')
    if not utf8.len(s) then s = s:gsub('[\128-\255]', '?') end
    local len = utf8.len(s)
    if len and len > n then s = s:sub(1, (utf8.offset(s, n + 1) or (#s + 1)) - 1) end
    return s
end

local function urlenc(s)
    return (tostring(s):gsub('[^%w%-_%.~]', function(c) return string.format('%%%02X', c:byte()) end))
end

local function unesc(s)
    s = s:gsub('\\u([dD][89abAB]%x%x)\\u([dD][c-fC-F]%x%x)', function(h, l)
        local hi, lo = tonumber(h, 16), tonumber(l, 16)
        return utf8.char(0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00))
    end)
    s = s:gsub('\\u(%x%x%x%x)', function(h)
        local c = tonumber(h, 16)
        if c >= 0xD800 and c <= 0xDFFF then return '' end
        return utf8.char(c)
    end)
    s = s:gsub('\\"', '"'):gsub('\\/', '/'):gsub('\\\\', '\\')
    return s
end

local function unhtml(s)
    s = s:gsub('&#x27;', "'"):gsub('&#39;', "'"):gsub('&quot;', '"'):gsub('&lt;', '<'):gsub('&gt;', '>'):gsub('&amp;', '&')
    return s
end

local UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

local function httpGet(url, extra, cb)
    local headers = { ['User-Agent'] = UA, ['Accept-Language'] = 'en-GB,en;q=0.9' }
    for k, v in pairs(extra or {}) do headers[k] = v end
    PerformHttpRequest(url, function(status, body) cb(status, body) end, 'GET', '', headers)
end

local function getIdentifier(src)
    if GetResourceState('qb-core') == 'started' then
        local ok, QBCore = pcall(function() return exports['qb-core']:GetCoreObject() end)
        if ok and QBCore then
            local p = QBCore.Functions.GetPlayer(src)
            if p and p.PlayerData and p.PlayerData.citizenid then return 'cid:' .. p.PlayerData.citizenid end
        end
    end
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if id:sub(1, 8) == 'license:' then return id end
    end
    return 'src:' .. tostring(src)
end

local function cleanTrack(t)
    if type(t) ~= 'table' then return nil end
    local src, vid = t.source, tostring(t.vid or '')
    if src == 'youtube' then
        if #vid ~= 11 or not vid:match('^[%w_%-]+$') then return nil end
    else
        return nil
    end
    local thumb = tostring(t.thumb or '')
    if #thumb > 300 or not thumb:match('^https://[%w%.%-_/%%%?=&~]+$') then thumb = '' end
    return {
        source = src, vid = vid,
        title = clip(t.title, 100), artist = clip(t.artist, 60),
        thumb = thumb,
    }
end

local function cleanLibrary(lib)
    local out = { tracks = {}, playlists = {} }
    if type(lib) ~= 'table' then return out end
    if type(lib.tracks) == 'table' then
        for _, t in ipairs(lib.tracks) do
            if #out.tracks >= Config.MaxSavedTracks then break end
            local c = cleanTrack(t); if c then out.tracks[#out.tracks + 1] = c end
        end
    end
    if type(lib.playlists) == 'table' then
        for _, p in ipairs(lib.playlists) do
            if #out.playlists >= Config.MaxPlaylists then break end
            if type(p) == 'table' then
                local pl = { id = clip(p.id, 24), name = clip(p.name, 40), tracks = {} }
                if pl.name == '' then pl.name = 'Playlist' end
                if type(p.tracks) == 'table' then
                    for _, t in ipairs(p.tracks) do
                        if #pl.tracks >= Config.MaxPlaylistTracks then break end
                        local c = cleanTrack(t); if c then pl.tracks[#pl.tracks + 1] = c end
                    end
                end
                out.playlists[#out.playlists + 1] = pl
            end
        end
    end
    return out
end

local function loadLibrary(src)
    local raw = GetResourceKvpString('lib:' .. getIdentifier(src))
    if raw then
        local ok, lib = pcall(json.decode, raw)
        if ok and type(lib) == 'table' then return cleanLibrary(lib) end
    end
    return { tracks = {}, playlists = {} }
end

local function parseInput(s)
    s = (s or ''):gsub('^%s+', ''):gsub('%s+$', '')
    local id
    if s:find('youtu%.be/') then
        id = s:match('youtu%.be/([%w_%-]+)')
    elseif s:find('youtube%.com') then
        id = s:match('[?&]v=([%w_%-]+)') or s:match('/shorts/([%w_%-]+)') or s:match('/embed/([%w_%-]+)') or s:match('/live/([%w_%-]+)')
    end
    if id and #id >= 11 then return 'youtube', id:sub(1, 11) end

    if s:find('soundcloud%.com') or s:find('spotify%.com') or s:find('spotify:') then return 'unknown' end
    if s:match('^https?://') then return 'unknown' end
    return 'search', s
end

local function cachePut(key, val)
    if CacheCount > 500 then Cache = {}; CacheCount = 0 end
    if not Cache[key] then CacheCount = CacheCount + 1 end
    Cache[key] = val
end

local function ytSearch(query, limit, cb)
    local url = 'https://www.youtube.com/results?search_query=' .. urlenc(query) .. '&sp=EgIQAQ%253D%253D'
    httpGet(url, { ['Cookie'] = 'CONSENT=YES+1; SOCS=CAI' }, function(status, body)
        if status ~= 200 or not body then return cb(nil) end
        local out, seen, pos = {}, {}, 1
        while #out < limit do
            local s, e, id = body:find('"videoRenderer":{"videoId":"([%w_%-]+)"', pos)
            if not s then break end
            pos = e + 1
            if #id == 11 and not seen[id] then
                seen[id] = true
                local nextS = body:find('"videoRenderer":{"videoId":"', pos, true) or #body
                local seg = body:sub(pos, nextS)
                local title = seg:match('"title":{"runs":%[{"text":"(.-)"}%]')
                local artist = seg:match('"ownerText":{"runs":%[{"text":"(.-)"')
                if title then
                    out[#out + 1] = {
                        source = 'youtube', vid = id,
                        title = clip(unesc(title), 100), artist = clip(unesc(artist or ''), 60),
                        thumb = 'https://i.ytimg.com/vi/' .. id .. '/mqdefault.jpg',
                    }
                end
            end
        end
        cb(out)
    end)
end

local function resolveYoutube(id, cb)
    local key = 'yt:' .. id
    if Cache[key] then return cb(Cache[key]) end
    local url = 'https://www.youtube.com/oembed?format=json&url=' .. urlenc('https://www.youtube.com/watch?v=' .. id)
    httpGet(url, nil, function(status, body)
        if status ~= 200 or not body then return cb(nil) end
        local ok, data = pcall(json.decode, body)
        if not ok or type(data) ~= 'table' then return cb(nil) end
        local t = {
            source = 'youtube', vid = id,
            title = clip(data.title or id, 100), artist = clip(data.author_name or '', 60),
            thumb = 'https://i.ytimg.com/vi/' .. id .. '/mqdefault.jpg',
        }
        cachePut(key, t)
        cb(t)
    end)
end

RegisterNetEvent('bcarplay:resolve', function(reqId, input)
    local src = source
    local t = GetGameTimer()
    if lastResolve[src] and t - lastResolve[src] < 1200 then
        return TriggerClientEvent('bcarplay:resolved', src, reqId, { ok = false, err = 'Slow down a little.' })
    end
    lastResolve[src] = t
    if type(input) ~= 'string' or #input > 300 or #input < 2 then
        return TriggerClientEvent('bcarplay:resolved', src, reqId, { ok = false, err = 'Enter a link or search term.' })
    end

    local function reply(res) dbg('resolve', input, '->', res and res.ok, res and res.err); TriggerClientEvent('bcarplay:resolved', src, reqId, res) end
    local function single(track, errMsg)
        if track then reply({ ok = true, kind = 'link', items = { track } })
        else reply({ ok = false, err = errMsg or 'Could not load that link.' }) end
    end

    local kind, val = parseInput(input)
    if kind == 'youtube' then resolveYoutube(val, function(tr) single(tr, 'Video unavailable or embedding is disabled.') end)
    elseif kind == 'unknown' then reply({ ok = false, err = 'Unsupported link. Only YouTube links are supported.' })
    else
        ytSearch(val, Config.SearchResults, function(res)
            if res and #res > 0 then reply({ ok = true, kind = 'search', items = res })
            else reply({ ok = false, err = 'No results (or the server cannot reach YouTube).' }) end
        end)
    end
end)

local function validVeh(src, netId)
    if type(netId) ~= 'number' then return nil end
    local veh = NetworkGetEntityFromNetworkId(netId)
    if not veh or veh == 0 or not DoesEntityExist(veh) then return nil end
    local ped = GetPlayerPed(src)
    if GetVehiclePedIsIn(ped, false) ~= veh then return nil end
    if Config.DriverOnly and GetPedInVehicleSeat(veh, -1) ~= ped then return nil end
    if Config.RequireEngineOn and not GetIsVehicleEngineRunning(veh) then return nil end
    return veh
end

local function getCar(netId)
    local car = Cars[netId]
    if not car then
        car = { queue = {}, index = 0, seq = 0, track = nil, startedAt = 0, paused = false, pausedAt = 0,
                vol = Config.DefaultCarVolume, loop = 'off', shuffle = false }
        Cars[netId] = car
    end
    return car
end

local function position(car)
    if car.paused then return car.pausedAt end
    return math.max(0, now() - car.startedAt)
end

local function publish(netId, car)
    local veh = NetworkGetEntityFromNetworkId(netId)
    if not veh or veh == 0 or not DoesEntityExist(veh) then return end
    local t = car.track
    if not t then
        Entity(veh).state:set('bcarplay', nil, true)
        return
    end
    Entity(veh).state:set('bcarplay', {
        src = t.source, vid = t.vid, title = t.title, artist = t.artist, thumb = t.thumb,
        startedAt = car.startedAt, paused = car.paused, pausedAt = car.pausedAt,
        vol = car.vol, seq = car.seq, loop = car.loop, shuffle = car.shuffle,
    }, true)
end

local function pushQueue(netId, car)
    local subs = Subs[netId]
    if not subs then return end
    for s in pairs(subs) do
        TriggerClientEvent('bcarplay:queue', s, netId, car.queue, car.index, car.loop, car.shuffle, car.vol)
    end
end

local function playIndex(netId, car, i)
    local t = car.queue[i]
    if not t then return end
    car.index, car.track = i, t
    car.seq = car.seq + 1
    car.startedAt, car.paused, car.pausedAt = now(), false, 0
    publish(netId, car); pushQueue(netId, car)
end

local function stopCar(netId, car)
    car.track, car.index = nil, 0
    car.paused, car.pausedAt = false, 0
    publish(netId, car); pushQueue(netId, car)
end

local function advance(netId, car, auto)
    local n = #car.queue
    if n == 0 then return stopCar(netId, car) end
    if auto and car.loop == 'one' and car.track then return playIndex(netId, car, car.index) end
    local i
    if car.shuffle and n > 1 then
        repeat i = math.random(1, n) until i ~= car.index
    else
        i = car.index + 1
        if i > n then
            if car.loop == 'all' then i = 1 else return stopCar(netId, car) end
        end
    end
    playIndex(netId, car, i)
end

local function previous(netId, car)
    if car.track and position(car) > 3 then return playIndex(netId, car, car.index) end
    local i = car.index - 1
    if i < 1 then i = (car.loop == 'all') and #car.queue or 1 end
    if car.queue[i] then playIndex(netId, car, i) end
end

local function notify(src, msg, kind)
    TriggerClientEvent('bcarplay:notify', src, msg, kind or 'info')
end

RegisterNetEvent('bcarplay:open', function(netId)
    local src = source
    if not validVeh(src, netId) then return end
    local car = getCar(netId)
    Subs[netId] = Subs[netId] or {}
    Subs[netId][src] = true
    TriggerClientEvent('bcarplay:opened', src, netId, car.queue, car.index, car.loop, car.shuffle, car.vol, loadLibrary(src))
end)

RegisterNetEvent('bcarplay:close', function(netId)
    local src = source
    if Subs[netId] then Subs[netId][src] = nil end
end)

RegisterNetEvent('bcarplay:play', function(netId, tracks, startIndex)
    local src = source
    if type(tracks) ~= 'table' then return notify(src, 'Play failed: bad track data.', 'error') end
    if not validVeh(src, netId) then
        dbg('play rejected: invalid vehicle for', src, netId)
        return notify(src, 'Play failed: server does not see you in this vehicle (OneSync needed; check DriverOnly / RequireEngineOn).', 'error')
    end
    local q = {}
    for _, t in ipairs(tracks) do
        if #q >= Config.MaxQueue then break end
        local c = cleanTrack(t); if c then q[#q + 1] = c end
    end
    if #q == 0 then return notify(src, 'Play failed: track was rejected by the server.', 'error') end
    local car = getCar(netId)
    car.queue = q
    local i = tonumber(startIndex) or 1
    if car.shuffle and not startIndex then i = math.random(1, #q) end
    dbg('play', netId, q[1].source, q[1].vid)
    playIndex(netId, car, math.max(1, math.min(#q, math.floor(i))))
end)

RegisterNetEvent('bcarplay:enqueue', function(netId, tracks)
    local src = source
    if not validVeh(src, netId) or type(tracks) ~= 'table' then return end
    local car = getCar(netId)
    local added = 0
    for _, t in ipairs(tracks) do
        if #car.queue >= Config.MaxQueue then notify(src, 'Queue is full.', 'error') break end
        local c = cleanTrack(t)
        if c then car.queue[#car.queue + 1] = c; added = added + 1 end
    end
    if added == 0 then return end
    if not car.track then playIndex(netId, car, #car.queue - added + 1)
    else pushQueue(netId, car) end
    notify(src, ('Added %d to queue'):format(added), 'success')
end)

RegisterNetEvent('bcarplay:control', function(netId, action, value)
    local src = source
    if not validVeh(src, netId) then return end
    local car = getCar(netId)

    if action == 'toggle' then
        if not car.track then
            if #car.queue > 0 then playIndex(netId, car, math.max(1, car.index)) end
            return
        end
        if car.paused then
            car.startedAt = now() - car.pausedAt
            car.paused = false
        else
            car.pausedAt = position(car)
            car.paused = true
        end
        publish(netId, car)
    elseif action == 'next' then advance(netId, car, false)
    elseif action == 'prev' then previous(netId, car)
    elseif action == 'stop' then stopCar(netId, car)
    elseif action == 'seek' then
        local v = tonumber(value); if not v or not car.track then return end
        v = math.max(0, math.floor(v))
        if car.paused then car.pausedAt = v else car.startedAt = now() - v end
        publish(netId, car)
    elseif action == 'volume' then
        local v = tonumber(value); if not v then return end
        car.vol = math.max(0.0, math.min(1.0, v))
        publish(netId, car); pushQueue(netId, car)
    elseif action == 'loop' then
        if value == 'off' or value == 'all' or value == 'one' then car.loop = value end
        publish(netId, car); pushQueue(netId, car)
    elseif action == 'shuffle' then
        car.shuffle = value == true
        publish(netId, car); pushQueue(netId, car)
    elseif action == 'jump' then
        local i = tonumber(value)
        if i and car.queue[i] then playIndex(netId, car, math.floor(i)) end
    elseif action == 'removeq' then
        local i = tonumber(value)
        if not i or not car.queue[i] then return end
        i = math.floor(i)
        table.remove(car.queue, i)
        if i < car.index then
            car.index = car.index - 1
            pushQueue(netId, car)
        elseif i == car.index then
            if #car.queue == 0 then stopCar(netId, car)
            else playIndex(netId, car, math.min(i, #car.queue)) end
        else
            pushQueue(netId, car)
        end
    elseif action == 'clearq' then
        car.queue = {}
        stopCar(netId, car)
    end
end)

RegisterNetEvent('bcarplay:timeReq', function()
    TriggerClientEvent('bcarplay:timeRes', source, os.time())
end)

RegisterNetEvent('bcarplay:ended', function(netId, seq, failed, duration)
    local src = source
    local car = Cars[netId]
    if not car or not car.track or car.seq ~= seq then return end
    local veh = NetworkGetEntityFromNetworkId(netId)
    if not veh or veh == 0 or not DoesEntityExist(veh) then return end
    local ped = GetPlayerPed(src)
    if #(GetEntityCoords(ped) - GetEntityCoords(veh)) > Config.HearDistance + 25.0 then return end
    if not failed and not car.paused and (now() - car.startedAt) < 5 then return end
    -- a listener with a bad clock/buffering can report 'ended' early; only trust it near the real end
    duration = tonumber(duration) or 0
    if not failed and duration > 10 and (now() - car.startedAt) < duration - 8 then return end
    if failed then
        local subs = Subs[netId]
        if subs then for s in pairs(subs) do notify(s, 'Track could not be played - skipping', 'error') end end
    end
    advance(netId, car, not failed)
end)

RegisterNetEvent('bcarplay:saveLibrary', function(lib)
    local src = source
    local t = GetGameTimer()
    if lastSave[src] and t - lastSave[src] < 800 then return end
    lastSave[src] = t
    SetResourceKvp('lib:' .. getIdentifier(src), json.encode(cleanLibrary(lib)))
end)

AddEventHandler('playerDropped', function()
    local src = source
    lastResolve[src], lastSave[src] = nil, nil
    for _, subs in pairs(Subs) do subs[src] = nil end
end)

CreateThread(function()
    while true do
        Wait(5000)
        local occupied
        if Config.StopWhenEmpty then
            occupied = {}
            for _, pid in ipairs(GetPlayers()) do
                local veh = GetVehiclePedIsIn(GetPlayerPed(pid), false)
                if veh and veh ~= 0 then occupied[veh] = true end
            end
        end
        for netId, car in pairs(Cars) do
            local veh = NetworkGetEntityFromNetworkId(netId)
            if not veh or veh == 0 or not DoesEntityExist(veh) then
                Cars[netId], Subs[netId] = nil, nil
            elseif Config.StopWhenEmpty and car.track and not occupied[veh] then
                stopCar(netId, car)
            end
        end
    end
end)

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end
    for _, veh in ipairs(GetAllVehicles()) do
        if Entity(veh).state.bcarplay then Entity(veh).state:set('bcarplay', nil, true) end
    end
end)
