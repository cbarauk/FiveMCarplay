local Active = {}
local uiOpen, currentNetId = false, nil
local lastSig = ''
local pending, reqCounter = {}, 0
local masterVol = GetResourceKvpFloat('master') or Config.DefaultMasterVol
if masterVol == 0 and not GetResourceKvpString('master') then masterVol = Config.DefaultMasterVol end

local clockOffset = 0   -- serverTime - localCloudTime (seconds), keeps everyone on the SERVER's clock

local function netNow() return GetCloudTimeAsInt() + clockOffset end

RegisterNetEvent('bcarplay:timeRes', function(serverTime)
    if type(serverTime) == 'number' then clockOffset = serverTime - GetCloudTimeAsInt() end
    lastSig = ''  -- force a fresh audio push with the corrected clock
end)

CreateThread(function()
    while true do
        TriggerServerEvent('bcarplay:timeReq')
        Wait(60000)
    end
end)

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

local function toast(msg, kind)
    if uiOpen then
        SendNUIMessage({ action = 'toast', msg = msg, kind = kind or 'info' })
    else
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName('~o~BCarplay~s~: ' .. msg)
        EndTextCommandThefeedPostTicker(false, false)
    end
end

AddStateBagChangeHandler('bcarplay', nil, function(bagName, _, value)
    local netId = tonumber(bagName:match('^entity:(%d+)$'))
    if not netId then return end
    Active[netId] = value or nil
    if uiOpen and netId == currentNetId then
        SendNUIMessage({ action = 'state', state = value or false, cloudNow = netNow() })
    end
end)

CreateThread(function()
    while true do
        Wait(4000)
        for _, veh in ipairs(GetGamePool('CVehicle')) do
            local st = Entity(veh).state.bcarplay
            if st and NetworkGetEntityIsNetworked(veh) then
                Active[NetworkGetNetworkIdFromEntity(veh)] = st
            end
        end
    end
end)

local function pushAudio(force)
    local ped = PlayerPedId()
    local pc = GetEntityCoords(ped)
    local myVeh = GetVehiclePedIsIn(ped, false)
    local range = Config.HearDistance
    local inside, others = nil, {}
    local nearest = 99999.0

    for netId, st in pairs(Active) do
        if NetworkDoesNetworkIdExist(netId) then
            local veh = NetToVeh(netId)
            if veh ~= 0 and DoesEntityExist(veh) then
                local fresh = Entity(veh).state.bcarplay
                if not fresh then
                    Active[netId] = nil
                else
                    st = fresh
                    Active[netId] = fresh
                    local dist = #(pc - GetEntityCoords(veh))
                    if dist < nearest then nearest = dist end
                    if veh == myVeh then
                        inside = { netId = netId, st = st, dist = 0.0, inside = true }
                    elseif dist <= range then
                        others[#others + 1] = { netId = netId, st = st, dist = dist, inside = false }
                    end
                end
            end
        end
    end

    table.sort(others, function(a, b) return a.dist < b.dist end)
    local list = {}
    if inside then list[1] = inside end
    for i = 1, math.min(#others, Config.MaxOtherCars) do list[#list + 1] = others[i] end

    local out, sigParts = {}, {}
    for _, e in ipairs(list) do
        local vol
        if e.inside then
            vol = e.st.vol * masterVol
        else
            local f = 1.0 - (e.dist / range)
            vol = e.st.vol * masterVol * Config.OutsideMuffle * f * f
        end
        vol = math.floor(clamp(vol, 0.0, 1.0) * 33 + 0.5) / 33
        out[#out + 1] = {
            key = e.netId, source = e.st.src, vid = e.st.vid, seq = e.st.seq,
            startedAt = e.st.startedAt, paused = e.st.paused, pausedAt = e.st.pausedAt, vol = vol,
        }
        sigParts[#sigParts + 1] = ('%d:%d:%d:%s:%d:%.3f'):format(e.netId, e.st.seq, e.st.startedAt, tostring(e.st.paused), e.st.pausedAt, vol)
    end
    local sig = table.concat(sigParts, '|')
    if force or sig ~= lastSig then
        lastSig = sig
        SendNUIMessage({ action = 'audio', tracks = out, cloudNow = netNow(), drift = Config.DriftTolerance })
    end
    return nearest
end

CreateThread(function()
    while true do
        local wait = Config.TickIdle
        if next(Active) or lastSig ~= '' then
            local nearest = pushAudio(false)
            if nearest < Config.HearDistance * 2.0 then wait = Config.TickActive else wait = 800 end
        end
        Wait(wait)
    end
end)

local function closeUI()
    if not uiOpen then return end
    uiOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
    if currentNetId then TriggerServerEvent('bcarplay:close', currentNetId) end
    currentNetId = nil
end

local function openUI()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh == 0 then return toast('You must be in a vehicle to use Carplay.', 'error') end
    if Config.DriverOnly and GetPedInVehicleSeat(veh, -1) ~= ped then return toast('Only the driver can use Carplay.', 'error') end
    if Config.RequireEngineOn and not GetIsVehicleEngineRunning(veh) then return toast('Start the engine first.', 'error') end
    if not NetworkGetEntityIsNetworked(veh) then return toast('This vehicle is not networked.', 'error') end
    if uiOpen then return end
    currentNetId = NetworkGetNetworkIdFromEntity(veh)
    TriggerServerEvent('bcarplay:open', currentNetId)
end

RegisterNetEvent('bcarplay:opened', function(netId, queue, index, loop, shuffle, vol, library)
    if netId ~= currentNetId then return end
    uiOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open', netId = netId, queue = queue, index = index, loop = loop, shuffle = shuffle,
        vol = vol, library = library, master = masterVol,
        state = Active[netId] or false, cloudNow = netNow(),
    })
    CreateThread(function()
        while uiOpen do
            Wait(500)
            local veh = GetVehiclePedIsIn(PlayerPedId(), false)
            if veh == 0 or not NetworkGetEntityIsNetworked(veh) or NetworkGetNetworkIdFromEntity(veh) ~= currentNetId then
                closeUI()
            end
        end
    end)
end)

RegisterNetEvent('bcarplay:queue', function(netId, queue, index, loop, shuffle, vol)
    if uiOpen and netId == currentNetId then
        SendNUIMessage({ action = 'queue', queue = queue, index = index, loop = loop, shuffle = shuffle, vol = vol })
    end
end)

RegisterNetEvent('bcarplay:notify', function(msg, kind) toast(msg, kind) end)

RegisterNetEvent('bcarplay:resolved', function(reqId, result)
    local cb = pending[reqId]
    if cb then pending[reqId] = nil; cb(result) end
end)

RegisterNUICallback('close', function(_, cb) closeUI(); cb({}) end)

RegisterNUICallback('resolve', function(data, cb)
    reqCounter = reqCounter + 1
    local id = reqCounter
    pending[id] = cb
    TriggerServerEvent('bcarplay:resolve', id, tostring(data.input or ''))
    SetTimeout(15000, function()
        if pending[id] then pending[id]({ ok = false, err = 'Request timed out.' }); pending[id] = nil end
    end)
end)

RegisterNUICallback('play', function(data, cb)
    if currentNetId then TriggerServerEvent('bcarplay:play', currentNetId, data.tracks, data.index) end
    cb({})
end)

RegisterNUICallback('enqueue', function(data, cb)
    if currentNetId then TriggerServerEvent('bcarplay:enqueue', currentNetId, data.tracks) end
    cb({})
end)

RegisterNUICallback('control', function(data, cb)
    if currentNetId then TriggerServerEvent('bcarplay:control', currentNetId, data.action, data.value) end
    cb({})
end)

RegisterNUICallback('saveLibrary', function(data, cb)
    TriggerServerEvent('bcarplay:saveLibrary', data.library)
    cb({})
end)

RegisterNUICallback('ended', function(data, cb)
    if data.netId and data.seq then TriggerServerEvent('bcarplay:ended', data.netId, data.seq, data.failed == true, tonumber(data.duration) or 0) end
    cb({})
end)

local function setMaster(v)
    masterVol = clamp(v, 0.0, 1.0)
    SetResourceKvpFloat('master', masterVol)
    SetResourceKvp('master_set', '1')
    pushAudio(true)
end

RegisterNUICallback('setMaster', function(data, cb)
    local v = tonumber(data.value)
    if v then setMaster(v) end
    cb({})
end)

RegisterCommand(Config.OpenCommand, function() openUI() end, false)

RegisterCommand(Config.VolumeCommand, function(_, args)
    local v = tonumber(args[1])
    if not v or v < 0 or v > 1 then
        return toast(('Usage: /%s 0-1  (currently %.2f)'):format(Config.VolumeCommand, masterVol), 'info')
    end
    setMaster(v)
    toast(('Carplay volume set to %d%%'):format(math.floor(v * 100 + 0.5)), 'success')
    if uiOpen then SendNUIMessage({ action = 'master', value = masterVol }) end
end, false)

TriggerEvent('chat:addSuggestion', '/' .. Config.OpenCommand, 'Open the vehicle music player')
TriggerEvent('chat:addSuggestion', '/' .. Config.VolumeCommand, 'Set your personal Carplay volume', { { name = '0-1', help = '0 = mute, 1 = full' } })

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and uiOpen then SetNuiFocus(false, false) end
end)
