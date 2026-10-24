// Shared behaviour for every page: highlight colour, cursor reticle, hover preview,
// decode-in titles, toasts, and the small widgets on the CV and Contact pages.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T | null;

/* ---------- highlight colour ---------- */
function setAccent(c: string) {
  root.dataset.accent = c;
  document.querySelectorAll<HTMLElement>('.sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === c)));
  try { localStorage.setItem('accent', c); } catch (e) {}
}
document.querySelectorAll<HTMLElement>('.sw').forEach(b => b.addEventListener('click', () => setAccent(b.dataset.c!)));
document.querySelectorAll<HTMLElement>('.sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === root.dataset.accent)));

/* ---------- hover preview: the first image of an update follows the cursor ---------- */
const peek = $('#peek')!, peekImg = $<HTMLImageElement>('#peek-img')!, peekId = $('#peek-id')!;
let px = -999, py = -999, tx = -999, ty = -999, peekOn = false;
document.addEventListener('pointerover', e => {
  const row = (e.target as Element).closest?.('.row') as HTMLElement | null;
  if (!row || !row.dataset.img) { if (peekOn) { peek.classList.remove('on'); peekOn = false; } return; }
  if (peekImg.getAttribute('src') !== row.dataset.img) peekImg.src = row.dataset.img;
  peekId.textContent = row.dataset.cap || '';
  if (!peekOn) { px = tx; py = ty; }
  peek.classList.add('on'); peekOn = true;
});

/* ---------- cursor reticle + readouts ---------- */
const ret = $('#reticle')!, retxy = $('#ret-xy')!, hxy = $('#hxy');
let mx = -1, my = -1;
const pad = (v: number) => String(Math.max(0, Math.round(v))).padStart(4, '0');
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  mx = e.clientX; my = e.clientY; tx = mx + 28; ty = my - 120;
  if (tx + 320 > innerWidth) tx = mx - 328;
  ret.style.transform = `translate3d(${mx}px, ${my}px, 0)`; ret.classList.add('on');
  const s = `x ${pad(mx)} y ${pad(my + scrollY)}`; retxy.textContent = s; if (hxy) hxy.textContent = s;
  (window as any).__cursor = { x: mx, y: my };
});
document.addEventListener('pointerleave', () => { ret.classList.remove('on'); mx = my = -1; (window as any).__cursor = { x: -1, y: -1 }; });
function follow() {
  px += (tx - px) * (reduce ? 1 : .18); py += (ty - py) * (reduce ? 1 : .18);
  peek.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  requestAnimationFrame(follow);
}
requestAnimationFrame(follow);

/* ---------- featured cards: parallax and coordinate readout ---------- */
document.querySelectorAll<HTMLElement>('.work .frame').forEach(f => {
  const hud = f.querySelector('.hud')!;
  f.addEventListener('pointermove', e => {
    const b = f.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width * 2 - 1, y = (e.clientY - b.top) / b.height * 2 - 1;
    f.style.setProperty('--mx', x.toFixed(3)); f.style.setProperty('--my', y.toFixed(3));
    hud.textContent = `x ${((x + 1) / 2).toFixed(2)} y ${((y + 1) / 2).toFixed(2)}`;
  });
  f.addEventListener('pointerleave', () => { f.style.setProperty('--mx', '0'); f.style.setProperty('--my', '0'); });
});

/* ---------- updates filter (several types at once) + pages of 15 ---------- */
const filters = $('#filters');
if (filters) {
  const PER = 15;
  const rows = [...document.querySelectorAll<HTMLElement>('#ulist .row')];
  const chips = [...filters.querySelectorAll<HTMLElement>('.chip[data-tag]')];
  const pager = $('#pager')!, reset = $('#freset')!;
  const on = new Set<string>();
  let page = 1;
  const render = (scroll = false) => {
    const hits = rows.filter(r => !on.size || r.dataset.tags!.split('|').some(t => on.has(t)));
    const pages = Math.max(1, Math.ceil(hits.length / PER));
    page = Math.min(Math.max(1, page), pages);
    const shown = new Set(hits.slice((page - 1) * PER, page * PER));
    rows.forEach(r => (r.hidden = !shown.has(r)));
    $('#ucount')!.textContent = String(hits.length).padStart(2, '0');
    $('#uempty')!.hidden = hits.length > 0;
    chips.forEach(c => c.setAttribute('aria-pressed', String(on.has(c.dataset.tag!))));
    reset.hidden = !on.size;
    pager.hidden = pages < 2;
    pager.innerHTML = pages < 2 ? '' :
      `<button type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>&larr; prev</button>` +
      Array.from({ length: pages }, (_, i) => `<button type="button" data-page="${i + 1}" ${i + 1 === page ? 'aria-current="page"' : ''}>${String(i + 1).padStart(2, '0')}</button>`).join('') +
      `<button type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>next &rarr;</button>`;
    const q = new URLSearchParams();
    if (on.size) q.set('tag', [...on].map(t => t.toLowerCase()).join(','));
    if (page > 1) q.set('page', String(page));
    try { history.replaceState(null, '', location.pathname + (q.size ? '?' + q.toString().replace(/%2C/g, ',') : '')); } catch (e) {}
    if (scroll) filters.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  filters.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('button');
    if (!b) return;
    if (b === reset) on.clear(); else { const t = b.dataset.tag!; on.has(t) ? on.delete(t) : on.add(t); }
    page = 1; render();
  });
  pager.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-page]');
    if (b && !b.disabled) { page = +b.dataset.page!; render(true); }
  });
  const params = new URLSearchParams(location.search);
  (params.get('tag') || '').split(',').forEach(q => { const c = chips.find(c => c.dataset.tag!.toLowerCase() === q.trim()); if (c) on.add(c.dataset.tag!); });
  page = parseInt(params.get('page') || '1', 10) || 1;
  render();
}

/* ---------- CV: jump to a section, mark the one in view, print ---------- */
const cvLinks = document.querySelectorAll<HTMLAnchorElement>('.cv-index a');
cvLinks.forEach(a => a.addEventListener('click', e => {
  const s = document.getElementById('cv-' + a.dataset.cv);
  if (s) { e.preventDefault(); s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
}));
if (cvLinks.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) cvLinks.forEach(a => a.classList.toggle('on', 'cv-' + a.dataset.cv === en.target.id));
  }), { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.cv-block').forEach(s => io.observe(s));
}
$('#print')?.addEventListener('click', () => print());

/* ---------- contact: local time, copy email ---------- */
const ctime = $('#ctime');
if (ctime) {
  const ctick = () => { ctime.textContent = 'local time ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }); };
  ctick(); setInterval(ctick, 30000);
}
const toast = $('#toast')!; let tt: number;
function say(m: string) { toast.textContent = m; toast.classList.add('on'); clearTimeout(tt); tt = window.setTimeout(() => toast.classList.remove('on'), 2200); }
const email = $('#email');
email?.addEventListener('click', () => {
  const t = email.textContent!.trim();
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => say('Email copied'), () => say(t));
  else say(t);
});

/* ---------- signal decode on load ---------- */
function scramble(el: HTMLElement) {
  if (reduce) return;
  const target = el.dataset.final || el.textContent || '';
  el.dataset.final = target;
  const glyphs = '+×/\\|-_=#01';
  let f = 0; const total = 26;
  const node = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : null;
  const set = (s: string) => { if (node) node.nodeValue = s; else el.textContent = s; };
  (function step() {
    f++;
    set([...target].map((ch, i) => (i < (f / total) * target.length ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join(''));
    if (f < total) requestAnimationFrame(step); else set(target);
  })();
}
document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el), i * 180));

export {};
