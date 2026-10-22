/* Launch island: dismiss button and a one-time confetti burst.
   The island itself is rendered inline in index.html from #launch-config (the one place to edit per launch). */
(function () {
  var island = document.getElementById('launch-island');
  var cfgEl = document.getElementById('launch-config');
  if (!island || !cfgEl || island.hidden) return;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var close = island.querySelector('.launch-close');
  if (close) close.addEventListener('click', function () {
    set('slab-launch-dismissed', cfg.id);
    island.hidden = true;
  });

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || get('slab-launch-confetti') === cfg.id) return;

  function burst() {
    if (island.hidden || !island.getBoundingClientRect().width) return;
    set('slab-launch-confetti', cfg.id);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    var c = document.createElement('canvas');
    c.className = 'confetti-canvas';
    c.setAttribute('aria-hidden', 'true');
    c.width = W * dpr; c.height = H * dpr;
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    if (!ctx) { c.remove(); return; }
    ctx.scale(dpr, dpr);

    var r = island.getBoundingClientRect();
    var ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    var small = W < 600;
    var n = small ? 24 : 40, speed = small ? 300 : 380;
    var colors = cfg.colors && cfg.colors.length ? cfg.colors : ['#15171A'];
    var spread = 85 * Math.PI / 180, parts = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      var s = speed * (0.55 + Math.random() * 0.45);
      parts.push({
        x: ox + (Math.random() - 0.5) * r.width * 0.6, y: oy,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: 4 + Math.random() * 3,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 4,
        color: colors[i % colors.length]
      });
    }

    var DUR = 1600, FADE = 0.35, G = 900, DRAG = 1.6;
    var start = null, last = null;
    function frame(t) {
      if (start === null) { start = last = t; }
      var el = t - start, dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      ctx.clearRect(0, 0, W, H);
      if (el >= DUR) { c.remove(); return; }
      var p = el / DUR;
      ctx.globalAlpha = p > 1 - FADE ? (1 - p) / FADE : 1;
      var k = Math.exp(-DRAG * dt);
      for (var j = 0; j < parts.length; j++) {
        var q = parts[j];
        q.vx *= k; q.vy = q.vy * k + G * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
        ctx.save();
        ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.fillStyle = q.color;
        ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function schedule() { setTimeout(burst, 600); }
  function whenVisible() {
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', function on() {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', on);
          schedule();
        }
      });
    } else schedule();
  }
  if (document.readyState === 'complete') whenVisible();
  else window.addEventListener('load', whenVisible);
})();
