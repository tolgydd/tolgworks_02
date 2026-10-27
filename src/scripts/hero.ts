// Home hero: a formless dust cloud. Particles drift on a slowly changing flow field;
// the resting cursor stirs an eddy, a click bursts the dust outward and it bounces off the hero's edges.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const cur = () => ((window as any).__cursor || { x: -1, y: -1 }) as { x: number; y: number };

const clock = document.getElementById('clock')!;
const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul', hour12: false }); };
tick(); setInterval(tick, 1000);

type P = { x: number; y: number; vx: number; vy: number; ix: number; iy: number; s: number; a: number; heat: number };
/* ---------- hero field: dust cloud ---------- */
// Particles drift on a slowly changing flow field, so the cloud has no fixed form.
// The resting cursor stirs a soft eddy; a click bursts the dust outward and it settles back into the drift.
const cv = document.getElementById('field') as HTMLCanvasElement, ctx = cv.getContext('2d')!;
const hero = document.querySelector('.hero') as HTMLElement;
const pcount = document.getElementById('pcount')!;
let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2), P: P[] = [], pulses: { x: number; y: number; r: number }[] = [];
function size() {
  const b = hero.getBoundingClientRect();
  if (!b.width || !b.height) return;
  const first = !P.length;
  W = b.width; H = b.height;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = Math.round(Math.max(2500, Math.min(8000, W * H / 150)));
  if (first || Math.abs(n - P.length) > 400) {
    P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, ix: 0, iy: 0, s: Math.random() < .08 ? 1.8 : Math.random() * 1.1 + .4, a: Math.random() * .6 + .25, heat: 0 }));
  }
  pcount.textContent = P.length.toLocaleString('en');
}
let running = false;
const wake = () => { if (!running) { running = true; requestAnimationFrame(draw); } };
size();
new ResizeObserver(() => { size(); wake(); }).observe(hero);
hero.addEventListener('pointermove', wake);
hero.addEventListener('pointerdown', e => {
  if ((e.target as Element).closest('a, button')) return;
  const b = hero.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
  pulses.push({ x, y, r: 0 });
  for (const p of P) {
    const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < 760) { const f = Math.pow(1 - d / 760, 1.2) * 22 * (.6 + Math.random() * .8); p.ix += dx / d * f; p.iy += dy / d * f; }
  }
  wake();
});

// flow: the curl of a slowly changing stream function. It swirls but has no sinks,
// so the dust never collapses into lines; it just keeps mixing like smoke.
function flow(x: number, y: number, t: number) {
  const p1 = .0035 * x + t * .09, q1 = .0042 * y - t * .07;
  const p2 = .0021 * (x + y) + t * .05;
  const p3 = .0051 * x - .0029 * y + t * .11;
  const dX = .0035 * Math.cos(p1) * Math.cos(q1) + .0021 * Math.cos(p2) - .8 * .0051 * Math.sin(p3);
  const dY = -.0042 * Math.sin(p1) * Math.sin(q1) + .0021 * Math.cos(p2) + .8 * .0029 * Math.sin(p3);
  return [dY * 42, -dX * 42];
}
// density: slow patches where the dust is thicker
const dens = (x: number, y: number, t: number) => .55 + .45 * Math.sin(x * .0042 + Math.cos(y * .0031 + t * .06) * 1.8 + t * .04);

// with reduced motion the dust keeps drifting, but at a fraction of the speed
const SPEED = reduce ? .3 : 1;
function draw(ts: number) {
  const t = ts / 1000 * SPEED;
  ctx.clearRect(0, 0, W, H);
  const b = hero.getBoundingClientRect();
  const { x: mx, y: my } = cur();
  const lx = mx - b.left, ly = my - b.top, inside = mx >= 0 && ly > 0 && ly < H && lx > 0 && lx < W;
  const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#B9D006';
  const R = 230;
  for (const p of P) {
    const fl = flow(p.x, p.y, t);
    // drift velocity eases toward the flow; it is kept apart from the burst so a burst never snaps back
    let fx = (fl[0] + (Math.random() - .5) * .25) * SPEED, fy = (fl[1] + (Math.random() - .5) * .25) * SPEED;
    p.vx += (fx - p.vx) * .04;
    p.vy += (fy - p.vy) * .04;
    if (inside) {
      const dx = p.x - lx, dy = p.y - ly, d = Math.hypot(dx, dy) || 1;
      if (d < R) {
        const near = 1 - d / R;
        // swirl around the cursor, with a slight push away from its centre
        p.vx += (-dy / d) * near * .09 + (dx / d) * near * near * .05;
        p.vy += (dx / d) * near * .09 + (dy / d) * near * near * .05;
      }
    }
    // burst velocity glides out with gentle air drag
    p.x += p.vx + p.ix; p.y += p.vy + p.iy;
    p.ix *= .985; p.iy *= .985;
    // the hero's edges are hard walls: bounce, losing a little energy
    if (p.x < 0) { p.x = -p.x; p.ix = -p.ix * .8; p.vx = Math.abs(p.vx); }
    else if (p.x > W) { p.x = 2 * W - p.x; p.ix = -p.ix * .8; p.vx = -Math.abs(p.vx); }
    if (p.y < 0) { p.y = -p.y; p.iy = -p.iy * .8; p.vy = Math.abs(p.vy); }
    else if (p.y > H) { p.y = 2 * H - p.y; p.iy = -p.iy * .8; p.vy = -Math.abs(p.vy); }
    p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
    // drifting dust that has settled against a wall quietly re-enters somewhere else, so edges never line up
    if (Math.abs(p.ix) + Math.abs(p.iy) < .3 && (p.x < 24 || p.x > W - 24 || p.y < 24 || p.y > H - 24) && Math.random() < .02) {
      p.x = 40 + Math.random() * (W - 80); p.y = 40 + Math.random() * (H - 80); p.vx = p.vy = 0;
    }
    const glow = Math.min(1, Math.hypot(p.ix, p.iy) / 4);
    const hot = glow > .3;
    const dn = dens(p.x, p.y, t); ctx.globalAlpha = Math.min(1, Math.max(.3, p.a * dn * dn * 1.5) + glow * .6);
    ctx.fillStyle = hot ? accent : '#e9e9e6';
    const s = p.s + glow * 1.1;
    ctx.fillRect(p.x, p.y, s, s);
  }
  ctx.strokeStyle = accent;
  for (const q of pulses) {
    q.r += 12;
    const fade = Math.max(0, 1 - q.r / 1300);
    ctx.lineWidth = 1.5; ctx.globalAlpha = fade * .95;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
    if (q.r > 36) { ctx.lineWidth = 1; ctx.globalAlpha = fade * .45; ctx.beginPath(); ctx.arc(q.x, q.y, q.r - 30, 0, Math.PI * 2); ctx.stroke(); }
  }
  pulses = pulses.filter(q => q.r < 1300);
  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}
wake();

export {};
