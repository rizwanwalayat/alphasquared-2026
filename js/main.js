/* ==========================================================================
   Alpha Squared — 2026 site
   Motion layer. Same stack the reference runs on: Lenis smooth scroll driving
   GSAP ScrollTrigger, SplitType for per-word/line heading reveals, plus
   hand-built canvas visuals in place of the reference's hosted WebGL.
   ========================================================================== */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';

  document.documentElement.classList.add('js-on');

  /* ── shared easing ─────────────────────────────────────────────── */
  var EASE = 'power3.out';
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.CustomEase) {
      CustomEase.create('as', '0.16, 1, 0.3, 1');
      EASE = 'as';
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     1. Smooth scroll — Lenis feeds ScrollTrigger off the same RAF loop
        so scrubbed animations never lag a frame behind the scroll.
     ══════════════════════════════════════════════════════════════════ */
  var lenis = null;

  function initScroll() {
    if (REDUCED || typeof window.Lenis === 'undefined' || !hasGSAP) return;

    lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.6 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ══════════════════════════════════════════════════════════════════
     2. Loader — counts to 100, then hands off to the hero timeline.
     ══════════════════════════════════════════════════════════════════ */
  function runLoader(done) {
    var el = document.getElementById('loader');
    var pct = document.getElementById('loaderPct');
    if (!el) { done(); return; }

    if (REDUCED || !hasGSAP) {
      el.remove();
      document.body.classList.remove('is-loading');
      done();
      return;
    }

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (el.parentNode) el.remove();
      document.body.classList.remove('is-loading');
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      done();
    }

    var n = { v: 0 };
    gsap.timeline({ onComplete: finish })
      .to(n, {
        v: 100, duration: 1.15, ease: 'power2.inOut',
        onUpdate: function () { pct.textContent = Math.round(n.v) + '%'; }
      })
      .to(el, { opacity: 0, duration: .55, ease: 'power2.inOut' }, '+=0.1');

    // Wall-clock safety net. GSAP's ticker runs on rAF, which browsers
    // throttle hard in background tabs — so a page opened in a background
    // tab can sit on the splash indefinitely and still be on it when the
    // user finally switches over. setTimeout keeps running regardless.
    setTimeout(finish, 2600);
  }

  /* ══════════════════════════════════════════════════════════════════
     3. Heading reveals — SplitType by word or line, masked so glyphs
        rise out of an invisible box rather than just fading.
     ══════════════════════════════════════════════════════════════════ */
  function splitHeadings() {
    var nodes = document.querySelectorAll('[data-split]');
    if (!hasGSAP || typeof window.SplitType === 'undefined' || REDUCED) {
      nodes.forEach(function (n) { n.style.visibility = 'visible'; });
      return;
    }

    nodes.forEach(function (node) {
      var mode = node.getAttribute('data-split');
      var split = new SplitType(node, {
        types: mode === 'lines' ? 'lines' : 'words',
        lineClass: 'sp-line',
        wordClass: 'sp-word'
      });
      var parts = mode === 'lines' ? split.lines : split.words;

      // Wrap each part so overflow can clip it into a mask. The extra
      // bottom padding (cancelled by an equal negative margin) keeps
      // descenders and the gradient's ink inside the clip box — without it
      // the clip cuts through the glyphs themselves.
      parts.forEach(function (p) {
        var w = document.createElement('span');
        w.style.cssText =
          'overflow:hidden;vertical-align:top;' +
          'padding-bottom:.22em;margin-bottom:-.22em;' +
          'display:' + (mode === 'lines' ? 'block' : 'inline-block');
        p.parentNode.insertBefore(w, p);
        w.appendChild(p);
        p.style.display = 'inline-block';
        p.style.willChange = 'transform';
      });

      node.style.visibility = 'visible';
      gsap.set(parts, { yPercent: 112 });

      // Hero headings are driven by the loader hand-off instead, so they
      // never get a ScrollTrigger — two tweens on the same targets fight
      // and leave the words stranded mid-rise.
      if (node.closest('.hero')) return;

      gsap.to(parts, {
        yPercent: 0,
        duration: 1.05,
        ease: EASE,
        stagger: mode === 'lines' ? 0.09 : 0.045,
        scrollTrigger: { trigger: node, start: 'top 88%', once: true }
      });
    });
  }

  /* ── hero heading fires on load, not on scroll ──────────────────── */
  function heroIn() {
    if (!hasGSAP || REDUCED) return;
    var parts = document.querySelectorAll('.hero [data-split] .sp-word, .hero [data-split] .sp-line');
    if (!parts.length) return;

    gsap.to(parts, { yPercent: 0, duration: 1.15, ease: EASE, stagger: 0.05 });
  }

  /* ══════════════════════════════════════════════════════════════════
     4. Generic scroll reveals — [data-anim] with an optional [data-delay]
     ══════════════════════════════════════════════════════════════════ */
  var FROM = {
    fade:  { y: 22 },
    up:    { y: 44 },
    left:  { x: -38 },
    right: { x: 38 }
  };

  function reveals() {
    var nodes = document.querySelectorAll('[data-anim]');

    if (!hasGSAP || REDUCED) {
      nodes.forEach(function (n) { n.style.opacity = 1; });
      return;
    }

    nodes.forEach(function (n) {
      var from = FROM[n.getAttribute('data-anim')] || FROM.fade;
      var delay = parseFloat(n.getAttribute('data-delay')) || 0;
      var inHero = n.closest('.hero');

      var vars = Object.assign({ opacity: 0 }, from);
      var to = {
        opacity: 1, x: 0, y: 0,
        duration: 1,
        delay: delay,
        ease: EASE
      };

      if (!inHero) {
        to.scrollTrigger = { trigger: n, start: 'top 90%', once: true };
      }

      gsap.fromTo(n, vars, to);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     5. Count-up stats
     ══════════════════════════════════════════════════════════════════ */
  function counters() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';

      if (!hasGSAP || REDUCED) { el.textContent = target + suffix; return; }

      var o = { v: 0 };
      gsap.to(o, {
        v: target,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: function () { el.textContent = Math.round(o.v) + suffix; }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     5b. Process rail — the gradient bar over each step draws itself in
     ══════════════════════════════════════════════════════════════════ */
  function rails() {
    var steps = document.querySelectorAll('[data-lit]');
    if (!steps.length) return;

    if (!hasGSAP || REDUCED) {
      steps.forEach(function (s) { s.classList.add('is-lit'); });
      return;
    }

    steps.forEach(function (s, i) {
      ScrollTrigger.create({
        trigger: s,
        start: 'top 82%',
        once: true,
        onEnter: function () {
          setTimeout(function () { s.classList.add('is-lit'); }, i * 130);
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     6. Parallax on the hero glow layers
     ══════════════════════════════════════════════════════════════════ */
  function parallax() {
    if (!hasGSAP || REDUCED) return;

    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      gsap.to(el, {
        yPercent: amt * 100,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });

    // slow breathing on the arc so the hero is never fully static
    gsap.to('.hero__arc', {
      scale: 1.045, opacity: .82,
      duration: 7, ease: 'sine.inOut', repeat: -1, yoyo: true
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     7. Nav — hide on scroll down, show on scroll up
     ══════════════════════════════════════════════════════════════════ */
  function nav() {
    var el = document.getElementById('nav');
    var burger = document.getElementById('burger');
    if (!el) return;

    if (burger) {
      burger.addEventListener('click', function () {
        var open = el.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
      });
      el.querySelectorAll('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () {
          el.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    var last = 0;
    function onScroll() {
      var y = window.scrollY;
      el.classList.toggle('is-stuck', y > 40);
      if (!el.classList.contains('is-open')) {
        el.classList.toggle('is-hidden', y > last && y > 400);
      }
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // in-page anchors need to go through Lenis, not the native jump
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -90 });
        else t.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     8. Card cursor glow
     ══════════════════════════════════════════════════════════════════ */
  function cardGlow() {
    if (REDUCED) return;
    document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     9. Accordion + typical/alpha toggle
     ══════════════════════════════════════════════════════════════════ */
  var ACC_COPY = {
    typical: [
      'A rotating cast of developers who learn your domain on your budget.',
      'Generic CRUD screens that ignore how dispatchers actually work.',
      'AI scoped in a slide deck and quietly dropped before delivery.',
      'An offshore team asleep when production breaks at 2am.'
    ],
    alpha: [
      'The same senior engineers from kickoff to handover, 16+ years deep.',
      'Interfaces shaped by process mapping done alongside your operators.',
      'AI shipped into production, measured against a job it has to do.',
      'A Canadian principal in your timezone, accountable by name.'
    ]
  };

  function accordion() {
    var acc = document.getElementById('acc');
    if (!acc) return;

    var items = Array.prototype.slice.call(acc.querySelectorAll('.acc__item'));

    // Animate to a measured pixel height rather than 'auto', and kill any
    // in-flight tween on the same element first. overwrite:'auto' resolves
    // on the next tick, which is too late when every item is set in one go.
    function setOpen(item, open) {
      var body = item.querySelector('.acc__a');
      item.classList.toggle('is-open', open);

      if (!hasGSAP || REDUCED) { body.style.height = open ? 'auto' : '0'; return; }

      gsap.killTweensOf(body);
      gsap.to(body, {
        height: open ? body.scrollHeight : 0,
        duration: .5,
        ease: 'power2.inOut'
      });
    }

    // One open item at a time; clicking the open one closes it.
    function openOnly(idx) {
      items.forEach(function (item, i) { setOpen(item, i === idx); });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    items.forEach(function (item, i) {
      setOpen(item, i === 0);
      item.querySelector('.acc__q').addEventListener('click', function () {
        openOnly(item.classList.contains('is-open') ? -1 : i);
      });
    });

    // toggle swaps the answer copy between the two modes
    var toggle = document.getElementById('toggle');
    if (!toggle) return;

    toggle.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        toggle.querySelectorAll('button').forEach(function (o) { o.classList.remove('is-on'); });
        b.classList.add('is-on');

        var copy = ACC_COPY[b.getAttribute('data-mode')];
        items.forEach(function (item, i) {
          var p = item.querySelector('.acc__a p');
          if (!copy[i]) return;

          p.textContent = copy[i];
          if (hasGSAP && !REDUCED) {
            gsap.fromTo(p, { opacity: 0 }, { opacity: 1, duration: .35, overwrite: 'auto' });
          }
          // new copy is a different length, so the open panel needs re-measuring
          if (item.classList.contains('is-open')) setOpen(item, true);
        });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     10. Canvas helper — DPR-aware sizing that survives resize
     ══════════════════════════════════════════════════════════════════ */
  function setupCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);
    return { ctx: ctx, get w() { return w; }, get h() { return h; } };
  }

  function onScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > -200 && r.top < window.innerHeight + 200;
  }

  /* ══════════════════════════════════════════════════════════════════
     11. Hero visual — dot-matrix world map with delivery cities pulsing.
         Replaces the earlier isometric grid, which read as a generic
         data-centre abstraction and said nothing about the work. The map
         *is* the credibility claim the stats below it quantify.

         Land comes from Natural Earth 110m, rasterised at build time to a
         210x84 bit mask (see README). ~2.9KB of base64, no runtime data
         dependency.
     ══════════════════════════════════════════════════════════════════ */

  var LAND_COLS = 210, LAND_ROWS = 84;
  var LAND_LAT0 = 83, LAND_LAT1 = -56;
  var LAND_B64 =
    'AAAAAAAAA//xm/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAeH8////+AAAKAA4AAAHAAAAAAAAAAAAAAANPfj////8AAD4AAAAAA' +
    'BsAAAAAAAAAAAABgAA8D////8AABgAAAAAAAMAAAAAAAAAAAAAdjXcAB///8AAAAAAAcAAf/4AB8AAAAAAAAPgAcAAA///4A' +
    'AAAAADgAB//wAAAAAAAAAAAO/zz9gAf//gAAAAAACAY/////A/AAAAB8AAA/4Z/+Af//QAAAB4AAA7////////AAAH////nI' +
    'sc+AH//AAAAf/gAGZ//////////4H///////8nwP/wAAAB//5f/7//////////ef///////gOQP8AfgAD8+P////////////' +
    '/AB//////8UHgH4AOAAH7/f////////////+AH//////4LhADwAAAA/n/////////////39AH9v////wA8AAwAAAA/j/////' +
    '///////8vgAD4A////wB+QAAAAAA/h///////////wYwAAAUAH///4A/4AAAAAwDh///////////ADwAADAAD////g/8AAAA' +
    'AwOH//////////+ADgAAAAAF////5//AAAACYO///////////+gDAAAAAAA////5//gAAAG8/////////////oCAAAAAAAf/' +
    '////8AAAAAz/////////////oAAAAAAAAP////+hwAAAAP/////////////gAAAAAAAAL/////gQAAAAf/////////////AA' +
    'AAAAAAAH/////8AAAAAP//6fj///////+AAAAAAAAAH////+gAAAAAP0/wPn///////8IAAAAAAAAP////8AAAAAD+OPgHj/' +
    '//////gYAAAAAAAAH////4AAAAAD4Juv/x///////gQAAAAAAAAH////gAAAAAH4Amf/z//////CAQAAAAAAAAD////gAAAA' +
    'ADwDGf/z//////RAgAAAAAAAAD////gAAAAAAH4AA////////hjgAAAAAAAAB////AAAAAAB/4AA////////gaAAAAAAAAAA' +
    'f//8AAAAAAD/+EB////////wQAAAAAAAAAAX//4AAAAAAH//n/////////wAAAAAAAAAAAL/yEAAAAAAH/////n//////wAA' +
    'AAAAAAAAAJ/AEAAAAAAf///8/z//////gAAAAAAAAAAAB/AEAAAAAA////+/w//////gAAAAAAAAAAAC/ABAAAAAA/////f5' +
    'A/////QAAAAAAAAAAAAfAOAAAAAB/////P/wP///8QAAAAAAAAAAAAPDBgAAAAB/////v/gP/H+QAAAAAAAAIAAAAPjAGAAA' +
    'AB/////n/gH+D+wAAAAAAAAAAAAAD/AAAAAAA/////z+AD4D+AQAAAAAAAAAAAAAuAAAAAAB/////z4ADwC/AQAAAAAAAAAA' +
    'AAAHwAAAAAB/////7wADwA/gQAAAAAAAAAAAAAAwAAAAAB/////+AABwAvgAAAAAAAAAAAAAAAQeAAAAA/////8YABwAHAIA' +
    'AAAAAAAAAAAAAKf8AAAAf/////4AAgAiACAAAAAAAAAAAAAAF/+AAAAf/////wAAIAQAOAAAAAAAAAAAAAAA//AAAAH8////' +
    'wAAAAIBAAAAAAAAAAAAAAAA//4AAACAv///gAAABIDAAAAAAAAAAAAAAAA//4AAAAAH///AAAAAoPAAAAAAAAAAAAAAAB//8' +
    'AAAAAP//+AAAAAYfRAAAAAAAAAAAAAAD//+AAAAAP//8AAAAAYfAIAAAAAAAAAAAAAD///gAAAAH//4AAAAAMewBAAAAAAAA' +
    'AAAAAD///+AAAAH//wAAAAAGAAP4AAAAAAAAAAAAD////AAAAD//wAAAAACAIA8gAAAAAAAAAAAD////gAAAD//wAAAAAB4A' +
    'A+AAAAAAAAAAAAB////gAAAB//wAAAAAABSAbAAAAAAAAAAAAB////AAAAB//4AAAAAAAAAAgQAAAAAAAAAAA///+AAAAB//' +
    '4AAAAAAAAOAAAAAAAAAAAAAA///8AAAAD//4QAAAAAAAcIAAAAAAAAAAAAAf//8AAAAD//4wAAAAAAD8MACAAAAAAAAAAAH/' +
    '/8AAAAD//hwAAAAAAP/cAAAAAAAAAAAAAD//8AAAAD//BwAAAAAAP/8AAAAAAAAAAAAAD//4AAAAB/+BgAAAAAA///AAAAAA' +
    'AAAAAAAD//4AAAAB//DgAAAAAH///AAAAAAAAAAAAAD//gAAAAB//DgAAAAAH///gAAAAAAAAAAAAD/+AAAAAA/8BAAAAAAH' +
    '///wAAAAAAAAAAAAD/+AAAAAA/8AAAAAAAH///wAAAAAAAAAAAAH/8AAAAAAf8AAAAAAAD///4AAAAAAAAAAAAH/8AAAAAAf' +
    '4AAAAAAAD///wAAAAAAAAAAAAH/4AAAAAAPwAAAAAAAB/H/wAAAAAAAAAAAAH/wAAAAAAPAAAAAAAAD4D/gAAAAAAAAAAAAH' +
    '/AAAAAAAAAAAAAAAAAAA/gAIAAAAAAAAAAP/AAAAAAAAAAAAAAAAAAAfAAEAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAKAAGAA' +
    'AAAAAAAAP4AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAPgAAAAAAAAAAAAAAAAAAADAAYAAAAAAAAAAPgAAAAAAAAAAAAAAAA' +
    'AAAAAAwAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'OAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAA';

  /* ─────────────────────────────────────────────────────────────────
     The 17 countries we've delivered into (client-supplied, 2026-07-28).
     North America is broken out to city level instead of one dot per
     country — it's the flagship market, so it gets more visual weight on
     the map than the rest. Every other region stays country-level.

     dx/dy are label offsets in px from the marker; `a` is the text anchor.
     Europe, the Gulf and now North America are hand-fanned outward into
     empty ocean because the markers sit within ~80px of each other at
     this scale — anything placed inline there collides. A leader line is
     drawn automatically whenever a label is pushed far enough from its
     marker to need one.
     ───────────────────────────────────────────────────────────────── */
  var PLACES = [
    /* North America — city-level, fanned out from a tight real cluster */
    { n: 'Edmonton',     lat: 53.5,  lng: -113.5, hq: true, dx: 0,   dy: -26, a: 'center' },
    { n: 'Calgary',      lat: 51.0,  lng: -114.1,           dx: -40, dy: -6,  a: 'right' },
    { n: 'Vancouver',    lat: 49.3,  lng: -123.1,           dx: -66, dy: 10,  a: 'right' },
    { n: 'Toronto',      lat: 43.7,  lng: -79.4,            dx: 50,  dy: -16, a: 'left' },
    { n: 'New York',     lat: 40.7,  lng: -74.0,            dx: 80,  dy: 6,   a: 'left' },
    { n: 'Chicago',      lat: 41.9,  lng: -87.6,            dx: 32,  dy: 28,  a: 'left' },
    { n: 'Dallas',       lat: 32.8,  lng: -96.8,            dx: -10, dy: 50,  a: 'center' },
    { n: 'Miami',        lat: 25.8,  lng: -80.2,            dx: 48,  dy: 48,  a: 'left' },

    /* Europe — fanned into the Atlantic and the Arctic */
    { n: 'Sweden',       lat: 62.0,  lng: 15.0,             dx: 30,  dy: -22, a: 'left' },
    { n: 'UK',           lat: 54.0,  lng: -2.5,             dx: -46, dy: -30, a: 'right' },
    { n: 'France',       lat: 46.6,  lng: 2.4,              dx: -62, dy: -4,  a: 'right' },
    { n: 'Spain',        lat: 40.3,  lng: -3.7,             dx: -56, dy: 24,  a: 'right' },
    { n: 'Switzerland',  lat: 46.8,  lng: 8.2,              dx: 52,  dy: -30, a: 'left' },
    { n: 'Italy',        lat: 42.8,  lng: 12.6,             dx: 50,  dy: 2,   a: 'left' },

    /* Gulf — fanned down and out */
    { n: 'Saudi Arabia', lat: 24.0,  lng: 45.0,             dx: -34, dy: 30,  a: 'right' },
    { n: 'UAE',          lat: 24.0,  lng: 54.0,             dx: 30,  dy: -16, a: 'left' },
    { n: 'Oman',         lat: 21.0,  lng: 57.0,             dx: 32,  dy: 22,  a: 'left' },

    { n: 'Pakistan',     lat: 30.2,  lng: 69.5,             dx: 0,   dy: -20, a: 'center' },
    { n: 'China',        lat: 35.0,  lng: 104.0,            dx: 20,  dy: -18, a: 'left' },
    { n: 'Malaysia',     lat: 4.2,   lng: 102.0,            dx: 14,  dy: 22,  a: 'left' },
    { n: 'Nigeria',      lat: 9.1,   lng: 8.7,              dx: -16, dy: 24,  a: 'right' },
    { n: 'South Africa', lat: -29.0, lng: 24.7,             dx: 0,   dy: 24,  a: 'center' },
    { n: 'Australia',    lat: -25.3, lng: 133.8,            dx: 0,   dy: 26,  a: 'center' }
  ];

  function decodeLand() {
    var bin = atob(LAND_B64);
    var bits = new Uint8Array(LAND_COLS * LAND_ROWS);
    for (var i = 0; i < bits.length; i++) {
      bits[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
    }
    return bits;
  }

  function heroViz() {
    var canvas = document.getElementById('heroViz');
    if (!canvas) return;

    var c = setupCanvas(canvas);
    var land = decodeLand();

    // equirectangular: lat/lng → normalised 0..1 across the mask's extent
    function project(lat, lng) {
      return {
        u: (lng + 180) / 360,
        v: (LAND_LAT0 - lat) / (LAND_LAT0 - LAND_LAT1)
      };
    }

    var geom = null;
    function layout() {
      // Uniform scale — one step for both axes, so the geography keeps its
      // true proportions. The band's height is sized off viewport width in
      // CSS (36vw against a 2.5:1 mask), which lets the map run nearly edge
      // to edge without the horizontal-only stretch it used to need.
      var step = Math.min(c.w / LAND_COLS, c.h / LAND_ROWS);
      var mw = step * LAND_COLS, mh = step * LAND_ROWS;
      geom = {
        stepX: step, stepY: step,
        x0: (c.w - mw) / 2,
        y0: (c.h - mh) / 2,
        mw: mw, mh: mh,
        r: Math.max(1, step * 0.3)
      };
    }
    layout();
    window.addEventListener('resize', function () { setTimeout(layout, 60); });

    PLACES.forEach(function (ct, i) {
      ct.phase = (i * 0.37) % 1;
      ct.speed = 0.22 + (i % 5) * 0.035;
    });

    var t0 = 0, clock = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) return;
      if (ts - t0 < 32) return;                 // ~30fps is plenty for this
      var dt = Math.min(0.1, (ts - t0) / 1000);
      t0 = ts;
      if (!REDUCED) clock += dt;

      var ctx = c.ctx;
      ctx.clearRect(0, 0, c.w, c.h);
      if (!geom) return;

      var g = geom;

      /* ── land dots ── */
      for (var row = 0; row < LAND_ROWS; row++) {
        for (var col = 0; col < LAND_COLS; col++) {
          if (!land[row * LAND_COLS + col]) continue;

          var x = g.x0 + (col + 0.5) * g.stepX;
          var y = g.y0 + (row + 0.5) * g.stepY;

          // colour drifts blue → purple → orange west-to-east, brand gradient
          var t = col / LAND_COLS;
          var cr, cg, cb;
          if (t < 0.5) {
            var k = t / 0.5;
            cr = 43 + k * 159; cg = 167 - k * 98; cb = 255;
          } else {
            var k2 = (t - 0.5) / 0.5;
            cr = 202 + k2 * 52; cg = 69 + k2 * 67; cb = 255 - k2 * 228;
          }

          // Gentle vertical fade so the map settles into the background.
          // Floored at 0.55 so the continents stay legible at the edges —
          // below that the map reads as noise rather than geography.
          // Base alpha is deliberately low: the land is a backdrop for the
          // markers and labels, and at full strength it pulled focus off
          // the headline sitting above it.
          var fade = Math.max(0.55, 1 - Math.abs((row / LAND_ROWS) - 0.42) * 0.5);
          ctx.fillStyle = 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' +
                          (0.32 * fade).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(x, y, g.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* ── markers ── */
      var marks = [];

      PLACES.forEach(function (ct) {
        var p = project(ct.lat, ct.lng);
        var x = g.x0 + p.u * g.mw;
        var y = g.y0 + p.v * g.mh;

        var beat = (clock * ct.speed + ct.phase) % 1;      // 0..1 ring cycle
        var base = ct.hq ? 3.4 : 2.4;

        // expanding ring
        if (!REDUCED) {
          var rr = base + beat * (ct.hq ? 30 : 21);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.34 * (1 - beat)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var glow = ctx.createRadialGradient(x, y, 0, x, y, ct.hq ? 26 : 17);
        glow.addColorStop(0, ct.hq ? 'rgba(255,190,110,.95)' : 'rgba(190,150,255,.8)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, ct.hq ? 26 : 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, base, 0, Math.PI * 2);
        ctx.fill();

        marks.push({ ct: ct, x: x, y: y });
      });

      /* ── country labels, drawn last so nothing paints over them ──
         Below 820px the map is too narrow to place 17 labels without
         collisions, so they're dropped and the strip under the map
         carries the names instead. The threshold has to match the
         breakpoint that reveals .geo, or the 760–820 band shows both. */
      if (c.w >= 820) {
        ctx.font = '500 11px Poppins, -apple-system, sans-serif';
        ctx.textBaseline = 'middle';

        marks.forEach(function (m) {
          var ct = m.ct;
          var tx = m.x + (ct.dx || 0);
          var ty = m.y + (ct.dy || 0);
          var far = Math.abs(ct.dx || 0) > 26 || Math.abs(ct.dy || 0) > 22;

          // leader line back to the marker, for labels fanned out of a cluster
          if (far) {
            ctx.strokeStyle = 'rgba(255,255,255,.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx - (ct.a === 'right' ? -3 : ct.a === 'left' ? 3 : 0), ty);
            ctx.stroke();
          }

          ctx.textAlign = ct.a || 'center';
          var w = ctx.measureText(ct.n).width;
          var padX = 5.5, boxH = 16;
          var bx = ct.a === 'left' ? tx - padX
                 : ct.a === 'right' ? tx - w - padX
                 : tx - w / 2 - padX;

          // plate behind the text — over a dotted map bare text loses its edges
          ctx.fillStyle = 'rgba(11,8,18,.72)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx, ty - boxH / 2, w + padX * 2, boxH, 4);
          else ctx.rect(bx, ty - boxH / 2, w + padX * 2, boxH);
          ctx.fill();

          ctx.fillStyle = ct.hq ? 'rgba(255,206,150,.96)' : 'rgba(255,255,255,.88)';
          ctx.fillText(ct.n, tx, ty);
        });
      }
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     12. Proof visual — a live dispatch board abstraction
     ══════════════════════════════════════════════════════════════════ */
  function proofViz() {
    var canvas = document.getElementById('proofViz');
    if (!canvas) return;

    var c = setupCanvas(canvas);
    var LANES = 7;
    var jobs = [];

    function build() {
      jobs = [];
      for (var i = 0; i < 22; i++) {
        jobs.push({
          lane: i % LANES,
          x: Math.random(),
          w: 0.1 + Math.random() * 0.24,
          v: 0.0009 + Math.random() * 0.0014,
          c: Math.random()
        });
      }
    }
    build();

    var t0 = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) return;
      if (ts - t0 < 24) return;
      t0 = ts;

      var ctx = c.ctx, lh = c.h / LANES;
      ctx.clearRect(0, 0, c.w, c.h);

      // lane rails
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      for (var i = 0; i <= LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * lh);
        ctx.lineTo(c.w, i * lh);
        ctx.stroke();
      }

      jobs.forEach(function (j) {
        j.x += j.v;
        if (j.x > 1.1) { j.x = -j.w - Math.random() * 0.3; j.c = Math.random(); }

        var x = j.x * c.w, w = j.w * c.w;
        var y = j.lane * lh + lh * 0.26, h = lh * 0.48;
        var col = j.c < .34 ? '28,78,255' : (j.c < .68 ? '172,36,255' : '254,136,27');

        var g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, 'rgba(' + col + ',.06)');
        g.addColorStop(.72, 'rgba(' + col + ',.62)');
        g.addColorStop(1, 'rgba(' + col + ',.9)');
        ctx.fillStyle = g;

        var r = h / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, Math.max(w, r * 2), h, r);
        else ctx.rect(x, y, Math.max(w, r * 2), h);
        ctx.fill();
      });
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     13. Wireframe globe — the reference's centrepiece in the compare block
     ══════════════════════════════════════════════════════════════════ */
  function globeViz() {
    var canvas = document.getElementById('globeViz');
    if (!canvas) return;

    var c = setupCanvas(canvas);
    var pts = [];
    var N = 620;

    // fibonacci sphere for even point distribution
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;
      var rad = Math.sqrt(Math.max(0, 1 - y * y));
      var th = Math.PI * (3 - Math.sqrt(5)) * i;
      pts.push({ x: Math.cos(th) * rad, y: y, z: Math.sin(th) * rad, hi: Math.random() < .06 });
    }

    var rot = 0, t0 = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) return;
      if (ts - t0 < 24) return;
      t0 = ts;

      var ctx = c.ctx;
      var cx = c.w / 2, cy = c.h / 2;
      var R = Math.min(c.w, c.h) * 0.38;
      ctx.clearRect(0, 0, c.w, c.h);

      rot += REDUCED ? 0 : 0.0032;
      var tilt = -0.42;

      // rim ring in the brand gradient
      var rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      rim.addColorStop(0, '#2ba7ff');
      rim.addColorStop(.5, '#ca45ff');
      rim.addColorStop(1, '#fe881b');
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.stroke();

      pts.forEach(function (p) {
        var x = p.x * Math.cos(rot) - p.z * Math.sin(rot);
        var z = p.x * Math.sin(rot) + p.z * Math.cos(rot);
        var y = p.y * Math.cos(tilt) - z * Math.sin(tilt);
        var z2 = p.y * Math.sin(tilt) + z * Math.cos(tilt);

        var depth = (z2 + 1) / 2;                 // 0 back → 1 front
        var sx = cx + x * R, sy = cy + y * R;
        var a = 0.06 + depth * 0.5;

        if (p.hi) {
          ctx.fillStyle = 'rgba(172,36,255,' + (a * 1.4).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(sx, sy, 2.2 + depth * 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(110,90,190,' + a.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(sx, sy, 0.9 + depth * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     14. Radar sweep — the why-us panel visual
     ══════════════════════════════════════════════════════════════════ */
  function radarViz() {
    var canvas = document.getElementById('radarViz');
    if (!canvas) return;

    var c = setupCanvas(canvas);
    var blips = [];
    for (var i = 0; i < 34; i++) {
      blips.push({ a: Math.random() * Math.PI * 2, r: 0.18 + Math.random() * 0.74, s: Math.random() });
    }

    var sweep = 0, t0 = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) return;
      if (ts - t0 < 24) return;
      t0 = ts;

      var ctx = c.ctx;
      var cx = c.w / 2, cy = c.h / 2;
      var R = Math.min(c.w, c.h) * 0.42;
      ctx.clearRect(0, 0, c.w, c.h);

      sweep += REDUCED ? 0 : 0.012;

      // Sweep wedge goes down first: its destination-out fade must only
      // erase the wedge, so nothing else can be on the canvas yet. A conic gradient fades it along the arc; a radial mask
      // on top fades it toward the rim so the wedge has no hard outer edge.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);

      var g = ctx.createConicGradient ? ctx.createConicGradient(0, 0, 0) : null;
      if (g) {
        g.addColorStop(0, 'rgba(172,36,255,.42)');
        g.addColorStop(.16, 'rgba(120,60,255,.06)');
        g.addColorStop(.2, 'rgba(172,36,255,0)');
        g.addColorStop(1, 'rgba(172,36,255,0)');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = 'rgba(172,36,255,.18)';
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, 0, Math.PI / 3);
      ctx.closePath();
      ctx.fill();

      ctx.globalCompositeOperation = 'destination-out';
      var fade = ctx.createRadialGradient(0, 0, R * 0.45, 0, 0, R);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fade;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // concentric rings, drawn over the wedge
      ctx.lineWidth = 1;
      for (var k = 1; k <= 4; k++) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.11 - k * 0.014).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(cx, cy, R * (k / 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      // blips brighten as the sweep passes
      blips.forEach(function (b) {
        var d = ((sweep % (Math.PI * 2)) - b.a + Math.PI * 2) % (Math.PI * 2);
        var hot = Math.max(0, 1 - d / 1.1);
        var x = cx + Math.cos(b.a) * b.r * R;
        var y = cy + Math.sin(b.a) * b.r * R;
        ctx.fillStyle = 'rgba(210,180,255,' + (0.12 + hot * 0.8).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + hot * 2.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // centre dot
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     15. Thread wave — stacked sine paths that draw in on scroll.
         This is the reference's flowing-lines block.
     ══════════════════════════════════════════════════════════════════ */
  function threadWave() {
    var host = document.getElementById('waveHost');
    if (!host) return;

    var W = 1200, H = 260, LINES = 46;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
    svg += '<defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">' +
           '<stop offset="0%" stop-color="#1c4eff"/>' +
           '<stop offset="46%" stop-color="#ac24ff"/>' +
           '<stop offset="100%" stop-color="#fe881b"/>' +
           '</linearGradient></defs>';

    for (var i = 0; i < LINES; i++) {
      var k = i / (LINES - 1);
      var amp = 26 + k * 30;
      var base = 40 + k * 150;
      var d = 'M0 ' + base;
      for (var x = 0; x <= W; x += 24) {
        var y = base
              + Math.sin((x / W) * Math.PI * 2.4 + k * 1.5) * amp
              + Math.sin((x / W) * Math.PI * 5.1 + k * 2.6) * amp * 0.3;
        d += ' L' + x + ' ' + y.toFixed(1);
      }
      svg += '<path d="' + d + '" fill="none" stroke="url(#wg)" stroke-width="1" ' +
             'opacity="' + (0.26 + k * 0.5).toFixed(2) + '"/>';
    }
    svg += '</svg>';
    host.innerHTML = svg;

    if (!hasGSAP || REDUCED) return;

    var paths = host.querySelectorAll('path');
    paths.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });

    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 1.5,
      ease: 'power2.out',
      stagger: 0.014,
      scrollTrigger: { trigger: host, start: 'top 85%', once: true }
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     Boot
     ══════════════════════════════════════════════════════════════════ */
  // Each step is isolated: a decorative visual that throws must never take
  // down the rest of the page. Learned the hard way — one bad character in
  // the map's base64 threw during init, so the loader never ran and the
  // whole site sat on a 0% splash screen.
  function safely(name, fn) {
    try {
      fn();
    } catch (e) {
      if (window.console) console.error('[a2] ' + name + ' failed:', e);
    }
  }

  function init() {
    safely('initScroll', initScroll);
    safely('nav', nav);
    safely('splitHeadings', splitHeadings);
    safely('reveals', reveals);
    safely('counters', counters);
    safely('rails', rails);
    safely('parallax', parallax);
    safely('cardGlow', cardGlow);
    safely('accordion', accordion);
    safely('threadWave', threadWave);

    safely('heroViz', heroViz);
    safely('proofViz', proofViz);
    safely('globeViz', globeViz);
    safely('radarViz', radarViz);

    // The loader is last but must run no matter what came before it,
    // or the page stays hidden behind the splash.
    try {
      runLoader(heroIn);
    } catch (e) {
      var el = document.getElementById('loader');
      if (el) el.remove();
      document.body.classList.remove('is-loading');
      if (window.console) console.error('[a2] loader failed:', e);
    }

    if (hasGSAP) {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
