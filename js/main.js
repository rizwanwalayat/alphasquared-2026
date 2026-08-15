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

  /* The canvas visuals were drawn white-on-dark. On paper they need ink of
     the same weight, so every literal white is read through these. */
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function inkRGB() { return isLight() ? '15,44,82' : '255,255,255'; }
  function ink(a) { return 'rgba(' + inkRGB() + ',' + a + ')'; }
  /* Accent: high-vis amber on the dark theme, gold on the light one. */
  function accentRGB() { return isLight() ? '192,138,30' : '245,165,36'; }
  function accent(a) { return 'rgba(' + accentRGB() + ',' + a + ')'; }

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
     7a. Theme — dark by default, light remembered per browser. The pill
         is injected here so the markup is not duplicated on 50+ pages.
     ══════════════════════════════════════════════════════════════════ */
  var THEME_KEY = 'a2-theme';

  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');

    // The footer lockup is a white PNG, invisible once the footer turns pale.
    document.querySelectorAll('.footer .brand__logo').forEach(function (img) {
      var base = img.getAttribute('src').replace(/logo-full(-white)?\.png/, 'logo-full{v}.png');
      img.setAttribute('src', base.replace('{v}', mode === 'light' ? '' : '-white'));
    });

    var tog = document.querySelector('.themetog');
    if (tog) {
      tog.setAttribute('aria-pressed', String(mode === 'light'));
      tog.setAttribute('aria-label', mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
  }

  function theme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }

    var mode = stored ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

    var inner = document.querySelector('.nav__inner');
    if (inner) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'themetog';
      btn.innerHTML =
        '<svg class="themetog__sun" viewBox="0 0 24 24" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="4.2"/>' +
          '<path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7"/>' +
        '</svg>' +
        '<svg class="themetog__moon" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"/>' +
        '</svg>';

      var cta = inner.querySelector('.nav__cta');
      if (cta) inner.insertBefore(btn, cta);
      else inner.appendChild(btn);

      btn.addEventListener('click', function () {
        mode = mode === 'light' ? 'dark' : 'light';
        try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* private mode */ }
        applyTheme(mode);
      });
    }

    applyTheme(mode);
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
    document.querySelectorAll('.card, .svc, .cs').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     8b. Scroll progress rail + stat-band fills

     Both are functions of scroll position rather than fire-once tweens,
     so scrubbing back up re-runs them. One rAF-throttled listener drives
     the pair; the count-up above stays on its own ScrollTrigger.
     ══════════════════════════════════════════════════════════════════ */
  function scrollMeters() {
    var fill = document.getElementById('railFill');
    var cells = Array.prototype.slice.call(document.querySelectorAll('.statband__grid > div'));
    if (!fill && !cells.length) return;

    var ticking = false;

    function paint() {
      ticking = false;

      if (fill) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var y = window.scrollY || window.pageYOffset;
        fill.style.width = (max > 0 ? Math.min(1, y / max) * 100 : 0) + '%';
      }

      cells.forEach(function (cell) {
        var r = cell.getBoundingClientRect();
        var p = (window.innerHeight - r.top) / (window.innerHeight * 0.55);
        p = Math.max(0, Math.min(1, p));
        cell.style.setProperty('--p', (1 - Math.pow(1 - p, 3)).toFixed(3));
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();
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
          ctx.strokeStyle = ink((0.34 * (1 - beat)).toFixed(3));
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

        ctx.fillStyle = isLight() ? '#0f2c52' : '#fff';
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
            ctx.strokeStyle = ink('.22');
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
          ctx.fillStyle = isLight() ? 'rgba(238,244,252,.9)' : 'rgba(11,8,18,.72)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx, ty - boxH / 2, w + padX * 2, boxH, 4);
          else ctx.rect(bx, ty - boxH / 2, w + padX * 2, boxH);
          ctx.fill();

          ctx.fillStyle = ct.hq
            ? (isLight() ? 'rgba(168,118,15,.98)' : 'rgba(255,206,150,.96)')
            : ink('.88');
          ctx.fillText(ct.n, tx, ty);
        });
      }
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     12. Proof visual — loads crossing a dispatch timeline. Three states
         only, in the theme accent, so it reads as a board rather than
         as decoration.
     ══════════════════════════════════════════════════════════════════ */
  function proofViz() {
    var canvas = document.getElementById('proofViz');
    if (!canvas) return;

    var c = setupCanvas(canvas);
    var LANES = 6;
    var jobs = [];

    // 0 delivered, 1 moving, 2 queued. Weighted so most of the board is
    // settled work and the amber reads as "happening now".
    var STATE = [0, 1, 0, 2, 1, 0, 0, 1, 2, 0];

    function build() {
      jobs = [];
      for (var i = 0; i < 18; i++) {
        jobs.push({
          lane: i % LANES,
          x: Math.random() * 1.2 - 0.2,
          w: 0.14 + Math.random() * 0.26,
          v: 0.0007 + Math.random() * 0.0009,
          s: STATE[i % STATE.length]
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

      ctx.strokeStyle = ink('.05');
      ctx.lineWidth = 1;
      for (var i = 0; i <= LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(i * lh) + .5);
        ctx.lineTo(c.w, Math.round(i * lh) + .5);
        ctx.stroke();
      }
      for (var k = 1; k < 6; k++) {
        var gx = Math.round(c.w * k / 6) + .5;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, c.h);
        ctx.stroke();
      }

      jobs.forEach(function (j) {
        j.x += j.v;
        if (j.x > 1.15) { j.x = -j.w - Math.random() * 0.35; j.s = STATE[Math.floor(Math.random() * STATE.length)]; }

        var x = j.x * c.w, w = Math.max(j.w * c.w, lh * 0.5);
        var y = j.lane * lh + lh * 0.3, h = lh * 0.4, r = h / 2;

        if (j.s === 1) {
          var g = ctx.createLinearGradient(x, 0, x + w, 0);
          g.addColorStop(0, accent('.18'));
          g.addColorStop(1, accent('.95'));
          ctx.fillStyle = g;
        } else if (j.s === 0) {
          ctx.fillStyle = ink(isLight() ? '.34' : '.2');
        } else {
          ctx.fillStyle = ink(isLight() ? '.14' : '.07');
        }

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
        ctx.fill();

        // Leading dot on the live loads: the eye needs one thing to track.
        if (j.s === 1) {
          ctx.fillStyle = isLight() ? '#e3a92f' : '#ffc45c';
          ctx.beginPath();
          ctx.arc(x + w, y + h / 2, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     12b. Throughput sparkline — one bar shifts off the left every beat
     ══════════════════════════════════════════════════════════════════ */
  function sparkline() {
    var host = document.getElementById('spark');
    if (!host) return;

    var BARS = 32;
    var vals = [];

    for (var i = 0; i < BARS; i++) {
      vals.push(28 + Math.round(Math.abs(Math.sin(i / 3.1)) * 58) + Math.round(Math.random() * 14));
      host.appendChild(document.createElement('i'));
    }

    function paint() {
      for (var k = 0; k < BARS; k++) host.children[k].style.height = vals[k] + '%';
    }
    paint();

    if (REDUCED) return;
    setInterval(function () {
      if (!onScreen(host)) return;
      vals.shift();
      vals.push(30 + Math.round(Math.random() * 66));
      paint();
    }, 1400);
  }

  /* ══════════════════════════════════════════════════════════════════
     12c. Live dispatch board — the hero's product shot

     Rows walk a load through assigned → pickup → en route → delivered,
     then recycle onto a fresh lane. Illustrative, not real data: the
     panel is aria-hidden and the claim it stands for is in the copy.
     ══════════════════════════════════════════════════════════════════ */
  var LANES = [
    ['Edmonton, AB', 'Calgary, AB'],
    ['Chicago, IL', 'Dallas, TX'],
    ['Toronto, ON', 'Detroit, MI'],
    ['Vancouver, BC', 'Seattle, WA'],
    ['Miami, FL', 'Atlanta, GA'],
    ['Laredo, TX', 'Phoenix, AZ'],
    ['New York, NY', 'Columbus, OH'],
    ['Winnipeg, MB', 'Fargo, ND']
  ];

  var FLOW = [
    { k: 'assigned',  t: 'Assigned' },
    { k: 'pickup',    t: 'At pickup' },
    { k: 'rolling',   t: 'En route' },
    { k: 'delivered', t: 'Delivered' }
  ];

  function dispatchBoard() {
    var host = document.getElementById('boardRows');
    if (!host) return;

    var fActive = document.getElementById('fActive');
    var fDrivers = document.getElementById('fDrivers');
    var fSync = document.getElementById('fSync');
    var jobs = [];
    var seq = 4821;

    function makeJob(stage) {
      var lane = LANES[Math.floor(Math.random() * LANES.length)];
      return { id: 'ADS-' + (seq++), from: lane[0], to: lane[1], stage: stage };
    }

    for (var i = 0; i < 5; i++) jobs.push(makeJob(Math.floor(Math.random() * 3)));

    function render(hit) {
      host.innerHTML = jobs.map(function (j, idx) {
        var s = FLOW[j.stage];
        return '<div class="row' + (idx === hit ? ' is-hit' : '') + '">' +
          '<span class="row__id">' + j.id + '</span>' +
          '<span class="row__route">' + j.from + ' <em>&rarr;</em> ' + j.to + '</span>' +
          '<span class="pill" data-s="' + s.k + '"><b></b>' + s.t + '</span>' +
          '</div>';
      }).join('');
    }
    render(-1);

    if (REDUCED) return;
    setInterval(function () {
      if (!onScreen(host)) return;

      var idx = Math.floor(Math.random() * jobs.length);
      if (jobs[idx].stage < FLOW.length - 1) jobs[idx].stage++;
      else jobs[idx] = makeJob(0);
      render(idx);

      fActive.textContent = 120 + Math.floor(Math.random() * 18);
      fDrivers.textContent = 300 + Math.floor(Math.random() * 24);
      fSync.textContent = (0.3 + Math.random() * 0.4).toFixed(1) + 's';
    }, 2100);
  }

  /* ══════════════════════════════════════════════════════════════════
     12d. Board map — nodes with packets running the links between them
     ══════════════════════════════════════════════════════════════════ */
  function netViz() {
    var canvas = document.getElementById('netViz');
    if (!canvas) return;

    var c = setupCanvas(canvas);
    var NODES = [
      { x: .13, y: .60 }, { x: .27, y: .30 }, { x: .40, y: .70 },
      { x: .54, y: .38 }, { x: .68, y: .68 }, { x: .82, y: .34 },
      { x: .92, y: .62 }, { x: .46, y: .16 }
    ];
    var EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 7], [7, 3], [2, 4], [3, 5]];
    function hues() { return isLight() ? ['#c08a1e', '#e3a92f', ink('.55')] : ['#f5a524', '#ffc45c', ink('.55')]; }
    var packets = EDGES.map(function (e, i) {
      return { e: e, t: Math.random(), sp: 0.0022 + Math.random() * 0.0028, hue: i % 3 };
    });

    function px(n) { return { x: n.x * c.w, y: n.y * c.h }; }

    var t0 = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) return;
      if (ts - t0 < 24) return;
      t0 = ts;

      var ctx = c.ctx;
      ctx.clearRect(0, 0, c.w, c.h);
      var HUES = hues();

      // faint dot field, so the panel reads as territory rather than empty space
      ctx.fillStyle = ink(isLight() ? '.10' : '.05');
      for (var gx = 12; gx < c.w; gx += 17) {
        for (var gy = 12; gy < c.h; gy += 17) ctx.fillRect(gx, gy, 1.2, 1.2);
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = ink(isLight() ? '.16' : '.10');
      EDGES.forEach(function (e) {
        var a = px(NODES[e[0]]), b = px(NODES[e[1]]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      packets.forEach(function (p) {
        var a = px(NODES[p.e[0]]), b = px(NODES[p.e[1]]);
        if (!REDUCED) p.t += p.sp;
        if (p.t > 1) p.t = 0;

        var x = a.x + (b.x - a.x) * p.t;
        var y = a.y + (b.y - a.y) * p.t;
        var tx = a.x + (b.x - a.x) * Math.max(0, p.t - 0.14);
        var ty = a.y + (b.y - a.y) * Math.max(0, p.t - 0.14);

        var g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, ink('0'));
        g.addColorStop(1, HUES[p.hue]);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = HUES[p.hue];
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      NODES.forEach(function (n, i) {
        var p = px(n);
        var pulse = REDUCED ? 0 : (Math.sin(ts / 620 + i) + 1) / 2;
        ctx.fillStyle = ink((0.18 + pulse * 0.18).toFixed(3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2 + pulse * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ink(isLight() ? '.24' : '.16');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 + pulse * 2.4, 0, Math.PI * 2);
        ctx.stroke();
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
     North America map — the world map was decorative, this one answers a
     question buyers actually have: "are you in my timezone?". Land is a
     canvas dot-matrix cropped to NA; hubs are real DOM buttons on top so
     they're clickable, focusable and screen-reader visible.
     ══════════════════════════════════════════════════════════════════ */
  // Mask window covering North America, in mask-grid cells.
  var NA_COL0 = 5, NA_COL1 = 76, NA_ROW0 = 5, NA_ROW1 = 43;

  var HUBS = [
    { n: 'Edmonton', r: 'Alberta', lat: 53.5, lng: -113.5, tz: 'America/Edmonton', z: 'Mountain',
      hq: true, note: 'Head office. Every engagement is run from here, on Mountain Time.' },
    { n: 'Calgary', r: 'Alberta', lat: 51.0, lng: -114.1, tz: 'America/Edmonton', z: 'Mountain',
      note: 'Same timezone as head office, three hours from the Eastern seaboard.' },
    { n: 'Vancouver', r: 'British Columbia', lat: 49.3, lng: -123.1, tz: 'America/Vancouver', z: 'Pacific',
      note: 'One hour behind us. A 9am call your time is 10am ours.' },
    { n: 'Toronto', r: 'Ontario', lat: 43.7, lng: -79.4, tz: 'America/Toronto', z: 'Eastern',
      note: 'Two hours ahead. We are online before your afternoon starts.' },
    { n: 'Chicago', r: 'Illinois', lat: 41.9, lng: -87.6, tz: 'America/Chicago', z: 'Central',
      note: 'One hour ahead. Full working-day overlap, every day.' },
    { n: 'New York', r: 'New York', lat: 40.7, lng: -74.0, tz: 'America/New_York', z: 'Eastern',
      note: 'Two hours ahead. Your 5pm is our 3pm, so end-of-day still gets an answer.' },
    { n: 'Dallas', r: 'Texas', lat: 32.8, lng: -96.8, tz: 'America/Chicago', z: 'Central',
      note: 'One hour ahead. Where a lot of the driveaway freight actually moves.' },
    { n: 'Miami', r: 'Florida', lat: 25.8, lng: -80.2, tz: 'America/New_York', z: 'Eastern',
      note: 'Two hours ahead. Still a same-working-day conversation.' }
  ];

  function naMap() {
    var host = document.getElementById('naMap');
    var canvas = document.getElementById('naCanvas');
    if (!host || !canvas) return;

    var c = setupCanvas(canvas);
    var land = decodeLand();
    var hubLayer = document.getElementById('naHubs');
    var cols = NA_COL1 - NA_COL0;
    var rows = NA_ROW1 - NA_ROW0;

    // lat/lng -> fraction across the cropped window
    function project(lat, lng) {
      var col = ((lng + 180) / 360) * LAND_COLS;
      var row = ((LAND_LAT0 - lat) / (LAND_LAT0 - LAND_LAT1)) * LAND_ROWS;
      return { fx: (col - NA_COL0) / cols, fy: (row - NA_ROW0) / rows };
    }

    var geom = null;
    function layout() {
      var step = Math.min(c.w / cols, c.h / rows);
      geom = {
        step: step,
        x0: (c.w - step * cols) / 2,
        y0: (c.h - step * rows) / 2,
        r: Math.max(1, step * 0.30)
      };
      placeHubs();
    }

    function placeHubs() {
      if (!geom) return;
      var rect = canvas.getBoundingClientRect();
      var scale = rect.width / c.w;
      HUBS.forEach(function (h) {
        if (!h.el) return;
        var p = project(h.lat, h.lng);
        h.el.style.left = ((geom.x0 + p.fx * geom.step * cols) * scale) + 'px';
        h.el.style.top = ((geom.y0 + p.fy * geom.step * rows) * scale) + 'px';
      });
    }

    /* ── panel ── */
    var elCity = document.getElementById('naCity');
    var elTime = document.getElementById('naTime');
    var elZone = document.getElementById('naZone');
    var elNote = document.getElementById('naNote');
    var at = 0, timer = null, taken = false;

    function paint(i) {
      at = i;
      var h = HUBS[i];
      HUBS.forEach(function (o, n) {
        if (o.el) o.el.classList.toggle('is-on', n === i);
        if (o.el) o.el.setAttribute('aria-pressed', String(n === i));
      });
      if (elCity) elCity.textContent = h.n + ', ' + h.r;
      if (elZone) elZone.textContent = h.z + (h.hq ? ' · head office' : '');
      if (elNote) elNote.textContent = h.note;
      tickTime();
    }

    function tickTime() {
      if (!elTime) return;
      elTime.textContent = new Date().toLocaleTimeString('en-US', {
        timeZone: HUBS[at].tz, hour: 'numeric', minute: '2-digit'
      });
    }

    function stop() {
      taken = true;
      clearInterval(timer);
      var hint = host.querySelector('.namap__hint');
      if (hint) hint.remove();
    }

    HUBS.forEach(function (h, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'namap__hub' + (h.hq ? ' is-hq' : '');
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<i></i><span>' + h.n + '</span>';
      b.addEventListener('click', function () { stop(); paint(i); });
      b.addEventListener('mouseenter', function () {
        if (window.matchMedia('(hover: hover)').matches) { stop(); paint(i); }
      });
      h.el = b;
      if (hubLayer) hubLayer.appendChild(b);
    });

    layout();
    paint(0);
    setInterval(tickTime, 30000);

    window.addEventListener('resize', function () { setTimeout(layout, 60); });

    if (!REDUCED) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || taken) return;
          io.unobserve(e.target);
          timer = setInterval(function () {
            if (taken) return clearInterval(timer);
            paint((at + 1) % HUBS.length);
          }, 3200);
        });
      }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });
      io.observe(host);
    }

    var t0 = 0, pulse = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) return;
      if (ts - t0 < 40) return;
      t0 = ts;
      if (!REDUCED) pulse += 0.03;
      if (!geom) return;

      var ctx = c.ctx;
      ctx.clearRect(0, 0, c.w, c.h);

      for (var row = NA_ROW0; row < NA_ROW1; row++) {
        for (var col = NA_COL0; col < NA_COL1; col++) {
          if (!land[row * LAND_COLS + col]) continue;
          var x = geom.x0 + (col - NA_COL0 + 0.5) * geom.step;
          var y = geom.y0 + (row - NA_ROW0 + 0.5) * geom.step;

          // Single accent: steel dots, warming toward the selected hub.
          var p = project(HUBS[at].lat, HUBS[at].lng);
          var hx = geom.x0 + p.fx * geom.step * cols;
          var hy = geom.y0 + p.fy * geom.step * rows;
          var d = Math.hypot(x - hx, y - hy) / (geom.step * 12);
          var near = Math.max(0, 1 - d);
          var a = 0.18 + near * 0.5;

          ctx.fillStyle = near > 0.04
            ? accent(a.toFixed(3))
            : (isLight() ? 'rgba(27,63,107,.32)' : 'rgba(150,170,200,.16)');
          ctx.beginPath();
          ctx.arc(x, y, geom.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    requestAnimationFrame(frame);
  }

  /* ══════════════════════════════════════════════════════════════════
     Timezone band — the section claims our working day overlaps yours,
     so show the actual clocks rather than assert it.
     ══════════════════════════════════════════════════════════════════ */
  function clocks() {
    var cells = document.querySelectorAll('[data-clock]');
    if (!cells.length) return;

    function tick() {
      Array.prototype.forEach.call(cells, function (el) {
        el.textContent = new Date().toLocaleTimeString('en-US', {
          timeZone: el.getAttribute('data-clock'),
          hour: 'numeric', minute: '2-digit'
        });
      });
    }
    tick();
    setInterval(tick, 30000);
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
    safely('theme', theme);
    safely('nav', nav);
    safely('splitHeadings', splitHeadings);
    safely('reveals', reveals);
    safely('counters', counters);
    safely('rails', rails);
    safely('parallax', parallax);
    safely('cardGlow', cardGlow);
    safely('scrollMeters', scrollMeters);
    safely('accordion', accordion);
    safely('threadWave', threadWave);
    safely('clocks', clocks);
    safely('naMap', naMap);

    safely('heroViz', heroViz);
    safely('netViz', netViz);
    safely('dispatchBoard', dispatchBoard);
    safely('sparkline', sparkline);
    safely('proofViz', proofViz);
    safely('globeViz', globeViz);

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
