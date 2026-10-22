/* Launch island: dismiss button and continuous fireworks behind the hero.
   The island itself is rendered inline in index.html from #launch-config (the one place to edit per launch).
   Fireworks run on every visit while the island is on screen and the tab is visible; they stop for good on dismiss.
   With prefers-reduced-motion there is no animation at all. */
(function () {
  var island = document.getElementById('launch-island');
  var cfgEl = document.getElementById('launch-config');
  if (!island || !cfgEl || island.hidden) return;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }

  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var stopped = false, fw = null;
  var close = island.querySelector('.launch-close');
  if (close) close.addEventListener('click', function () {
    set('slab-launch-dismissed', cfg.id);
    island.hidden = true;
    stopped = true;
    if (fw) fw.destroy();
  });

  var mq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  if (mq && mq.matches) return;
  var hero = island.closest('.hero');
  if (!hero || !window.requestAnimationFrame) return;

  var c = document.createElement('canvas');
  c.className = 'fireworks-canvas';
  c.setAttribute('aria-hidden', 'true');
  hero.insertBefore(c, hero.firstChild);
  var ctx = c.getContext('2d');
  if (!ctx) { c.remove(); return; }

  var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)');
  function palette() {
    var base = (cfg.colors && cfg.colors.length ? cfg.colors : []).concat(cfg.accent ? [cfg.accent] : []);
    var ink = dark && dark.matches ? '#ECEEF1' : '#15171A';
    var out = [ink, '#4FB0E3', '#BFE2F4'];
    for (var i = 0; i < base.length; i++) {
      var col = base[i];
      if (/^#15171A$/i.test(col)) continue; /* site dark is already in, swapped for light ink in dark mode */
      if (out.indexOf(col) < 0) out.push(col);
    }
    return out;
  }
  var colors = palette();

  var W = 0, H = 0, dpr = 1, small = false, cap = 120;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    small = W < 600; cap = small ? 60 : 120;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  var rockets = [], sparks = [], G = 160, nextLaunch = 0;
  function launch() {
    var budget = cap - sparks.length;
    if (budget < 20) return;
    rockets.push({
      x: W * (0.12 + Math.random() * 0.76), y: H + 4,
      vy: -(H * (0.9 + Math.random() * 0.5)),
      ty: H * (0.12 + Math.random() * 0.38),
      color: colors[(Math.random() * colors.length) | 0]
    });
  }
  function explode(r) {
    var n = Math.min(small ? 28 : 40, cap - sparks.length);
    var sp = (small ? 125 : 175) * (0.8 + Math.random() * 0.4);
    var alt = colors[(Math.random() * colors.length) | 0];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      var s = sp * (0.6 + Math.random() * 0.4);
      sparks.push({ x: r.x, y: r.y, px: r.x, py: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: 1.4 + Math.random() * 0.8, color: i % 3 ? r.color : alt });
    }
  }

  var running = false, inView = true, last = 0;
  function frame(t) {
    if (!running) return;
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t;
    ctx.clearRect(0, 0, W, H);
    if (t >= nextLaunch) { launch(); nextLaunch = t + (small ? 650 : 420) + Math.random() * 500; }

    ctx.globalAlpha = 0.9;
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.y += r.vy * dt; r.vy += G * 0.6 * dt;
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x - 1, r.y, 2, 7);
      if (r.y <= r.ty || r.vy >= 0) { explode(r); rockets.splice(i, 1); }
    }
    var k = Math.exp(-1.6 * dt);
    ctx.lineWidth = small ? 2.5 : 3; ctx.lineCap = 'round';
    for (var j = sparks.length - 1; j >= 0; j--) {
      var p = sparks[j];
      p.life += dt;
      if (p.life >= p.max) { sparks.splice(j, 1); continue; }
      p.px = p.x; p.py = p.y;
      p.vx *= k; p.vy = p.vy * k + G * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = 0.85 * (1 - p.life / p.max);
      ctx.strokeStyle = p.color;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  function update() {
    var go = !stopped && inView && document.visibilityState !== 'hidden' && !island.hidden;
    if (go && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    else if (!go && running) { running = false; }
  }

  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; update(); });
    io.observe(island);
  }
  document.addEventListener('visibilitychange', update);
  var rt;
  function onResize() { clearTimeout(rt); rt = setTimeout(resize, 150); }
  window.addEventListener('resize', onResize);
  function onMotion() { if (mq.matches && fw) fw.destroy(); }
  if (mq.addEventListener) mq.addEventListener('change', onMotion);

  fw = {
    destroy: function () {
      stopped = true; running = false;
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('resize', onResize);
      c.remove();
    }
  };
  update();
})();
