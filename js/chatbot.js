/* ==========================================================================
   Ask Alpha² — site-wide chat widget.

   No backend. Scored keyword matching against a hand-maintained knowledge
   base: every keyword hit in the user's message scores, multi-word phrases
   score higher than single words, and the highest-scoring topic answers.
   That means phrasing does not have to be exact, and adding a new phrasing
   is a one-line change rather than a retrain.

   Per-page copy variation:
     #askA2-panel[data-greeting="..."]  replaces the opening bot message
     #askA2-panel[data-autoopen]        opens the panel on load (contact page)

   Upgrade path to a real model is in chatbot-widget/README-chatbot.md.
   ========================================================================== */
(function () {
  'use strict';

  var launcher = document.getElementById('askA2-launcher');
  var panel = document.getElementById('askA2-panel');
  var closeBtn = document.getElementById('askA2-close');
  var body = document.getElementById('askA2-body');
  var input = document.getElementById('askA2-input');
  var sendBtn = document.getElementById('askA2-send');
  var badgeDot = document.getElementById('askA2-badge-dot');
  var quickRow = document.getElementById('askA2-quick-row');

  if (!launcher || !panel) return;

  var BOOK = 'the Contact page, or call +1 (825) 977-2020';

  /* ========================================================================
     KNOWLEDGE BASE
     Keywords are matched as substrings of the lowercased message, so include
     the North American phrasings people actually type ("ballpark", "how much
     would it run", "y'all", "reach out", "hop on a call") alongside the
     formal ones. Add topics as real questions come in.
     ======================================================================== */
  var knowledgeBase = [

    /* ── conversational ─────────────────────────────────────────────────── */
    {
      keywords: ['hi', 'hey', 'hello', 'howdy', 'yo ', 'sup', 'good morning',
                 'good afternoon', 'anyone there', 'anybody there'],
      reply: "Hey. I'm the Alpha\u00b2 assistant. Ask me about what we build, what it costs, how fast we move or who you'd actually be working with. Or tap one of the quick questions below."
    },
    {
      keywords: ['thanks', 'thank you', 'appreciate it', 'appreciate that',
                 'awesome', 'perfect', 'sounds good', 'great, thanks'],
      reply: "Anytime. When you're ready for a real answer on your specific project, " + BOOK + " gets you a person, not a form."
    },
    {
      keywords: ['are you a bot', 'are you human', 'is this a real person',
                 'am i talking to a bot', 'ai or human'],
      reply: "I'm a bot, and a fairly simple one. We build much better ones for clients, which is a slightly awkward thing to admit. For anything that matters, book a call and you'll get Abdullah directly."
    },

    /* ── what we do ─────────────────────────────────────────────────────── */
    {
      keywords: ['service', 'services', 'what do you do', 'what do you build',
                 'what can you build', 'capabilities', 'offerings', 'what you offer',
                 'do you do'],
      reply: "Six things: operations platforms, native mobile apps, AI and automation, product and UX design, dedicated senior teams, and cloud/DevOps with real support agreements. Everything from first sketch to production. Which one do you want detail on?"
    },
    {
      keywords: ['ai', 'a.i.', 'automation', 'artificial intelligence', 'llm',
                 'machine learning', 'agentic', 'gpt', 'chatbot for my', 'automate'],
      reply: "AI is our most active area. We've shipped a voice agent that answers real inbound calls and books appointments with no human in the loop, a custom OCR microservice reading crumpled grocery receipts accurately enough to pay cash back against them, and an agentic assistant inside FluidsData that teams at Chevron and ExxonMobil use. We treat AI as engineering with a measurable job, not a slide."
    },
    {
      keywords: ['voice agent', 'voice ai', 'answer the phone', 'answering service',
                 'receptionist', 'front desk', 'phone agent', 'call answering',
                 'ivr', 'vapi', 'elevenlabs', 'twilio'],
      reply: "That's our AI Front Desk build: Twilio for telephony, VAPI and ElevenLabs for voice and intent, live calendar checks before it offers a slot, and HubSpot write-back during the call. It answers at 3am and books the job. There's a playable simulated call on the AI Front Desk case study page."
    },
    {
      keywords: ['ocr', 'document processing', 'scan documents', 'data extraction',
                 'read receipts', 'invoice processing', 'paperwork'],
      reply: "We built a custom OCR microservice for FoodStretcher Plus because off-the-shelf OCR fell over on thermal-paper grocery receipts. It extracts merchant, date, totals and individual line items, then validates them against an eligible-product list. If your documents are messy and real money depends on reading them right, that's the same problem."
    },
    {
      keywords: ['mobile app', 'ios', 'android', 'iphone', 'app store', 'play store',
                 'native app', 'swift', 'kotlin', 'flutter', 'react native',
                 'build an app'],
      reply: "Native iOS in Swift and Android in Kotlin, plus Flutter and React Native when cross-platform is genuinely the right call. Our driver app runs for 350+ CDL drivers who lose signal constantly, so offline-first sync and background location are things we've already solved rather than things we'd be learning on your budget."
    },
    {
      keywords: ['web app', 'dashboard', 'platform', 'portal', 'internal tool',
                 'admin panel', 'erp', 'crm system', 'saas', 'backend', 'api'],
      reply: "Operations platforms are our bread and butter: dispatch boards, admin tooling, client portals and the APIs behind them. We build for how the operation actually runs, including the exceptions your team has half-memorized, rather than a generic CRUD app with your logo on it."
    },
    {
      keywords: ['design', 'ux', 'ui', 'figma', 'prototype', 'wireframe',
                 'user research', 'design system', 'look and feel'],
      reply: "Our principal, Abdullah Farooq Ahmed, is a Product Designer at Levi Strauss & Co. leading UX on internal data-science and AI tools, and was Prebuild Design Lead on Salesforce's AT&T OneCare build. Making data-dense software legible is the day job, not a first attempt."
    },
    {
      keywords: ['dedicated team', 'staff augmentation', 'augment', 'embed',
                 'extend my team', 'developers for hire', 'resource', 'pod',
                 'dev shop', 'outsource'],
      reply: "We assemble a senior pod around your stack and embed it. Never junior-loaded to protect our margin, which is the usual failure mode. You get capacity without a twelve-week local hire and without paying someone to learn your domain on your dime."
    },
    {
      keywords: ['devops', 'cloud', 'aws', 'azure', 'hosting', 'infrastructure',
                 'ci/cd', 'deployment', 'monitoring', 'server'],
      reply: "AWS mostly, Azure and Google Cloud where the client already lives there. CI/CD pipelines, monitoring and observability, and uptime and response-time targets defined in writing before go-live rather than improvised after an incident."
    },
    {
      keywords: ['take over', 'inherit', 'existing project', 'legacy', 'rescue',
                 'previous developer', 'other agency', 'half finished', 'fix our app',
                 'someone else built'],
      reply: "Yes, and more often than you'd think. We start with a paid audit of what exists before quoting the work, because inheriting a codebase blind and quoting off a demo is how both sides end up unhappy. Bring us the repo and the frustration."
    },

    /* ── industries ─────────────────────────────────────────────────────── */
    {
      keywords: ['industry', 'industries', 'sector', 'vertical', 'who do you work with',
                 'what kind of clients', 'niche'],
      reply: "Core focus is trucking and transport, and energy and industrial. Beyond that we've shipped fintech, healthcare, govtech, real estate, sports tech and e-commerce. 48 case studies are written up in full on the site if you want to see the range."
    },
    {
      keywords: ['trucking', 'transport', 'dispatch', 'fleet', 'freight', 'logistics',
                 'driveaway', 'carrier', 'cdl', 'eld', 'dot', 'fmcsa', 'load board',
                 'tms', 'driver app', 'owner operator'],
      reply: "This is our specialty. We built Alliance Driveaway's entire ecosystem: dispatch dashboard, native iOS and Android driver apps, photo/GPS/signature chain of custody on every handoff, and QuickBooks sync so a load becomes an invoice without retyping. 350+ screened CDL drivers, 48 states and Canada. Class 6, 7 and 8."
    },
    {
      keywords: ['oil', 'gas', 'energy', 'drilling', 'upstream', 'petroleum',
                 'wells', 'chevron', 'exxon', 'adnoc', 'fluids', 'industrial'],
      reply: "FluidsData and Compo++ are ours: AI-powered analytics turning raw drilling-fluids data into QA'd dashboards, with an agentic assistant on top. In active use by teams at Chevron, ExxonMobil and ADNOC. Being Alberta-based, energy clients are a short conversation for us."
    },
    {
      keywords: ['health', 'healthcare', 'medical', 'clinic', 'patient', 'hospital',
                 'hipaa', 'phi', 'ehr', 'emr', 'doctor'],
      reply: "We've built a diabetes diagnosis and treatment system for the Services Institute of Medical Sciences that runs 250 to 300 patients a day and has seen 20,000+ since launch, plus patient apps for orthodontics, osteopathy and arthritis management. Regulated-data handling is a design constraint we're used to."
    },
    {
      keywords: ['fintech', 'payments', 'stripe', 'paypal', 'banking', 'wallet',
                 'payouts', 'cash back', 'lending', 'financial'],
      reply: "Payments and rewards work: FoodStretcher Plus for grocery cash back with custom OCR, Paladin with deposit protection and IBAN payouts, and Stripe and PayPal integrations across our SaaS builds. Payout flows for unbanked users are a specific thing we've had to solve."
    },
    {
      keywords: ['ecommerce', 'e-commerce', 'online store', 'shopify', 'woocommerce',
                 'magento', 'storefront', 'checkout', 'retail'],
      reply: "Several storefronts, from Alkanooz's artisan home decor to MozayWorld's custom photo-mosaic configurator, plus BeautyHooked's booking and POS marketplace, which helped that company close a $280,000 seed round. WordPress/WooCommerce, Magento, or custom when the product needs it."
    },

    /* ── credibility ────────────────────────────────────────────────────── */
    {
      keywords: ['case study', 'case studies', 'portfolio', 'examples', 'past work',
                 'previous work', 'projects you', 'show me work', 'references',
                 'samples'],
      reply: "48 case studies, each with its own page: the problem, what we shipped, and where it stands today. Start with Alliance Driveaway (dispatch for 350+ drivers), FluidsData (Chevron, ExxonMobil, ADNOC) or AI Front Desk (a voice agent running live). The Case Studies page has all of them."
    },
    {
      keywords: ['levi', 'coca cola', 'coca-cola', 'coke', 'at&t', 'att', 'honeywell',
                 'salesforce', 'world bank', 'big clients', 'brand names',
                 'notable clients', 'who are your clients'],
      reply: "Levi Strauss & Co., Coca-Cola, AT&T (via Salesforce's OneCare build), Honeywell, Matrikon, Arcus Power, the World Bank and ADNOC, plus Chevron and ExxonMobil teams using FluidsData. For Coca-Cola alone we've built internal messaging, a meeting-room booking system and a 3D forklift training simulator."
    },
    {
      keywords: ['how long have you', 'since when', 'founded', 'established',
                 'years in business', 'how old is', 'track record', 'experience'],
      reply: "Founded 2012 in Edmonton, Alberta. 265+ projects, 17 countries, 50+ repeat clients. The repeat number is the one we'd point at: it's harder to fake than a logo wall."
    },
    {
      keywords: ['team', 'who works', 'engineers', 'developers', 'staff',
                 'how many people', 'company size', 'who would i work with',
                 'who would i be working', 'who will i be working', 'who will i work with',
                 'who do i work with', 'who works on my', 'who is on my project',
                 'who would i actually', 'account manager', 'project manager', 'agency'],
      reply: "Abdullah Farooq Ahmed leads every engagement personally as principal. You get him, not an account manager reading from a brief. Behind him: Rizwan Walayat on the commercial side, who came up through engineering and led mobile architecture on our driver-app and AI work, and a senior bench in Laravel, Vue, Node, Swift and Kotlin. The About page has the full picture."
    },
    {
      keywords: ['abdullah', 'principal', 'founder', 'owner', 'who runs',
                 'who is in charge'],
      reply: "Abdullah Farooq Ahmed. 16+ years across UI/UX and full-stack, currently a Product Designer at Levi Strauss & Co., formerly Lead Product Designer at Arcus Power. He's the named point of contact on every engagement and stays on it, which is the whole reason clients come back."
    },
    {
      keywords: ['rizwan', 'sales', 'business development', 'who do i talk to first'],
      reply: "Rizwan Walayat heads sales, and he came up through engineering leading mobile architecture on our driver-app and AI builds. Your first commercial conversation is with someone who has actually shipped this kind of system."
    },
    {
      keywords: ['tech', 'technology', 'stack', 'language', 'framework', 'laravel',
                 'vue', 'react', 'node', 'python', 'golang', ' go ', '.net',
                 'wordpress', 'database', 'mysql', 'postgres'],
      reply: "Backend: PHP/Laravel, Node.js, Go, Python, .NET. Frontend: Vue.js, React and Next.js. Mobile: Swift, Kotlin, Flutter, React Native. Data: MySQL, PostgreSQL, SQL Server, MongoDB, Oracle. Cloud: AWS, Azure, GCP. We pick per project rather than forcing one stack on everything."
    },

    /* ── commercial ─────────────────────────────────────────────────────── */
    {
      keywords: ['price', 'pricing', 'cost', 'costs', 'budget', 'how much',
                 'ballpark', 'estimate', 'quote', 'rate', 'rates', 'hourly',
                 'per hour', 'expensive', 'cheap', 'afford', 'what would it run',
                 'price range', 'day rate'],
      reply: "Honest answer: it depends on scope, and a generic range would be useless to you. A driver app is a different number than a full dispatch platform. What we won't do is quote blind off a paragraph. Book a call, walk us through it, and you'll get a real number with the assumptions written down."
    },
    {
      keywords: ['fixed price', 'fixed bid', 'time and materials', 't&m',
                 'retainer', 'engagement model', 'contract type', 'milestone',
                 'sprint', 'how do you charge', 'billing'],
      reply: "Depends on how well-defined the work is. Tight, well-specified scope suits fixed price. Discovery-heavy or evolving work suits time and materials or a monthly retainer, because a fixed bid on a moving target just prices in risk you end up paying for. We'll tell you which one your project actually is."
    },
    {
      keywords: ['how long', 'timeline', 'duration', 'how fast', 'turnaround',
                 'when can you start', 'availability', 'lead time', 'deadline',
                 'rush', 'asap', 'kick off'],
      reply: "Most engagements open with a scoped discovery phase before we commit to a timeline, deliberately, so we're not guessing in front of you. After that you get a dated plan. Current availability is worth asking about directly on a call since it moves week to week."
    },
    {
      keywords: ['process', 'how do you work', 'methodology', 'agile', 'scrum',
                 'discovery', 'communication', 'updates', 'status report',
                 'how often', 'demos'],
      reply: "Discovery, then weekly working demos instead of status reports. You see running software early and often, which is the only reliable way to catch a wrong assumption before it's expensive. Same-timezone standups if you want them."
    },
    {
      keywords: ['small', 'too small', 'minimum', 'mvp', 'startup', 'just an idea',
                 'prototype', 'proof of concept', 'poc', 'side project', 'solo founder'],
      reply: "No automatic minimum. We work with founders building a first MVP and with operators scaling systems that already run. We've also built deliberate throwaway prototypes, like a tablet reservation system a restaurant chain tested during live service before committing to a rollout. Tell us the idea."
    },
    {
      keywords: ['rfp', 'rfq', 'tender', 'procurement', 'vendor', 'sow',
                 'statement of work', 'msa', 'purchase order', 'net 30', 'invoice',
                 'w-9', 'w9', 'insurance', 'coi'],
      reply: "We handle procurement paperwork routinely: MSAs, SOWs, NDAs, POs and standard net terms. We've delivered against government requirements on the Safe City program and to Small Woman-Owned Business standards for Alliance Driveaway. Send the RFP and we'll tell you honestly whether we're the right bidder."
    },
    {
      keywords: ['support', 'maintenance', 'after launch', 'ongoing', 'sla',
                 'bug', 'bugs', 'warranty', 'uptime', 'break', 'on call',
                 'response time'],
      reply: "We stay on after launch: monitoring, agreed response times in writing, and roadmap ownership. 50+ of our clients are repeat clients largely because we don't disappear at go-live. The Trust & Security page covers how we structure SLAs."
    },

    /* ── risk and legal ─────────────────────────────────────────────────── */
    {
      keywords: ['security', 'secure', 'safe', 'compliance', 'soc 2', 'soc2',
                 'iso 27001', 'pipeda', 'gdpr', 'hipaa', 'pci', 'audit',
                 'penetration test', 'data residency', 'privacy'],
      reply: "Security is architected in, not bolted on. We've built to PCI DSS contexts, government access-control requirements on the Safe City systems, and Canadian data-residency expectations under PIPEDA. For your specific compliance regime, that's a call worth having, and we're happy to get technical."
    },
    {
      keywords: ['own the code', 'ip', 'intellectual property', 'source code',
                 'who owns', 'repository', 'github access', 'handover',
                 'lock in', 'lock-in'],
      reply: "You own the code and the IP. Full source in your repository, documented, with a handover that assumes you might one day take it in-house. Vendor lock-in is a business model we're not interested in."
    },
    {
      keywords: ['nda', 'confidential', 'non-disclosure', 'sign an nda'],
      reply: "Happy to sign yours before any detail is shared, or use ours. We've built under NDA plenty, including a contract-management platform we can only describe generically. The Trust & Security page covers the specifics."
    },

    /* ── logistics ──────────────────────────────────────────────────────── */
    {
      keywords: ['where', 'location', 'based', 'office', 'canada', 'canadian',
                 'edmonton', 'alberta', 'timezone', 'time zone', 'country',
                 'offshore', 'onshore', 'nearshore', 'overseas', 'remote'],
      reply: "Edmonton, Alberta. That's Mountain Time, so we overlap the full working day with every North American time zone: three hours behind Eastern, one ahead of Pacific. Canadian contracts, Canadian data residency, no 3am handoff window and no waiting overnight for an answer."
    },
    {
      keywords: ['meet in person', 'visit', 'on site', 'onsite', 'travel',
                 'in person', 'come to our office'],
      reply: "We're in Edmonton and we do travel for the engagements that warrant it, particularly kickoffs. Most of the work runs remote with weekly demos, which clients across 17 countries have found works fine. Raise it on the call."
    },
    {
      keywords: ['language', 'english', 'communication barrier', 'accent',
                 'do you speak'],
      reply: "All work runs in English, with the principal in Edmonton on North American hours. The offshore communication gap isn't a thing you'll be managing here."
    },
    {
      keywords: ['integration', 'integrate', 'quickbooks', 'hubspot', 'salesforce',
                 'zapier', 'n8n', 'make.com', 'api connection', 'sync', 'erp integration',
                 'third party'],
      reply: "Integration is most of the work in an operations build. We've done deep QuickBooks sync for Alliance Driveaway (load to invoice, no retyping), HubSpot write-back for the AI Front Desk, Stripe and PayPal in SaaS products, Exchange for a meeting-room system, and n8n and Make.com for workflow automation."
    },
    {
      keywords: ['job', 'jobs', 'career', 'careers', 'hiring', 'work for you',
                 'resume', 'cv', 'apply', 'internship', 'freelance for you'],
      reply: "We hire senior engineers occasionally and it's not run through this widget. Send a note to info@alphasquared.co with what you've shipped and it'll reach the right person."
    },
    {
      keywords: ['book', 'call', 'meeting', 'schedule', 'consult', 'demo',
                 'talk to someone', 'speak to', 'get in touch', 'contact',
                 'reach out', 'hop on a call', 'next step', 'email', 'phone number'],
      reply: "Head to the Contact page, or call +1 (825) 977-2020, or email info@alphasquared.co. It's a free 30-minute intro, no obligation, and you'll get an honest read on scope and timeline usually within two business days."
    }
  ];

  var fallback = "I don't have a confident answer for that one, and I'd rather say so than invent something. " +
    "Try one of these, or put it to a person: " + BOOK + ", or email info@alphasquared.co.";

  /* Offered as chips under the fallback: a miss should still leave the
     visitor with a next move. */
  var suggestions = [
    'What services do you offer?',
    'What does a project cost?',
    'How long does a build take?',
    'Do you build dispatch software?',
    'Who owns the code?',
    'What happens after launch?'
  ];

  /* ── matching ───────────────────────────────────────────────────────────
     Keywords were matched as raw substrings, which is why "do you maintain
     it" scored on 'ai' and "what do you build" scored on 'ui'. Matching on
     word boundaries instead, weighted by phrase length, and anything below
     the confidence floor goes to the fallback rather than to a wrong topic. */
  var MIN_CONFIDENCE = 2;
  var patterns = {};

  function pattern(keyword) {
    if (!patterns[keyword]) {
      var safe = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Trailing plural or possessive still counts as the same word.
      patterns[keyword] = new RegExp('(^|\\s)' + safe + '(s|es|\'s)?(\\s|$)');
    }
    return patterns[keyword];
  }

  function score(text, keyword) {
    var kw = keyword.trim();
    if (!pattern(kw).test(text)) return 0;
    // A phrase is far stronger evidence than a single word. Single words are
    // trustworthy again now that they have to match whole, so one is enough.
    var words = kw.split(' ').length;
    if (words > 2) return 6;
    return words === 2 ? 4 : 2;
  }

  function findAnswer(message) {
    var text = ' ' + message.toLowerCase().replace(/[^a-z0-9&.'\- ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var best = 0;
    var reply = null;

    knowledgeBase.forEach(function (entry) {
      var total = 0;
      entry.keywords.forEach(function (kw) { total += score(text, kw); });
      if (total > best) {
        best = total;
        reply = entry.reply;
      }
    });

    return best >= MIN_CONFIDENCE ? reply : null;
  }

  /* ── transcript ───────────────────────────────────────────────────────
     Conversations are stored so the questions the bot could not answer can
     be turned into copy. The id lives in sessionStorage: one document per
     tab, and nothing that survives the visit. Logging never blocks a reply
     and a failed write is silent by design. */
  var CHAT_KEY = 'a2-chat-session';

  function sessionId() {
    try {
      var id = sessionStorage.getItem(CHAT_KEY);
      if (!id) {
        id = 'c' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem(CHAT_KEY, id);
      }
      return id;
    } catch (e) {
      return null;
    }
  }

  function log(turns) {
    var id = sessionId();
    if (!id || typeof window.fetch !== 'function') return;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ sessionId: id, turns: turns })
    }).catch(function () { /* transcripts are best-effort */ });
  }

  /* ── UI ───────────────────────────────────────────────────────────────── */
  function addMessage(text, sender) {
    var el = document.createElement('div');
    el.className = 'askA2-msg ' + sender;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'askA2-typing';
    el.id = 'askA2-typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('askA2-typing-indicator');
    if (el) el.remove();
  }

  /* Three topics the assistant does answer well, picked at random so a second
     miss does not offer the same three. */
  function addSuggestions() {
    var pool = suggestions.slice();
    var row = document.createElement('div');
    row.className = 'askA2-suggest';

    for (var i = 0; i < 3 && pool.length; i++) {
      var q = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = q;
      btn.addEventListener('click', function (e) {
        row.remove();
        respond(e.currentTarget.textContent);
      });
      row.appendChild(btn);
    }

    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function respond(question) {
    panel.classList.add('is-started');
    addMessage(question, 'user');
    showTyping();

    var match = findAnswer(question);
    var answer = match || fallback;
    log([
      { role: 'user', text: question },
      { role: 'bot', text: answer, answered: !!match }
    ]);

    setTimeout(function () {
      hideTyping();
      addMessage(answer, 'bot');
      if (!match) addSuggestions();
    }, 600 + Math.random() * 350);
  }

  function openPanel() {
    panel.classList.add('open');
    if (badgeDot) badgeDot.style.display = 'none';
  }

  launcher.addEventListener('click', function () {
    var open = panel.classList.toggle('open');
    if (badgeDot) badgeDot.style.display = 'none';
    if (open && input) input.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () { panel.classList.remove('open'); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') panel.classList.remove('open');
  });

  if (quickRow) {
    quickRow.addEventListener('click', function (e) {
      var btn = e.target.closest('.askA2-quick-btn');
      if (btn) respond(btn.getAttribute('data-q'));
    });
  }

  function sendFreeText() {
    var val = input.value.trim();
    if (!val) return;
    respond(val);
    input.value = '';
  }

  if (sendBtn) sendBtn.addEventListener('click', sendFreeText);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendFreeText();
    });
  }

  /* Per-page copy variation. The Contact page opens with booking intent. */
  var greeting = panel.getAttribute('data-greeting');
  if (greeting) {
    var first = body.querySelector('.askA2-msg.bot');
    if (first) first.textContent = greeting;
  }
  if (panel.hasAttribute('data-autoopen')) {
    setTimeout(openPanel, 900);
  }
})();
