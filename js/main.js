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
// each photo group (the gallery, the night) gets its own viewer sequence
const groups = [...document.querySelectorAll('#gallery, .night')].map((g) => [...g.querySelectorAll('button.tile')]);
let tiles = groups[0];
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
  document.body.classList.add('viewing');
  document.dispatchEvent(new Event('viewer:open'));
}
function close() {
  lb.hidden = true;
  document.body.style.overflow = '';
  document.body.classList.remove('viewing');
  document.dispatchEvent(new Event('viewer:close'));
  lastFocus && lastFocus.focus();
}
groups.forEach((g) =>
  g.forEach((t, i) =>
    t.addEventListener('click', () => {
      tiles = g;
      open(i);
    }),
  ),
);
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
  groups.flat().forEach((t) => io.observe(t));
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
    ['.tape-banner-text'],
    ['.reel'],
    ['#night .head'],
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
  once('#gallery .tile, .night .tile', 'seen', { rootMargin: '0px 0px -18% 0px' }, (t) => {
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
    dpr = 1; // specks are tiny, full retina resolution isn't needed
    // size to the tallest the screen can get, so the canvas doesn't resize (and blink)
    // every time iPhone Safari's toolbars show or hide while scrolling
    W = innerWidth;
    H = Math.max(innerHeight, document.documentElement.clientHeight, screen.height || 0);
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
  addEventListener('resize', () => {
    if (innerWidth !== W) size(); // only real width changes (rotation, window resize)
  });
  let last = 0,
    on = true;
  document.addEventListener('visibilitychange', () => {
    on = !document.hidden;
    if (on) requestAnimationFrame(step);
  });
  function step(ts) {
    if (!on) return;
    if (document.body.classList.contains('viewing') || ts - last < 33) {
      requestAnimationFrame(step); // hold at ~30 fps, and freeze behind open viewers
      return;
    }
    const dt = Math.min(ts - last, 100) / 16.7;
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

// footage: banner plays muted while on screen; the cards open the video viewer
(function () {
  const banner = document.getElementById('bannerVideo');
  const vb = document.getElementById('vb');
  const vbVideo = document.getElementById('vbVideo');
  const vbTitle = document.getElementById('vbTitle');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastFocus = null;
  let inView = false;

  // the banner video only starts downloading once the visitor scrolls close to it,
  // then fades in once its first frame is ready
  function tryPlay() {
    if (inView && vb.hidden && !still && banner.src) banner.play().catch(() => {});
  }
  // the banner only starts downloading once the visitor scrolls close to it.
  // A still from the video shows first, so the banner is never blank, even when the
  // phone blocks autoplay (iPhone Low Power Mode) or the visitor has reduced motion on.
  function loadBanner() {
    if (banner.src) return;
    const still0 = new Image();
    still0.onload = () => banner.classList.add('ready');
    still0.src = banner.dataset.poster;
    banner.poster = banner.dataset.poster;
    banner.addEventListener('loadeddata', () => banner.classList.add('ready'), { once: true });
    banner.preload = 'auto';
    banner.src = banner.dataset.src;
    tryPlay();
  }
  // if autoplay was blocked, start it on the visitor's first tap or click anywhere
  const unblock = () => {
    if (banner.paused) tryPlay();
  };
  document.addEventListener('touchstart', unblock, { passive: true });
  document.addEventListener('click', unblock);

  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          loadBanner();
          near.disconnect();
        }
      },
      { rootMargin: '0px 0px 50% 0px' },
    );
    near.observe(banner);

    if (!still) {
      new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            inView = e.isIntersecting;
            if (inView) tryPlay();
            else banner.pause();
          }),
        { threshold: 0.25 },
      ).observe(banner);
    }
  } else {
    loadBanner();
  }

  document.addEventListener('viewer:open', () => banner.pause());
  document.addEventListener('viewer:close', tryPlay);

  function openVideo(src, title) {
    lastFocus = document.activeElement;
    banner.pause();
    vbTitle.textContent = title || '';
    vbVideo.src = src;
    vb.hidden = false;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('viewing');
    vbVideo.play().catch(() => {});
    document.getElementById('vbClose').focus();
  }
  function closeVideo() {
    vbVideo.pause();
    vbVideo.removeAttribute('src');
    vbVideo.load();
    vb.hidden = true;
    document.body.style.overflow = '';
    document.body.classList.remove('viewing');
    tryPlay();
    lastFocus && lastFocus.focus();
  }

  document.querySelectorAll('[data-video]').forEach((el) =>
    el.addEventListener('click', () => openVideo(el.dataset.video, el.dataset.title)),
  );
  document.getElementById('vbClose').addEventListener('click', closeVideo);
  vb.addEventListener('click', (e) => {
    if (e.target === vb) closeVideo();
  });
  document.addEventListener('keydown', (e) => {
    if (!vb.hidden && e.key === 'Escape') closeVideo();
  });
})();
