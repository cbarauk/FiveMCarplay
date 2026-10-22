(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const arr = x => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);

  const post = (name, data) =>
    fetch(`https://${GetParentResourceName()}/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(data || {}),
    }).then(r => r.json()).catch(() => ({}));

  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const k in props || {}) {
      const v = props[k];
      if (k === 'class') e.className = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }

  const S0 = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const F0 = 'viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
  const ICONS = {
    search: `<svg ${S0}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
    close: `<svg ${S0}><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    music: `<svg ${S0}><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>`,
    heart: `<svg ${S0}><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/></svg>`,
    queue: `<svg ${S0}><path d="M3 6h13M3 12h13M3 18h8"/><path d="M19 14v6M16 17h6"/></svg>`,
    list: `<svg ${S0}><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
    shuffle: `<svg ${S0}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
    prev: `<svg ${F0}><path d="M6 5v14M19 5 9 12l10 7z"/></svg>`,
    next: `<svg ${F0}><path d="M18 5v14M5 5l10 7-10 7z"/></svg>`,
    play: `<svg ${F0}><path d="M7 4v16l13-8z"/></svg>`,
    pause: `<svg ${F0}><path d="M7.5 5h2.5v14H7.5zM14 5h2.5v14H14z"/></svg>`,
    stop: `<svg ${F0}><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`,
    repeat: `<svg ${S0}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>`,
    repeat1: `<svg ${S0}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 10h1.5v5"/></svg>`,
    vol: `<svg ${S0}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>`,
    user: `<svg ${S0}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    plus: `<svg ${S0}><path d="M12 5v14M5 12h14"/></svg>`,
    grid: `<svg ${F0}><rect x="4" y="4" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="4" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="4" width="4.5" height="4.5" rx="1"/><rect x="4" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="4" y="15.5" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="15.5" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="15.5" width="4.5" height="4.5" rx="1"/></svg>`,
    trash: `<svg ${S0}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>`,
  };
  const ic = name => { const s = document.createElement('span'); s.className = 'ic'; s.style.display = 'contents'; s.innerHTML = ICONS[name] || ''; return s; };
  const setIcon = (el, name) => { if (el.dataset.icon !== name) { el.dataset.icon = name; el.innerHTML = ICONS[name] || ''; } };
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ICONS[el.dataset.icon] || ''; });

  const fmt = s => {
    s = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };
  const thumbOf = t => (t && t.thumb) || (t && t.source === 'youtube' && t.vid ? `https://i.ytimg.com/vi/${t.vid}/mqdefault.jpg` : '');
  const keyOf = t => t.source + ':' + t.vid;
  const slim = t => ({ source: t.source, vid: t.vid, title: t.title || '', artist: t.artist || '', thumb: t.thumb || '', });

  const S = {
    open: false, netId: null, updates: 0,
    queue: [], index: 0, loop: 'off', shuffle: false, vol: 0.6, master: 1,
    state: false,
    lib: { tracks: [], playlists: [] },
    tab: 'playing', libTab: 'liked', plOpen: null,
    results: null, searching: false, err: null, lastQuery: '',
    sheet: null,
  };
  const curTrack = () => S.queue[S.index - 1] || (S.state ? { source: S.state.src, vid: S.state.vid, title: S.state.title, artist: S.state.artist, thumb: S.state.thumb } : null);
  const isPlaying = () => !!S.state && !S.state.paused;

  function toast(msg, kind) {
    const t = h('div', { class: 'toast ' + (kind || 'info') }, String(msg));
    $('toasts').append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
  }

  let saveTimer = null;
  function saveLib() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => post('saveLibrary', { library: { tracks: S.lib.tracks.map(slim), playlists: S.lib.playlists.map(p => ({ id: p.id, name: p.name, tracks: p.tracks.map(slim) })) } }), 900);
  }
  const isLiked = t => S.lib.tracks.some(x => keyOf(x) === keyOf(t));
  function toggleLike(t) {
    const k = keyOf(t);
    if (isLiked(t)) { S.lib.tracks = S.lib.tracks.filter(x => keyOf(x) !== k); toast('Removed from Liked'); }
    else { S.lib.tracks.unshift(slim(t)); toast('Added to Liked', 'success'); }
    saveLib(); render();
  }
  function newPlaylist(name) {
    name = (name || '').trim().slice(0, 40) || 'Playlist';
    const p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), name, tracks: [] };
    S.lib.playlists.push(p); saveLib();
    return p;
  }
  function addToPlaylist(p, t) {
    if (p.tracks.some(x => keyOf(x) === keyOf(t))) return toast('Already in ' + p.name);
    p.tracks.push(slim(t)); saveLib(); toast('Added to ' + p.name, 'success');
  }

  const control = (action, value) => post('control', { action, value });
  const playTracks = (tracks, index) => post('play', { tracks: tracks.map(slim), index });
  const enqueue = tracks => post('enqueue', { tracks: tracks.map(slim) });

  const isLink = x => /^(https?:\/\/|www\.)|(^|\.)(youtu\.be|youtube\.com)\//i.test(x);

  let linkReq = 0;
  function runResolve(input) {
    input = (input || '').trim();
    if (input.length < 2) return;
    const link = isLink(input);
    S.err = null; S.lastQuery = input;

    if (link) {

      const myReq = ++linkReq;
      toast('Loading link…');
      let done = false;
      const fail = msg => {
        if (done || myReq !== linkReq) return; done = true;
        S.tab = 'search'; S.results = null; S.err = msg || 'Something went wrong.';
        toast(S.err, 'error'); render();
      };
      const timer = setTimeout(() => fail('Link took too long to load.'), 12000);
      post('resolve', { input }).then(r => {
        clearTimeout(timer);
        if (done || myReq !== linkReq) return;
        const items = r && r.ok ? arr(r.items) : [];
        if (!items.length) return fail(r && r.err);
        done = true;
        console.log('[BCarplay] playing', items[0].source, items[0].vid);
        $('quickInput').value = '';
        S.results = null; S.err = null; S.tab = 'playing';
        const before = S.updates;
        playTracks(items, 1);
        S.state = S.state; render();

        setTimeout(() => { if (S.updates === before) toast('Server did not start playback. Check the server console for BCarplay errors.', 'error'); }, 4000);
      });
      return;
    }

    S.tab = 'search'; S.searching = true; S.results = null;
    render();
    post('resolve', { input }).then(r => {
      S.searching = false;
      if (r && r.ok) { S.results = { kind: r.kind, items: arr(r.items) }; }
      else { S.results = null; S.err = (r && r.err) || 'Something went wrong.'; }
      if (S.tab === 'search') render();
    });
  }

  let queueReq = 0;
  function runQueue(input) {
    input = (input || '').trim();
    if (input.length < 2) return;
    const myReq = ++queueReq;
    toast('Adding to queue…');
    post('resolve', { input }).then(r => {
      if (myReq !== queueReq) return;
      const items = r && r.ok ? arr(r.items) : [];
      if (!items.length) return toast((r && r.err) || 'Could not add to queue.', 'error');
      enqueue([items[0]]);
      $('quickInput').value = '';
      toast('Added to queue: ' + (items[0].title || 'track'), 'success');
    });
  }

  function thumb(t) {
    const src = thumbOf(t);
    const box = h('div', { class: 'thumb' }, h('div', { class: 'ph' }, ic('music')));
    if (src) {
      const img = h('img', { src, alt: '', loading: 'lazy' });
      img.addEventListener('error', () => img.remove());
      box.append(img);
    }
    return box;
  }

  function actBtn(icon, title, fn, cls) {
    return h('button', { class: 'icon-btn sm ' + (cls || ''), title, onclick: e => { e.stopPropagation(); fn(); } }, ic(icon));
  }

  function row(t, o) {
    o = o || {};
    const lead = o.idx != null
      ? h('div', { class: 'idx' }, o.active ? h('span', { class: 'eq' + (isPlaying() ? '' : ' paused') }, h('i'), h('i'), h('i')) : String(o.idx))
      : thumb(t);
    const sub = t.artist || '';
    return h('div', { class: 'row' + (o.active ? ' active' : ''), onclick: o.onclick },
      lead,
      h('div', { class: 'r-meta' }, h('div', { class: 'r-title' }, t.title || 'Unknown track'), h('div', { class: 'r-sub' }, sub || ' ')),
      h('div', { class: 'r-act' }, ...(o.actions || [])));
  }

  const likeBtn = t => actBtn('heart', isLiked(t) ? 'Remove from Liked' : 'Like', () => toggleLike(t), isLiked(t) ? 'liked' : '');
  const plusBtn = t => actBtn('list', 'Add to playlist', () => openSheet(t));

  function emptyBox(title, sub) { return h('div', { class: 'empty' }, h('b', null, title), h('span', null, sub || '')); }

  function viewPlaying() {
    const t = curTrack();
    const art = h('div', { class: 'np-art' }, h('div', { class: 'ph' }, ic('music')));
    const src = thumbOf(t);
    if (src) { const img = h('img', { src, alt: '' }); img.addEventListener('error', () => img.remove()); art.append(img); }
    return h('div', { class: 'np-wrap' }, art);
  }

  function resultRow(t) {
    return row(t, {
      onclick: () => playTracks([t], 1),
      actions: [actBtn('play', 'Play now', () => playTracks([t], 1)), actBtn('queue', 'Add to queue', () => enqueue([t])), likeBtn(t), plusBtn(t)],
    });
  }

  function viewSearch() {
    if (S.searching) return h('div', { class: 'empty' }, h('div', { class: 'spin' }), h('span', null, 'Searching…'));
    if (S.err) return h('div', null, h('h2', { class: 'hd' }, 'Search'), h('div', { class: 'err-box' }, S.err));
    if (!S.results) return emptyBox('Search', 'Type a song name, or paste a link, and press Go.');
    const items = S.results.items;
    return h('div', null,
      h('h2', { class: 'hd' }, S.results.kind === 'link' ? 'Link' : 'Results', h('span', { class: 'sp' }),
        items.length > 1 ? h('button', { class: 'btn', onclick: () => enqueue(items) }, ic('queue'), 'Queue all') : null),
      h('div', { class: 'list' }, items.map(resultRow)));
  }

  function trackList(tracks, extraActions) {
    return h('div', { class: 'list' }, tracks.map((t, i) => row(t, {
      onclick: () => playTracks(tracks, i + 1),
      actions: [actBtn('queue', 'Add to queue', () => enqueue([t])), ...(extraActions ? extraActions(t, i) : [likeBtn(t), plusBtn(t)])],
    })));
  }

  function viewLibrary() {
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: 'pill' + (S.libTab === 'liked' ? ' active' : ''), onclick: () => { S.libTab = 'liked'; S.plOpen = null; render(); } }, `Liked (${S.lib.tracks.length})`),
      h('button', { class: 'pill' + (S.libTab === 'playlists' ? ' active' : ''), onclick: () => { S.libTab = 'playlists'; S.plOpen = null; render(); } }, `Playlists (${S.lib.playlists.length})`));

    if (S.libTab === 'liked') {
      const t = S.lib.tracks;
      return h('div', null, tabs,
        t.length ? h('div', { class: 'btn-row' },
          h('button', { class: 'btn pri', onclick: () => playTracks(t, 1) }, ic('play'), 'Play all'),
          h('button', { class: 'btn', onclick: () => playTracks(t, 1 + Math.floor(Math.random() * t.length)) }, ic('shuffle'), 'Shuffle'),
          h('button', { class: 'btn', onclick: () => enqueue(t) }, ic('queue'), 'Queue all')) : null,
        t.length ? trackList(t) : emptyBox('No liked songs yet', 'Tap the heart on any track to save it here.'));
    }

    const pl = S.plOpen && S.lib.playlists.find(p => p.id === S.plOpen);
    if (pl) return viewPlaylist(tabs, pl);

    const input = h('input', { class: 'field', placeholder: 'New playlist name', maxlength: 40 });
    const create = () => { newPlaylist(input.value); input.value = ''; render(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') create(); });
    return h('div', null, tabs,
      h('div', { class: 'newpl' }, input, h('button', { class: 'btn pri', onclick: create }, ic('plus'), 'Create')),
      S.lib.playlists.length
        ? h('div', { class: 'plgrid' }, S.lib.playlists.map(p => {
            const th = p.tracks.slice(0, 4);
            return h('div', { class: 'plcard', onclick: () => { S.plOpen = p.id; render(); } },
              h('div', { class: 'mosaic' + (th.length < 4 ? ' one' : '') }, th.length ? (th.length < 4 ? [thumb(th[0])] : th.map(thumb)) : h('div', { class: 'thumb', style: 'width:100%;height:100%;border-radius:0' }, h('div', { class: 'ph' }, ic('music')))),
              h('div', { class: 'n' }, p.name), h('div', { class: 'c' }, p.tracks.length + (p.tracks.length === 1 ? ' track' : ' tracks')));
          }))
        : emptyBox('No playlists', 'Create one above, then add tracks with the list button.'));
  }

  function viewPlaylist(tabs, pl) {
    const name = h('input', { class: 'plname', value: pl.name, maxlength: 40 });
    name.addEventListener('change', () => { pl.name = name.value.trim().slice(0, 40) || 'Playlist'; saveLib(); });
    let armed = false;
    const del = h('button', { class: 'btn danger' }, ic('trash'), 'Delete');
    del.addEventListener('click', () => {
      if (!armed) { armed = true; del.lastChild.textContent = 'Click again to confirm'; setTimeout(() => { armed = false; if (del.isConnected) del.lastChild.textContent = 'Delete'; }, 2500); return; }
      S.lib.playlists = S.lib.playlists.filter(p => p !== pl); S.plOpen = null; saveLib(); render();
    });
    const t = pl.tracks;
    return h('div', null, tabs,
      h('div', { class: 'btn-row', style: 'align-items:center' },
        h('button', { class: 'btn', onclick: () => { S.plOpen = null; render(); } }, '← All playlists'), name, h('span', { style: 'flex:1' }), del),
      t.length ? h('div', { class: 'btn-row' },
        h('button', { class: 'btn pri', onclick: () => playTracks(t, 1) }, ic('play'), 'Play'),
        h('button', { class: 'btn', onclick: () => playTracks(t, 1 + Math.floor(Math.random() * t.length)) }, ic('shuffle'), 'Shuffle'),
        h('button', { class: 'btn', onclick: () => enqueue(t) }, ic('queue'), 'Queue all')) : null,
      t.length
        ? trackList(t, (tr, i) => [likeBtn(tr), actBtn('trash', 'Remove from playlist', () => { pl.tracks.splice(i, 1); saveLib(); render(); }, 'danger')])
        : emptyBox('Empty playlist', 'Use the list button on a track to add it here.'));
  }

  function viewQueue() {
    const q = S.queue;
    return h('div', null,
      h('h2', { class: 'hd' }, 'Queue', h('span', { class: 'sp' }), q.length ? h('button', { class: 'btn danger', onclick: () => control('clearq') }, ic('trash'), 'Clear') : null),
      q.length
        ? h('div', { class: 'list' }, q.map((t, i) => row(t, {
            idx: i + 1, active: i + 1 === S.index,
            onclick: () => control('jump', i + 1),
            actions: [likeBtn(t), plusBtn(t), actBtn('close', 'Remove', () => control('removeq', i + 1), 'danger')],
          })))
        : emptyBox('Queue is empty', 'Search for a song or play something from your library.'));
  }

  function render() {
    if (!S.open) return;
    document.querySelectorAll('#rail button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === S.tab));
    $('stage').classList.toggle('np', S.tab === 'playing');
    const view = $('view');
    const top = view.scrollTop;
    const fn = { playing: viewPlaying, search: viewSearch, library: viewLibrary, queue: viewQueue }[S.tab];
    view.replaceChildren(fn());
    view.scrollTop = top;
    updateBar();
  }

  let draggingVol = false, draggingSeek = false;
  const rangeFill = el => el.style.setProperty('--p', el.value + '%');

  function updateBar() {
    const t = curTrack();
    $('barTitle').textContent = t ? (t.title || 'Unknown track') : 'Nothing playing';
    $('barArtist').textContent = t ? (t.artist || ' ') : ' ';
    const art = $('barArt');
    const src = thumbOf(t);
    if (art.dataset.src !== (src || '')) {
      art.dataset.src = src || '';
      $('screen').style.setProperty('--art', src ? `url("${src}")` : 'none');
      art.replaceChildren();
      if (src) { const img = h('img', { src, alt: '' }); img.addEventListener('error', () => img.remove()); art.append(img); }
    }
    setIcon($('bPlay'), isPlaying() ? 'pause' : 'play');
    $('bShuffle').classList.toggle('on', S.shuffle);
    $('bLoop').classList.toggle('on', S.loop !== 'off');
    setIcon($('bLoop'), S.loop === 'one' ? 'repeat1' : 'repeat');
    if (!draggingVol) { $('volCar').value = Math.round(S.vol * 100); rangeFill($('volCar')); }
    const lk = $('bLike'); lk.classList.toggle('liked', !!t && isLiked(t)); lk.disabled = !t; $('bPlaylist').disabled = !t; $('bStop').disabled = !t;
    [lk, $('bPlaylist'), $('bStop')].forEach(b => { b.style.opacity = t ? '' : '.35'; });
    tick();
  }

  function position() {
    const st = S.state;
    if (!st) return 0;
    return st.paused ? st.pausedAt : Math.max(0, Clock.now() - st.startedAt);
  }
  const duration = () => (S.netId != null ? AudioEngine.getDuration(S.netId) : 0);

  function tick() {
    if (!S.open || draggingSeek) return;
    const pos = position(), dur = duration();
    $('tCur').textContent = fmt(pos);
    $('tDur').textContent = dur ? fmt(dur) : '0:00';
    $('seekFill').style.width = dur ? Math.min(100, (pos / dur) * 100) + '%' : '0%';
  }
  setInterval(tick, 500);
  const clock = () => { const d = new Date(); $('clock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  clock(); setInterval(clock, 15000);

  (() => {
    const bar = $('seekbar');
    const frac = e => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    bar.addEventListener('pointerdown', e => {
      if (!S.state || !duration()) return;
      draggingSeek = true; bar.setPointerCapture(e.pointerId);
      const f = frac(e); $('seekFill').style.width = f * 100 + '%'; $('tCur').textContent = fmt(f * duration());
    });
    bar.addEventListener('pointermove', e => {
      if (!draggingSeek) return;
      const f = frac(e); $('seekFill').style.width = f * 100 + '%'; $('tCur').textContent = fmt(f * duration());
    });
    bar.addEventListener('pointerup', e => {
      if (!draggingSeek) return;
      draggingSeek = false;
      control('seek', Math.floor(frac(e) * duration()));
    });
  })();

  $('bPlay').addEventListener('click', () => control('toggle'));
  $('bNext').addEventListener('click', () => control('next'));
  $('bPrev').addEventListener('click', () => control('prev'));
  $('bShuffle').addEventListener('click', () => control('shuffle', !S.shuffle));
  $('bLoop').addEventListener('click', () => control('loop', { off: 'all', all: 'one', one: 'off' }[S.loop] || 'off'));
  $('closeBtn').addEventListener('click', () => post('close'));

  let volTimer = null;
  $('volCar').addEventListener('input', e => {
    draggingVol = true; rangeFill(e.target);
    S.vol = e.target.value / 100;
    clearTimeout(volTimer);
    volTimer = setTimeout(() => control('volume', S.vol), 90);
  });
  $('volCar').addEventListener('change', () => { setTimeout(() => { draggingVol = false; }, 400); });
  $('bLike').addEventListener('click', () => { const t = curTrack(); if (t) toggleLike(t); });
  $('bPlaylist').addEventListener('click', () => { const t = curTrack(); if (t) openSheet(t); });
  $('bStop').addEventListener('click', () => control('stop'));

  $('quickForm').addEventListener('submit', e => { e.preventDefault(); const i = $('quickInput'); runResolve(i.value); });
  $('quickQueue').addEventListener('click', () => runQueue($('quickInput').value));
  $('rail').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    S.tab = b.dataset.tab; if (S.tab === 'library') S.plOpen = null; render();
  });

  function openSheet(t) { S.sheet = t; renderSheet(); }
  function closeSheet() { S.sheet = null; $('sheet').classList.remove('open'); $('sheet').replaceChildren(); }
  function renderSheet() {
    const sh = $('sheet');
    if (!S.sheet) return closeSheet();
    const t = S.sheet;
    const input = h('input', { class: 'field', placeholder: 'New playlist…', maxlength: 40 });
    const make = () => { const p = newPlaylist(input.value); addToPlaylist(p, t); closeSheet(); render(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') make(); });
    sh.replaceChildren(h('div', { class: 'card' },
      h('h3', null, 'Add to playlist'),
      h('div', { class: 'r-sub' }, t.title || ''),
      h('div', { class: 'sl' }, S.lib.playlists.map(p =>
        h('button', { class: 'pick', onclick: () => { addToPlaylist(p, t); closeSheet(); render(); } }, p.name, h('small', null, p.tracks.length + ' tracks')))),
      h('div', { class: 'newpl', style: 'margin:0' }, input, h('button', { class: 'btn pri', onclick: make }, ic('plus'), 'New')),
      h('button', { class: 'btn', onclick: closeSheet }, 'Cancel')));
    sh.classList.add('open');
  }
  $('sheet').addEventListener('mousedown', e => { if (e.target === $('sheet')) closeSheet(); });

  window.addEventListener('keydown', e => {
    if (!S.open) return;
    if (e.key === 'Escape') { if (S.sheet) closeSheet(); else post('close'); }
  });

  AudioEngine.onEnded = (key, seq, failed) => post('ended', { netId: key, seq, failed: !!failed });

  let hideTimer = null;
  function showPanel() {
    clearTimeout(hideTimer);
    const app = $('app'), panel = $('panel');
    panel.classList.remove('out', 'in');
    app.classList.remove('hidden');
    void panel.offsetWidth;
    panel.classList.add('in');
  }
  function hidePanel() {
    const app = $('app'), panel = $('panel');
    if (app.classList.contains('hidden')) return;
    clearTimeout(hideTimer);
    panel.classList.remove('in');
    panel.classList.add('out');
    hideTimer = setTimeout(() => { app.classList.add('hidden'); panel.classList.remove('out'); }, 360);
  }

  window.addEventListener('message', ev => {
    const d = ev.data || {};
    switch (d.action) {
      case 'open': {
        S.open = true; S.netId = d.netId;
        S.queue = arr(d.queue); S.index = d.index || 0; S.loop = d.loop || 'off'; S.shuffle = !!d.shuffle;
        S.vol = d.vol != null ? d.vol : 0.6; S.master = d.master != null ? d.master : 1;
        S.state = d.state || false; if (d.cloudNow) Clock.sync(d.cloudNow);
        const lib = d.library || {};
        S.lib = { tracks: arr(lib.tracks), playlists: arr(lib.playlists).map(p => ({ id: p.id, name: p.name, tracks: arr(p.tracks) })) };
        S.sheet = null; $('sheet').classList.remove('open');
        S.tab = (S.queue.length || S.state) ? 'playing' : 'search';
        showPanel();
        render();
        break;
      }
      case 'close':
        S.open = false; closeSheet(); hidePanel();
        break;
      case 'state':
        S.updates++;
        S.state = d.state || false; if (d.cloudNow) Clock.sync(d.cloudNow);
        render();
        break;
      case 'queue':
        S.updates++;
        S.queue = arr(d.queue); S.index = d.index || 0; S.loop = d.loop || 'off'; S.shuffle = !!d.shuffle;
        if (d.vol != null) S.vol = d.vol;
        render();
        break;
      case 'master':
        S.master = d.value;
        break;
      case 'audio':
        AudioEngine.update(arr(d.tracks), d.cloudNow, d.drift);
        break;
      case 'toast':
        toast(d.msg, d.kind);
        break;
    }
  });
})();
