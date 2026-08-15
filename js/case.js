/* ==========================================================================
   Alpha Squared — interactive modules on case study pages.
   One .ix block per page; data-ix picks the behavior. Everything degrades to
   readable static content if this file fails to load, so nothing here guards
   against its own absence.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  // A ratio threshold never fires for blocks taller than the viewport, which
  // these modules are on phones. Trigger once the top edge is well inside it.
  var ENTER = { rootMargin: '0px 0px -20% 0px', threshold: 0 };
  /* ── flow + screens: index-matched tabs and panes ───────────────────────── */
  function wireTabs(ix) {
    var tabs = all(ix, '[data-ix-tab]');
    var panes = all(ix, '[data-ix-pane]');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var i = tab.getAttribute('data-ix-tab');
        tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); });
        panes.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-ix-pane') === i); });
      });
    });
  }

  /* ── stack: one open layer at a time, hover previews on pointer devices ── */
  function wireStack(ix) {
    var layers = all(ix, '[data-ix-layer]');
    function open(layer) {
      layers.forEach(function (l) { l.classList.toggle('is-on', l === layer); });
    }
    layers.forEach(function (layer) {
      layer.addEventListener('click', function () { open(layer); });
      layer.addEventListener('mouseenter', function () {
        if (window.matchMedia('(hover: hover)').matches) open(layer);
      });
    });
  }

  /* ── metrics: count up and fill the bar once, when scrolled into view ──── */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = target + suffix; return; }

    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1200, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function wireMetrics(ix) {
    var meters = all(ix, '.ix__meter');
    if (!meters.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-lit');
        var n = entry.target.querySelector('.ix__meter-n');
        if (n) countUp(n);
        io.unobserve(entry.target);
      });
    }, ENTER);

    meters.forEach(function (m) { io.observe(m); });
  }

  /* ── transcript: stepped playback with a cadence that reads like a call ── */
  function wireTranscript(ix) {
    var turns = all(ix, '[data-ix-turn]');
    var playBtn = ix.querySelector('[data-ix-play]');
    var resetBtn = ix.querySelector('[data-ix-reset]');
    var timers = [];
    var playing = false;

    function clear() {
      timers.forEach(clearTimeout);
      timers = [];
      playing = false;
    }

    function reset() {
      clear();
      turns.forEach(function (t) { t.classList.remove('is-shown'); });
    }

    function play() {
      if (playing) return;
      reset();
      playing = true;
      var delay = 0;
      turns.forEach(function (turn, i) {
        // Longer lines get longer beats, so playback tracks reading speed.
        delay += i === 0 ? 200 : Math.min(600 + turn.textContent.length * 22, 2600);
        timers.push(setTimeout(function () {
          turn.classList.add('is-shown');
          if (i === turns.length - 1) playing = false;
        }, delay));
      });
    }

    if (playBtn) playBtn.addEventListener('click', play);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    if (reduce) {
      turns.forEach(function (t) { t.classList.add('is-shown'); });
      return;
    }

    // Auto-play the first time it scrolls into view; the button is for replays.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play();
        io.unobserve(entry.target);
      });
    }, ENTER);
    io.observe(ix);
  }

  /* ── dispatch (Alliance Driveaway): step a load through the board ───────── */
  var DISPATCH = [
    { driver: 'Unassigned', status: 'Posted', tone: 'wait' },
    { driver: 'R. Beaudry', status: 'Accepted', tone: 'wait' },
    { driver: 'R. Beaudry', status: 'Picked up', tone: 'move' },
    { driver: 'R. Beaudry', status: 'In transit', tone: 'move' },
    { driver: 'R. Beaudry', status: 'Delivered', tone: 'done' },
    { driver: 'R. Beaudry', status: 'Invoiced', tone: 'done' }
  ];

  function wireDispatch(ix) {
    var row = ix.querySelector('[data-load="0"]');
    var driver = row && row.querySelector('[data-driver]');
    var status = row && row.querySelector('[data-status]');
    var steps = all(ix, '#dispatchLog li');
    if (!row) return;

    var at = -1;
    var timer = null;

    function render() {
      var state = DISPATCH[Math.max(at, 0)];
      driver.textContent = state.driver;
      status.textContent = state.status;
      status.setAttribute('data-tone', state.tone);
      row.classList.toggle('is-hit', at >= 0);
      steps.forEach(function (li, i) { li.classList.toggle('is-on', i <= at); });
    }

    function step() {
      at = Math.min(at + 1, DISPATCH.length - 1);
      render();
      return at < DISPATCH.length - 1;
    }

    function run() {
      clearInterval(timer);
      at = -1;
      render();
      timer = setInterval(function () {
        if (!step()) clearInterval(timer);
      }, reduce ? 120 : 1300);
    }

    ix.querySelector('#dispatchPlay').addEventListener('click', run);
    ix.querySelector('#dispatchStep').addEventListener('click', function () {
      clearInterval(timer);
      step();
    });
    ix.querySelector('#dispatchReset').addEventListener('click', function () {
      clearInterval(timer);
      at = -1;
      render();
    });

    render();
  }

  /* ── call (AI Front Desk): transcript playback driving a CRM panel ──────── */
  // Turn index -> the CRM field the agent has enough information to write.
  var CALL_FIELDS = {
    2: ['intent', 'Book a service call'],
    4: ['type', 'Furnace, no heat'],
    5: ['address', '118 Rossland Close, Sherwood Park, AB'],
    7: ['slot', 'Today, 8:00 to 10:00 MT'],
    9: ['contact', 'Dana Reyes'],
    10: ['phone', '+1 (825) 555-0142'],
    12: ['outcome', 'Booked, no escalation']
  };

  function wireCall(ix) {
    var turns = all(ix, '[data-ix-turn]');
    var fields = all(ix, '.call__field');
    var meta = ix.querySelector('#callMeta');
    var playBtn = ix.querySelector('[data-ix-play]');
    var resetBtn = ix.querySelector('[data-ix-reset]');
    var timers = [];
    var playing = false;

    function write(key, value) {
      fields.forEach(function (f) {
        if (f.getAttribute('data-field') !== key) return;
        f.querySelector('[data-value]').textContent = value;
        f.classList.add('is-filled');
      });
    }

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      playing = false;
      turns.forEach(function (t) { t.classList.remove('is-shown'); });
      fields.forEach(function (f) {
        f.classList.remove('is-filled');
        f.querySelector('[data-value]').textContent = '\u2014';
      });
      ix.classList.remove('is-live');
      if (meta) meta.textContent = 'Idle \u00b7 +1 (825) 555-0142';
    }

    function play() {
      if (playing) return;
      reset();
      playing = true;
      ix.classList.add('is-live');
      if (meta) meta.textContent = 'On call \u00b7 +1 (825) 555-0142';

      var delay = 0;
      turns.forEach(function (turn, i) {
        delay += i === 0 ? 200 : Math.min(650 + turn.textContent.length * 24, 2800);
        timers.push(setTimeout(function () {
          turn.classList.add('is-shown');
          turn.scrollIntoView({ block: 'nearest' });
          if (CALL_FIELDS[i]) write(CALL_FIELDS[i][0], CALL_FIELDS[i][1]);
          if (i === turns.length - 1) {
            playing = false;
            ix.classList.remove('is-live');
            if (meta) meta.textContent = 'Call ended \u00b7 record written';
          }
        }, delay));
      });
    }

    if (playBtn) playBtn.addEventListener('click', play);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    if (reduce) {
      turns.forEach(function (t) { t.classList.add('is-shown'); });
      Object.keys(CALL_FIELDS).forEach(function (k) {
        write(CALL_FIELDS[k][0], CALL_FIELDS[k][1]);
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play();
        io.unobserve(entry.target);
      });
    }, ENTER);
    io.observe(ix);
  }

  var WIRE = {
    flow: wireTabs,
    screens: wireTabs,
    stack: wireStack,
    metrics: wireMetrics,
    transcript: wireTranscript,
    dispatch: wireDispatch,
    call: wireCall
  };

  all(document, '.ix[data-ix]').forEach(function (ix) {
    var fn = WIRE[ix.getAttribute('data-ix')];
    if (fn) fn(ix);
  });

  /* ── Quote rotator on the index page. Auto-advances, holds while the
        pointer is on it, and stays put if motion is reduced. ── */
  (function () {
    var rot = document.getElementById('qrot');
    if (!rot) return;

    var items = all(rot, '.qrot__item');
    var dots = all(rot, '.qrot__dot');
    if (items.length < 2) return;

    var i = 0;
    var timer = null;

    function show(n) {
      i = (n + items.length) % items.length;
      items.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
      dots.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
    }

    function start() {
      if (reduce || timer) return;
      timer = setInterval(function () { show(i + 1); }, 7000);
    }

    function stop() { clearInterval(timer); timer = null; }

    dots.forEach(function (dot, k) {
      dot.addEventListener('click', function () { stop(); show(k); start(); });
    });

    rot.addEventListener('mouseenter', stop);
    rot.addEventListener('mouseleave', start);
    rot.addEventListener('focusin', stop);
    rot.addEventListener('focusout', start);

    start();
  })();

  /* ── half-white, half-gold headings ─────────────────────────────────────
     Applied here rather than marked up per file: 48 generated pages carry
     their own copy, and the accent has to land the same way on all of them.
     Runs after main.js, so any word-split wrappers it left are replaced. */
  (function gildHeadings() {
    var nodes = all(document, '.hero--case .d1, main .d3');

    nodes.forEach(function (node) {
      if (node.querySelector('em')) return;

      var words = node.textContent.trim().split(/\s+/);
      if (words.length < 2) return;

      var cut = Math.ceil(words.length / 2);
      var em = document.createElement('em');
      em.textContent = words.slice(cut).join(' ');

      node.textContent = words.slice(0, cut).join(' ') + ' ';
      node.appendChild(em);
      node.style.visibility = 'visible';
    });
  })();
})();
