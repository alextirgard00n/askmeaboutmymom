// grain texture, generated once
(function () {
  const c = document.createElement('canvas');
  c.width = c.height = 180;
  const x = c.getContext('2d');
  const d = x.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  document.getElementById('grain').style.backgroundImage = 'url(' + c.toDataURL() + ')';
})();

// lightbox
const tiles = [...document.querySelectorAll('#gallery button.tile')];
const lb = document.getElementById('lb'),
  img = document.getElementById('lbImg'),
  cap = document.getElementById('lbCap'),
  cnt = document.getElementById('lbCount');
let cur = 0,
  lastFocus = null;
const full = (i) => {
  const im = tiles[i].querySelector('img');
  return im.dataset.full || im.src;
};
const cache = {};
function preload(i) {
  const u = full(i);
  if (!cache[u]) {
    const x = new Image();
    x.src = u;
    cache[u] = x;
  }
  return cache[u];
}
function show(i) {
  cur = (i + tiles.length) % tiles.length;
  const t = tiles[cur],
    im = t.querySelector('img'),
    want = cur,
    big = preload(cur);
  // show the grid version of this same photo right away, then swap to full size once it's loaded
  img.src = big.complete && big.naturalWidth ? big.src : im.currentSrc || im.src;
  img.alt = im.alt;
  cap.textContent = t.querySelector('figcaption span').textContent;
  cnt.textContent = cur + 1 + ' / ' + tiles.length;
  if (!(big.complete && big.naturalWidth)) {
    const swap = () => {
      if (cur === want && !lb.hidden) img.src = big.src;
    };
    (big.decode ? big.decode() : Promise.resolve()).then(swap, swap);
  }
  preload((cur + 1) % tiles.length);
  preload((cur - 1 + tiles.length) % tiles.length);
}
function open(i) {
  lastFocus = document.activeElement;
  show(i);
  lb.hidden = false;
  document.getElementById('lbClose').focus();
  document.body.style.overflow = 'hidden';
}
function close() {
  lb.hidden = true;
  document.body.style.overflow = '';
  lastFocus && lastFocus.focus();
}
tiles.forEach((t, i) => t.addEventListener('click', () => open(i)));
document.getElementById('lbClose').onclick = close;
document.getElementById('lbPrev').onclick = () => show(cur - 1);
document.getElementById('lbNext').onclick = () => show(cur + 1);
lb.addEventListener('click', (e) => {
  if (e.target === lb || e.target.id === 'lbStage') close();
});
document.addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') show(cur - 1);
  if (e.key === 'ArrowRight') show(cur + 1);
});
let sx = null;
lb.addEventListener(
  'touchstart',
  (e) => {
    sx = e.touches[0].clientX;
  },
  { passive: true },
);
lb.addEventListener('touchend', (e) => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  sx = null;
});

// on phones, color bleeds in as a photo scrolls to the middle of the screen
if (matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle('on', e.isIntersecting)),
    { rootMargin: '-40% 0px -40% 0px' },
  );
  tiles.forEach((t) => io.observe(t));
}
// mailing list (placeholder until a sign-up service is connected)
document.getElementById('newsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = document.getElementById('newsEmail').value.trim(),
    n = document.getElementById('newsNote');
  n.textContent = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
    ? 'the mailing list opens soon'
    : 'enter an email address like name@example.com';
});

// ---------- scroll effects ----------
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window))
    return;
  document.documentElement.classList.add('fx');

  // 1. fade and rise, with lines in a group coming in one after another
  const groups = [
    ['.statement .mono', '.statement p'],
    ['#photos .head'],
    ['#footage .head'],
    ['.reel'],
    ['#night .head'],
    ['.night .ph'],
    ['.night-note'],
    ['#soundtrack .head', '.sound iframe'],
    ['.foot-cols > div'],
    ['.foot-base'],
  ];
  groups.forEach((g) =>
    document.querySelectorAll(g.join(',')).forEach((el, i) => {
      el.classList.add('rv');
      el.style.setProperty('--d', i * 0.12 + 's');
    }),
  );
  const once = (sel, cls, opts, each) => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(cls);
            each && each(e.target);
            io.unobserve(e.target);
          }
        }),
      opts,
    );
    document.querySelectorAll(sel).forEach((el) => io.observe(el));
  };
  once('.rv', 'in', { rootMargin: '0px 0px -12% 0px' });

  // 2. photos develop once their image has loaded and they're well on screen
  once('#gallery .tile', 'seen', { rootMargin: '0px 0px -18% 0px' }, (t) => {
    const im = t.querySelector('img'),
      go = () => setTimeout(() => t.classList.add('dev'), 120);
    im.complete && im.naturalWidth ? go() : im.addEventListener('load', go, { once: true });
  });

  // 3. stacked type rows switch on top to bottom
  once('.stack', 'seen', { threshold: 0.35 }, (st) => {
    st.querySelectorAll('.stack-word span').forEach((sp, i) =>
      setTimeout(() => sp.classList.add('on'), i * 140),
    );
  });

  // 5. dust drifting in the projector light
  const c = document.createElement('canvas');
  c.id = 'dust';
  c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  const x = c.getContext('2d');
  let W, H, dpr, motes;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function make() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(Math.random() * 0.18 + 0.03),
      a: Math.random() * 0.35 + 0.08,
      t: Math.random() * 6.28,
    };
  }
  size();
  motes = Array.from({ length: Math.round(Math.min(W, 1400) / 28) }, make);
  addEventListener('resize', size);
  let last = 0,
    on = true;
  document.addEventListener('visibilitychange', () => {
    on = !document.hidden;
    if (on) requestAnimationFrame(step);
  });
  function step(ts) {
    if (!on) return;
    const dt = Math.min(ts - last, 50) / 16.7;
    last = ts;
    x.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.t += 0.01 * dt;
      m.x += (m.vx + Math.sin(m.t) * 0.08) * dt;
      m.y += m.vy * dt;
      if (m.y < -4) {
        m.y = H + 4;
        m.x = Math.random() * W;
      }
      if (m.x < -4) m.x = W + 4;
      if (m.x > W + 4) m.x = -4;
      x.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(m.t * 3));
      x.fillStyle = '#e8e5de';
      x.beginPath();
      x.arc(m.x, m.y, m.r, 0, 6.283);
      x.fill();
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame((t) => {
    last = t;
    step(t);
  });
})();
