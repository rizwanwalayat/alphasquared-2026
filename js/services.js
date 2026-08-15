/* ==========================================================================
   Alpha Squared — Services page interactions.
   Two tab groups sharing one pattern: the AI spotlight switcher and the
   "start with the problem" picker that routes to the right service section.
   ========================================================================== */
(function () {
  'use strict';

  /* ── AI spotlight tabs ────────────────────────────────────────────────── */
  (function spotlight() {
    var tabs = document.getElementById('spotTabs');
    if (!tabs) return;

    var buttons = Array.prototype.slice.call(tabs.querySelectorAll('.spot__tab'));
    var panes = Array.prototype.slice.call(document.querySelectorAll('[data-spot-pane]'));

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b, j) {
          b.classList.toggle('is-on', i === j);
          b.setAttribute('aria-selected', String(i === j));
        });
        panes.forEach(function (p) {
          p.classList.toggle('is-on', p.getAttribute('data-spot-pane') === String(i));
        });
      });
    });
  })();

  /* ── problem picker ───────────────────────────────────────────────────── */
  (function picker() {
    var opts = document.getElementById('pickerOpts');
    if (!opts) return;

    var answers = [
      {
        k: '01 \u00b7 Operations Platforms',
        t: 'You need a system that matches how the work actually runs.',
        d: 'Dispatch boards, dashboards and the APIs behind them, built around your exceptions and your edge cases rather than a generic CRUD app with your logo on it. Alliance Driveaway went from phone calls and spreadsheets to one board running 350+ drivers.',
        href: '#platforms',
        label: 'Read more about Operations Platforms'
      },
      {
        k: '02 \u00b7 Mobile Apps',
        t: 'You need native, and you need it to survive losing signal.',
        d: 'Offline-first sync, background location and a release owned end to end by the engineers who built it. Our driver app is used by CDL drivers who go hours without a bar of service and still expect the job to be waiting.',
        href: '#mobile',
        label: 'Read more about Mobile Apps'
      },
      {
        k: '03 \u00b7 AI & Automation',
        t: 'You need the repetitive work to stop reaching a human.',
        d: 'A voice agent that answers and books at 3am, an OCR service that reads the paperwork, an assistant that answers in your domain. Measurable jobs, running in production, wired into the systems you already have.',
        href: '#ai',
        label: 'Read more about AI & Automation'
      },
      {
        k: '04 \u00b7 Product & UX Design',
        t: 'The data is all there and the interface is in the way.',
        d: 'Making complex, data-dense software legible is our principal\u2019s day job at Levi Strauss & Co. Research, clickable prototypes before a line of code, and a design system that holds up as the product grows.',
        href: '#design',
        label: 'Read more about Product & UX Design'
      },
      {
        k: '05 \u00b7 Dedicated Teams',
        t: 'You need capacity without a twelve-week hiring cycle.',
        d: 'A senior pod assembled around your stack and embedded in your process. Never junior-loaded to protect our margin, and in Mountain Time, so they are in your standup rather than reading a summary of it.',
        href: '#teams',
        label: 'Read more about Dedicated Teams'
      },
      {
        k: '06 \u00b7 Cloud, DevOps & Support',
        t: 'It is live, and that is exactly the problem.',
        d: 'AWS infrastructure, CI/CD, monitoring, and uptime and response-time targets agreed in writing before go-live rather than improvised during an incident. This is why 50+ of our clients are repeat clients.',
        href: '#cloud',
        label: 'Read more about Cloud, DevOps & Support'
      }
    ];

    var buttons = Array.prototype.slice.call(opts.querySelectorAll('.picker__opt'));
    var out = document.getElementById('pickerOut');
    var k = document.getElementById('pickerK');
    var t = document.getElementById('pickerT');
    var d = document.getElementById('pickerD');
    var link = document.getElementById('pickerL');

    function show(i) {
      var a = answers[i];
      if (!a) return;

      buttons.forEach(function (b, j) {
        b.classList.toggle('is-on', i === j);
        b.setAttribute('aria-selected', String(i === j));
      });

      at = i;

      k.textContent = a.k;
      t.textContent = a.t;
      d.textContent = a.d;
      link.setAttribute('href', a.href);
      link.innerHTML = a.label + ' <i class="ar">\u2192</i>';

      out.classList.remove('is-in');
      // Reflow so the entrance animation restarts on every selection.
      void out.offsetWidth;
      out.classList.add('is-in');
    }

    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { stop(); show(i); });
    });

    /* The six sentences only work if they are read, and a static list does not
       get read. Cycle them until the visitor takes over. */
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var at = 0;
    var timer = null;

    function tick() { at = (at + 1) % answers.length; show(at); }
    function start() { if (!reduce && !timer) timer = setInterval(tick, 5200); }
    function stop() { clearInterval(timer); timer = null; at = 0; }

    opts.addEventListener('mouseenter', stop);
    opts.addEventListener('focusin', stop);

    show(0);
    start();
  })();
})();
