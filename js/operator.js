/* ==========================================================================
   Direction B — "Operator"
   Motion is deliberately minimal: short reveals, count-ups, a progress fill.
   No smooth-scroll hijack, no loader, no cinematics. Speed is the aesthetic.
   Vanilla — no GSAP, no Lenis. ~4KB against ~140KB of libraries.
   ========================================================================== */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js-on');

  /* ── scroll reveals ─────────────────────────────────────────────── */
  function reveals() {
    var nodes = document.querySelectorAll('[data-r]');

    if (REDUCED || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var d = parseFloat(e.target.getAttribute('data-r')) || 0;
        setTimeout(function () { e.target.classList.add('is-in'); }, d * 1000);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    nodes.forEach(function (n) { io.observe(n); });

    // Safety net: hidden content is a total-failure mode, so if anything is
    // still unrevealed once it's above the fold, force it. Covers restored
    // scroll positions, background tabs and any IO edge case.
    setInterval(function () {
      var pending = document.querySelectorAll('[data-r]:not(.is-in)');
      if (!pending.length) return;
      pending.forEach(function (n) {
        if (n.getBoundingClientRect().top < window.innerHeight) n.classList.add('is-in');
      });
    }, 1200);
  }

  /* ── count-up ───────────────────────────────────────────────────── */
  function counters() {
    var nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var pre = el.getAttribute('data-pre') || '';
      var suf = el.getAttribute('data-suf') || '';
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);

      if (REDUCED) { el.textContent = pre + target.toFixed(dec) + suf; return; }

      var t0 = performance.now(), dur = 1200;
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + (target * eased).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }

    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ── progress bars in the dispatch board ────────────────────────── */
  function bars() {
    var nodes = document.querySelectorAll('.bar i[data-w]');
    if (!nodes.length) return;

    function fill() {
      nodes.forEach(function (n, i) {
        setTimeout(function () { n.style.width = n.getAttribute('data-w') + '%'; },
                   REDUCED ? 0 : 160 + i * 110);
      });
    }

    if (!('IntersectionObserver' in window)) { fill(); return; }
    var host = nodes[0].closest('.board');
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      fill();
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(host || nodes[0]);
  }

  /* ── FAQ accordion ──────────────────────────────────────────────── */
  function faq() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
    if (!items.length) return;

    // Animate height between explicit pixel values, then release an opened
    // panel to `auto` on a guarded timer.
    //
    // The obvious `transitionend` version is subtly broken: if setting the
    // height doesn't actually change it, no transition fires, the one-shot
    // listener stays attached, and the *next* close transition triggers it —
    // setting height:auto at the end of a collapse. That leaves closed panels
    // open and open ones shut. The guard below is what prevents it.
    function set(item, open) {
      var body = item.querySelector('.faq__a');
      item.classList.toggle('is-open', open);

      if (REDUCED) { body.style.height = open ? 'auto' : '0px'; return; }

      clearTimeout(body._relax);

      // pin the current height, flush, then transition to the target
      var start = body.getBoundingClientRect().height;
      body.style.transition = 'none';
      body.style.height = start + 'px';
      void body.offsetHeight;

      body.style.transition = 'height .32s cubic-bezier(.22,1,.36,1)';
      body.style.height = (open ? body.scrollHeight : 0) + 'px';

      if (open) {
        body._relax = setTimeout(function () {
          if (item.classList.contains('is-open')) body.style.height = 'auto';
        }, 340);
      }
    }

    items.forEach(function (item, i) {
      set(item, i === 0);
      item.querySelector('.faq__q').addEventListener('click', function () {
        var wasOpen = item.classList.contains('is-open');
        items.forEach(function (o) { if (o !== item) set(o, false); });
        set(item, !wasOpen);
      });
    });
  }

  /* ── mobile nav ─────────────────────────────────────────────────── */
  function nav() {
    var el = document.getElementById('nav');
    var burger = document.getElementById('burger');
    if (!el || !burger) return;

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

  function init() { nav(); reveals(); counters(); bars(); faq(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
