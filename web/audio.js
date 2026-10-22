const Clock = {
  offset: 0,
  now() { return Date.now() / 1000 + this.offset; },
  sync(cloudNow) { if (typeof cloudNow === 'number') this.offset = cloudNow - Date.now() / 1000; },
};

const AudioEngine = (() => {
  const root = document.getElementById('audio-root');
  const players = new Map();
  let ytState = 'idle';
  const ytWaiting = [];
  let onEnded = () => {};

  const target = p => (p.paused ? p.pausedAt : Math.max(0, Clock.now() - p.startedAt));

  function loadScript(src, id, done) {
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id; s.src = src; s.async = true; s.onload = done;
    s.onerror = () => console.warn('[BCarplay] failed to load', src);
    document.head.appendChild(s);
  }

  function withYT(fn) {
    if (ytState === 'ready') return fn();
    ytWaiting.push(fn);
    if (ytState === 'idle') {
      ytState = 'loading';
      window.onYouTubeIframeAPIReady = () => { ytState = 'ready'; ytWaiting.splice(0).forEach(f => f()); };
      loadScript('https://www.youtube.com/iframe_api', 'yt-api');
    }
  }

  function finish(p, failed) {
    if (p.endedSent || p.dead) return;
    p.endedSent = true;
    onEnded(p.key, p.seq, failed);
  }

  function createYT(p) {
    withYT(() => {
      if (p.dead) return;
      const mount = document.createElement('div');
      const inner = document.createElement('div');
      mount.appendChild(inner);
      root.appendChild(mount);
      p.el = mount;
      p.api = new YT.Player(inner, {
        width: '200', height: '200', videoId: p.vid,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, start: Math.floor(target(p)) },
        events: {
          onReady: e => {
            p.ready = true;
            try { e.target.setPlaybackQuality('tiny'); } catch (_) {}
            p.duration = e.target.getDuration() || 0;
            syncYT(p, true);
          },
          onStateChange: e => {
            if (e.data === 1) { p.duration = e.target.getDuration() || p.duration; try { e.target.setPlaybackQuality('tiny'); } catch (_) {} }
            if (e.data === 0) finish(p, false);
          },
          onError: () => finish(p, true),
        },
      });
    });
  }

  function syncYT(p, first) {
    const a = p.api;
    if (!p.ready || !a || !a.getPlayerState) return;
    const vol = Math.round(p.vol * 100);
    if (p.lastVol !== vol) { a.setVolume(vol); p.lastVol = vol; }
    const t = target(p), st = a.getPlayerState();
    if (st === 0) return;
    if (p.paused) {
      if (st === 1 || st === 3) a.pauseVideo();
      if (Math.abs(a.getCurrentTime() - t) > 1) a.seekTo(t, true);
    } else if (st !== 1 && st !== 3) {
      if (first || Math.abs(a.getCurrentTime() - t) > 1) a.seekTo(t, true);
      a.playVideo();
    } else if (Math.abs(a.getCurrentTime() - t) > p.drift) {
      a.seekTo(t, true);
    }
  }

  function destroy(p) {
    p.dead = true;
    try { if (p.api && p.api.destroy) p.api.destroy(); } catch (_) {}
    if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    players.delete(p.key);
  }

  function syncOne(p, first) { syncYT(p, first); }

  function update(list, cloudNow, drift) {
    Clock.sync(cloudNow);
    const keys = new Set(list.map(l => l.key));
    for (const p of [...players.values()]) if (!keys.has(p.key)) destroy(p);

    for (const l of list) {
      let p = players.get(l.key);
      if (p && (p.seq !== l.seq || p.vid !== l.vid)) { destroy(p); p = null; }
      if (!p) {
        p = { key: l.key, source: l.source, vid: l.vid, seq: l.seq, ready: false, playing: false, dead: false, duration: 0 };
        players.set(l.key, p);
        Object.assign(p, { startedAt: l.startedAt, paused: l.paused, pausedAt: l.pausedAt, vol: l.vol, drift: drift || 3 });
        createYT(p);
      } else {
        Object.assign(p, { startedAt: l.startedAt, paused: l.paused, pausedAt: l.pausedAt, vol: l.vol, drift: drift || 3 });
        syncOne(p, false);
      }
    }
  }

  setInterval(() => { for (const p of players.values()) if (p.ready) syncOne(p, false); }, 2000);

  return {
    update,
    getDuration: key => (players.has(key) ? players.get(key).duration : 0),
    set onEnded(fn) { onEnded = fn; },
  };
})();
