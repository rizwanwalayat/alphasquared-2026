/* ==========================================================================
   Alpha Squared — About page interactions: uptime clock, timeline, stat
   count-up, flip cards, region tabs. Content lives here rather than in the
   markup only where it is genuinely data (milestones, country lists).
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── uptime since founding ────────────────────────────────────────────── */
  (function uptime() {
    var el = document.getElementById('uptimeCounter');
    if (!el) return;

    var founded = new Date(2012, 0, 1).getTime();
    var YEAR = 365.25 * 24 * 60 * 60 * 1000;

    function render() {
      var diff = Date.now() - founded;
      var years = Math.floor(diff / YEAR);
      var days = Math.floor((diff - years * YEAR) / (24 * 60 * 60 * 1000));
      el.textContent = years + ' years, ' + days + ' days';
    }
    render();
    setInterval(render, 60000);
  })();

  /* ── timeline ─────────────────────────────────────────────────────────── */
  (function timeline() {
    var track = document.getElementById('tlTrack');
    var fill = document.getElementById('tlFill');
    var detail = document.getElementById('tlDetail');
    if (!track || !detail) return;

    var milestones = [
      {
        cat: 'FOUNDED',
        title: 'Alpha Squared opens in Edmonton',
        text: 'Two people, one city, and a willingness to take any project that would teach us something. Web, mobile, whatever came through the door. That range is the reason we can still staff a Laravel back end and a Swift app out of the same building fourteen years later.'
      },
      {
        cat: 'EARLY GROWTH',
        title: 'Word of mouth carries us past Alberta',
        text: 'Early e-commerce and real estate platforms for clients across North America and the Middle East. Amwalouna collapsed four separate systems into one record for a property developer, which taught us that the real product in operations software is almost always consolidation.'
      },
      {
        cat: 'ENTERPRISE',
        title: 'Coca-Cola, and what enterprise really asks for',
        text: 'Internal messaging routed through a reporting structure spanning thousands of people, a touch-screen meeting-room system wired into existing mail servers, and a 3D forklift training simulator. Three very different builds, one lesson: at that scale, integration is the project.'
      },
      {
        cat: 'INDUSTRIAL FOCUS',
        title: 'Energy data platforms take shape',
        text: 'Our first serious data platforms for oil and gas clients. This is the groundwork that became FluidsData and Compo++, now in active use by teams at Chevron, ExxonMobil and ADNOC. Messy technical data, made trustworthy, then made useful.'
      },
      {
        cat: 'SPECIALIZATION',
        title: 'Alliance Driveaway, and finding the niche',
        text: 'A full dispatch ecosystem for 350+ CDL drivers across 48 states and Canada: web dashboard, native driver apps, chain of custody, QuickBooks sync. Building for an operation where the vehicle is the freight taught us what we actually wanted to specialize in.'
      },
      {
        cat: 'AI IN PRODUCTION',
        title: 'AI Front Desk goes live',
        text: 'A voice agent answering real inbound calls with no human in the loop: intent, live availability, booking, CRM write-back. Our first fully autonomous AI system in production, and the template for the automation work that followed.'
      },
      {
        cat: 'TODAY',
        title: '265+ projects, 17 countries, still principal-led',
        text: 'Still senior-only, still shipping weekly working demos instead of status reports, still with Abdullah on every engagement personally. The thing that has not changed in fourteen years is who picks up the phone.'
      }
    ];

    var nodes = Array.prototype.slice.call(track.querySelectorAll('.tl__node'));
    var cat = document.getElementById('tlCat');
    var title = document.getElementById('tlTitle');
    var text = document.getElementById('tlText');

    function select(idx) {
      var m = milestones[idx];
      if (!m) return;

      nodes.forEach(function (n, i) {
        var on = i === idx;
        n.classList.toggle('is-on', on);
        n.setAttribute('aria-selected', String(on));
      });
      fill.style.width = nodes.length > 1
        ? (idx / (nodes.length - 1)) * 100 + '%'
        : '0%';

      detail.classList.remove('is-shown');
      window.setTimeout(function () {
        cat.textContent = m.cat;
        title.textContent = m.title;
        text.textContent = m.text;
        detail.classList.add('is-shown');
      }, reduce ? 0 : 160);
    }

    nodes.forEach(function (node, i) {
      node.addEventListener('click', function () { select(i); });
      node.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var next = i + (e.key === 'ArrowRight' ? 1 : -1);
        if (nodes[next]) { nodes[next].focus(); select(next); }
      });
    });

    select(0);
  })();

  /* ── stat count-up ────────────────────────────────────────────────────── */
  (function stats() {
    var grid = document.getElementById('aboutStats');
    if (!grid) return;

    var nums = Array.prototype.slice.call(grid.querySelectorAll('[data-count]'));

    function run() {
      nums.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduce) { el.textContent = target + suffix; return; }

        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / 1300, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run();
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    io.observe(grid);
  })();

  /* ── flip cards ───────────────────────────────────────────────────────── */
  Array.prototype.forEach.call(document.querySelectorAll('.flip'), function (card) {
    function toggle() {
      var flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(flipped));
    }
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ── regions ──────────────────────────────────────────────────────────── */
  (function regions() {
    var tabs = document.getElementById('regionTabs');
    var row = document.getElementById('regionRow');
    var note = document.getElementById('regionNote');
    if (!tabs || !row) return;

    var data = [
      {
        note: 'Home market and the majority of active work. Mountain Time means a full working-day overlap coast to coast, and Canadian contracts and data residency when procurement asks.',
        countries: ['Canada', 'United States']
      },
      {
        note: 'Product and platform work for European clients, largely fintech and marketplace builds including Paladin with its IBAN payout flows.',
        countries: ['United Kingdom', 'Spain', 'France', 'Switzerland', 'Sweden']
      },
      {
        note: 'Energy and industrial territory. Compo++ was built for ADNOC, and our real estate and marketplace work runs across the Gulf.',
        countries: ['United Arab Emirates', 'Saudi Arabia', 'Oman']
      },
      {
        note: 'Consumer and hospitality platforms, from Taiwan\u2019s Foodies Express to a Hong Kong childcare marketplace and a professional network for Shanghai\u2019s financial district.',
        countries: ['China', 'Malaysia', 'Pakistan', 'Australia']
      },
      {
        note: 'Marketing platforms and consumer products for clients building across the continent.',
        countries: ['South Africa', 'Nigeria']
      }
    ];

    var buttons = Array.prototype.slice.call(tabs.querySelectorAll('.regions__tab'));

    function show(idx) {
      var region = data[idx];
      if (!region) return;

      buttons.forEach(function (b, i) {
        var on = i === idx;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
      });

      note.textContent = region.note;
      row.innerHTML = '';
      region.countries.forEach(function (country, i) {
        var chip = document.createElement('span');
        chip.textContent = country;
        chip.style.animationDelay = (i * 0.05) + 's';
        row.appendChild(chip);
      });
    }

    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { show(i); });
    });

    show(0);
  })();
})();
