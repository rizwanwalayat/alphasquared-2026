/* ==========================================================================
   Alpha Squared — homepage lifecycle rail.
   Auto-advances until the visitor takes over, then stays put. Degrades to a
   readable first stage if this file never loads.
   ========================================================================== */
(function () {
  'use strict';

  var lc = document.getElementById('lc');
  if (!lc) return;

  var stages = Array.prototype.slice.call(lc.querySelectorAll('.lc__stage'));
  var panels = Array.prototype.slice.call(lc.querySelectorAll('.lc__panel'));
  if (!stages.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var at = 0;
  var timer = null;
  var taken = false;

  // Kept here rather than in four hidden <dl>s so the markup stays one panel deep.
  var FACTS = [
    ['A written scope and integration plan', '1 to 2 weeks', 'Principal plus a senior engineer'],
    ['A clickable prototype of the real screens', '2 to 4 weeks', 'Principal on UX, one engineer'],
    ['Working software in staging, every week', 'Weekly releases', 'Senior pod sized to the build'],
    ['An SLA in writing before go-live', 'Ongoing retainer', 'Same team that built it']
  ];

  var out = document.getElementById('lcOut');
  var len = document.getElementById('lcLen');
  var who = document.getElementById('lcWho');

  function show(i) {
    at = i;
    stages.forEach(function (s, n) {
      s.classList.toggle('is-on', n === i);
      s.classList.toggle('is-done', n < i);
      s.setAttribute('aria-selected', String(n === i));
    });
    panels.forEach(function (p, n) { p.classList.toggle('is-on', n === i); });
    if (out) out.textContent = FACTS[i][0];
    if (len) len.textContent = FACTS[i][1];
    if (who) who.textContent = FACTS[i][2];
  }

  function stop() {
    taken = true;
    clearInterval(timer);
    var hint = lc.querySelector('.lc__hint');
    if (hint) hint.remove();
  }

  stages.forEach(function (stage, i) {
    stage.addEventListener('click', function () { stop(); show(i); });
  });

  // Arrow keys, since the rail is a tablist.
  lc.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    stop();
    var next = (at + d + stages.length) % stages.length;
    show(next);
    stages[next].focus();
  });

  show(0);

  if (reduce) { stop(); return; }

  // Only start cycling once it is actually on screen.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || taken) return;
      io.unobserve(entry.target);
      timer = setInterval(function () {
        if (taken) return clearInterval(timer);
        show((at + 1) % stages.length);
      }, 4200);
    });
  }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });

  io.observe(lc);
})();

/* ==========================================================================
   Triage picker — choosing one of the three failures rewrites the read-out
   beside the form and seeds the message field. Without this file the form
   is still a plain, working Netlify form.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('.triage__form');
  if (!form) return;

  var opts = Array.prototype.slice.call(form.querySelectorAll('input[name="issue"]'));
  if (!opts.length) return;

  var out = {
    fix: document.getElementById('tgFix'),
    proof: document.getElementById('tgProof'),
    step: document.getElementById('tgStep')
  };
  var msg = document.getElementById('tgMsg');
  var seeded = '';

  function set(node, text) {
    if (!node || !text || node.textContent === text) return;
    node.textContent = text;
    node.classList.remove('is-swap');
    void node.offsetWidth;               // restart the swap animation
    node.classList.add('is-swap');
  }

  function apply(input, seed) {
    set(out.fix, input.getAttribute('data-fix'));
    set(out.proof, input.getAttribute('data-proof'));
    set(out.step, input.getAttribute('data-step'));

    // Only ever replace an empty box or our own suggestion: overwriting what
    // somebody typed is the fastest way to lose the enquiry.
    if (!seed || !msg) return;
    if (msg.value && msg.value !== seeded) return;
    seeded = input.getAttribute('data-msg') || '';
    msg.value = seeded;
  }

  opts.forEach(function (input) {
    input.addEventListener('change', function () { if (input.checked) apply(input, true); });
  });

  var checked = opts.filter(function (i) { return i.checked; })[0];
  if (checked) apply(checked, false);
})();
