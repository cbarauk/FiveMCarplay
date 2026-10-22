window.GetParentResourceName = () => 'bcarplay';
(() => {
  const realFetch = window.fetch.bind(window);
  const now = () => Math.floor(Date.now() / 1000);
  const msg = m => window.postMessage(m, '*');
  const enc = encodeURIComponent;
  const clip = (s, n) => String(s || '').slice(0, n);

  async function get(url, type, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 7000);
    try {
      const r = await realFetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return type === 'json' ? await r.json() : await r.text();
    } finally { clearTimeout(t); }
  }
  const viaProxy = url => get('https://api.allorigins.win/raw?url=' + enc(url), 'text', 9000)
    .catch(() => get('https://corsproxy.io/?url=' + enc(url), 'text', 9000));

  function parseInput(s) {
    s = (s || '').trim();
    let id;
    if (/youtu\.be\//.test(s)) id = (s.match(/youtu\.be\/([\w-]+)/) || [])[1];
    else if (/youtube\.com/.test(s)) id = (s.match(/[?&]v=([\w-]+)/) || s.match(/\/(?:shorts|embed|live)\/([\w-]+)/) || [])[1];
    if (id && id.length >= 11) return ['youtube', id.slice(0, 11)];
    if (/soundcloud\.com|spotify\.com|spotify:/.test(s)) return ['unknown'];
    if (/^https?:\/\//.test(s)) return ['unknown'];
    return ['search', s];
  }

  const ytThumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const unesc = s => s.replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  async function ytSearch(q, limit) {
    for (const base of ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://api.piped.private.coffee']) {
      try {
        const d = await get(`${base}/search?q=${enc(q)}&filter=videos`, 'json', 6000);
        const out = (d.items || []).filter(i => i.url && /watch\?v=/.test(i.url)).slice(0, limit).map(i => {
          const id = i.url.split('v=')[1].slice(0, 11);
          return { source: 'youtube', vid: id, title: clip(i.title, 100), artist: clip(i.uploaderName, 60), thumb: ytThumb(id) };
        });
        if (out.length) return out;
      } catch (_) {}
    }
    try {
      const body = await viaProxy('https://www.youtube.com/results?search_query=' + enc(q) + '&sp=EgIQAQ%253D%253D');
      const out = [], seen = new Set(), re = /"videoRenderer":\{"videoId":"([\w-]{11})"/g;
      let m;
      while ((m = re.exec(body)) && out.length < limit) {
        if (seen.has(m[1])) continue; seen.add(m[1]);
        const seg = body.slice(re.lastIndex, re.lastIndex + 3000);
        const title = (seg.match(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/) || [])[1];
        const artist = (seg.match(/"ownerText":\{"runs":\[\{"text":"(.*?)"/) || [])[1];
        if (title) out.push({ source: 'youtube', vid: m[1], title: clip(unesc(title), 100), artist: clip(unesc(artist || ''), 60), thumb: ytThumb(m[1]) });
      }
      if (out.length) return out;
    } catch (_) {}
    return null;
  }

  async function resolve(input) {
    const [kind, val] = parseInput(input);
    try {
      if (kind === 'youtube') {
        const d = await get('https://www.youtube.com/oembed?format=json&url=' + enc('https://www.youtube.com/watch?v=' + val), 'json');
        return { ok: true, kind: 'link', items: [{ source: 'youtube', vid: val, title: clip(d.title || val, 100), artist: clip(d.author_name, 60), thumb: ytThumb(val) }] };
      }
      if (kind === 'unknown') return { ok: false, err: 'Unsupported link. Only YouTube links are supported.' };
      const res = await ytSearch(val, 6);
      return res ? { ok: true, kind: 'search', items: res } : { ok: false, err: 'No results (or the browser cannot reach YouTube / Piped).' };
    } catch (e) {
      return { ok: false, err: 'Could not load that link (' + e.message + ').' };
    }
  }

  const car = { queue: [], index: 0, seq: 0, loop: 'off', shuffle: false, vol: 0.6, track: null, startedAt: 0, paused: false, pausedAt: 0 };
  let lib = JSON.parse(localStorage.getItem('bcarplay_dev_lib') || 'null') || { tracks: [], playlists: [] };
  const pos = () => (car.paused ? car.pausedAt : now() - car.startedAt);
  const bag = () => car.track && { src: car.track.source, vid: car.track.vid, title: car.track.title, artist: car.track.artist, thumb: car.track.thumb,
    startedAt: car.startedAt, paused: car.paused, pausedAt: car.pausedAt, vol: car.vol, seq: car.seq, loop: car.loop, shuffle: car.shuffle };
  const pushQ = () => msg({ action: 'queue', queue: car.queue, index: car.index, loop: car.loop, shuffle: car.shuffle, vol: car.vol });
  const pushAudio = () => msg({ action: 'audio', cloudNow: now(), drift: 3, tracks: car.track ? [{ key: 1, source: car.track.source, vid: car.track.vid, seq: car.seq,
    startedAt: car.startedAt, paused: car.paused, pausedAt: car.pausedAt, vol: car.vol }] : [] });
  const pushS = () => { msg({ action: 'state', state: bag() || false, cloudNow: now() }); pushAudio(); };
  const playIdx = i => { const t = car.queue[i - 1]; if (!t) return; car.index = i; car.track = t; car.seq++; car.startedAt = now(); car.paused = false; car.pausedAt = 0; pushQ(); pushS(); };
  const stop = () => { car.track = null; car.index = 0; car.paused = false; pushQ(); pushS(); };
  const advance = auto => {
    const n = car.queue.length; if (!n) return stop();
    if (auto && car.loop === 'one' && car.track) return playIdx(car.index);
    let i = car.shuffle && n > 1 ? 1 + Math.floor(Math.random() * n) : car.index + 1;
    if (i > n) { if (car.loop === 'all') i = 1; else return stop(); }
    playIdx(i);
  };

  const handlers = {
    close: () => { msg({ action: 'close' }); return {}; },
    resolve: d => resolve(d.input),
    play: d => { car.queue = d.tracks; playIdx(d.index || 1); return {}; },
    enqueue: d => {
      const first = !car.track; car.queue.push(...d.tracks);
      if (first) playIdx(car.queue.length - d.tracks.length + 1); else pushQ();
      msg({ action: 'toast', msg: 'Added ' + d.tracks.length + ' to queue', kind: 'success' }); return {};
    },
    control: d => {
      const { action: a, value: v } = d;
      if (a === 'toggle') { if (!car.track) return {}; if (car.paused) { car.startedAt = now() - car.pausedAt; car.paused = false; } else { car.pausedAt = pos(); car.paused = true; } pushS(); }
      else if (a === 'next') advance(false);
      else if (a === 'prev') { if (car.track && pos() > 3) playIdx(car.index); else if (car.queue[car.index - 2]) playIdx(car.index - 1); }
      else if (a === 'stop') stop();
      else if (a === 'seek') { if (car.paused) car.pausedAt = v; else car.startedAt = now() - v; pushS(); }
      else if (a === 'volume') { car.vol = v; pushQ(); pushAudio(); }
      else if (a === 'loop') { car.loop = v; pushQ(); }
      else if (a === 'shuffle') { car.shuffle = v; pushQ(); }
      else if (a === 'jump') playIdx(v);
      else if (a === 'removeq') { car.queue.splice(v - 1, 1); if (v < car.index) { car.index--; pushQ(); } else if (v === car.index) { if (car.queue.length) playIdx(Math.min(v, car.queue.length)); else stop(); } else pushQ(); }
      else if (a === 'clearq') { car.queue = []; stop(); }
      return {};
    },
    saveLibrary: d => { lib = d.library; try { localStorage.setItem('bcarplay_dev_lib', JSON.stringify(lib)); } catch (_) {} return {}; },
    setMaster: () => ({}),
    ended: d => { if (d.seq === car.seq && car.track) advance(!d.failed); return {}; },
  };

  window.fetch = function (url, opts) {
    if (typeof url === 'string' && url.startsWith('https://bcarplay/')) {
      const name = url.split('/').pop();
      const body = opts && opts.body ? JSON.parse(opts.body) : {};
      return Promise.resolve((handlers[name] || (() => ({})))(body)).then(out => ({ json: () => Promise.resolve(out) }));
    }
    return realFetch(url, opts);
  };

  window.addEventListener('load', () => setTimeout(() => {
    msg({ action: 'open', netId: 1, queue: car.queue, index: car.index, loop: car.loop, shuffle: car.shuffle, vol: car.vol, library: lib, master: 1, state: bag() || false, cloudNow: now() });
  }, 150));
})();
