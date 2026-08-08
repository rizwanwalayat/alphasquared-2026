(function(){
  var launcher = document.getElementById('askA2-launcher');
  var panel = document.getElementById('askA2-panel');
  var closeBtn = document.getElementById('askA2-close');
  var body = document.getElementById('askA2-body');
  var input = document.getElementById('askA2-input');
  var sendBtn = document.getElementById('askA2-send');
  var badgeDot = document.getElementById('askA2-badge-dot');
  var quickRow = document.getElementById('askA2-quick-row');

  if(!launcher || !panel) return;

  launcher.addEventListener('click', function(){
    panel.classList.toggle('open');
    if(badgeDot) badgeDot.style.display = 'none';
    if(panel.classList.contains('open') && input) input.focus();
  });
  if(closeBtn){
    closeBtn.addEventListener('click', function(){ panel.classList.remove('open'); });
  }

  /* TODO: replace this canned answers object with a real API call once 
     the backend is ready — see integration notes in README-chatbot.md */
  var answers = {
    "what services do you offer?": "We build operations platforms, mobile apps, AI & automation, product/UX design, dedicated teams, and cloud/DevOps support — everything from first sketch to production.",
    "tell me about your ai automation work": "We've shipped voice agents that answer real calls and book jobs with no human in the loop, OCR microservices for document processing, and agentic assistants wired into live CRMs and industrial data platforms.",
    "how do i book a call?": "Easiest way — hit the \"Book a call\" button in the top nav, or I can take your email right here and someone will reach out within two business days.",
    "what industries do you work with?": "Mostly trucking & transport, energy & industrial, and increasingly AI-driven operations tooling — though we've also shipped fintech, healthcare, and real estate platforms."
  };
  var fallback = "Good question — I'd rather get you a precise answer than guess. Want me to connect you with our team? You can book a quick call and they'll walk you through it.";

  function lookup(key){
    // Own keys only — otherwise asking "constructor" returns Object.prototype's.
    return Object.prototype.hasOwnProperty.call(answers, key) ? answers[key] : fallback;
  }

  function addMessage(text, sender){
    var el = document.createElement('div');
    el.className = 'askA2-msg ' + sender;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping(){
    var el = document.createElement('div');
    el.className = 'askA2-typing';
    el.id = 'askA2-typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping(){
    var el = document.getElementById('askA2-typing-indicator');
    if(el) el.remove();
  }

  function respond(question){
    addMessage(question, 'user');
    showTyping();
    setTimeout(function(){
      hideTyping();
      addMessage(lookup(question.trim().toLowerCase()), 'bot');
    }, 900 + Math.random()*500);
  }

  if(quickRow){
    quickRow.addEventListener('click', function(e){
      var btn = e.target.closest('.askA2-quick-btn');
      if(!btn) return;
      respond(btn.getAttribute('data-q'));
    });
  }

  function sendFreeText(){
    var val = input.value.trim();
    if(!val) return;
    respond(val);
    input.value = '';
  }
  if(sendBtn) sendBtn.addEventListener('click', sendFreeText);
  if(input){
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter') sendFreeText();
    });
  }
})();
