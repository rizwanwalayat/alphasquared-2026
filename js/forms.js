/* ==========================================================================
   Alpha Squared — form submission

   The markup keeps its Netlify Forms attributes, so a visitor with no
   JavaScript still gets a working form. When JS is on, the submit is
   intercepted and posted to /api/lead instead, which writes to MongoDB and
   confirms in place rather than bouncing the page.

   If the endpoint is unreachable the native submit is allowed through, so a
   cold database never costs a lead.
   ========================================================================== */

(function () {
  'use strict';

  var forms = document.querySelectorAll('form[data-lead]');
  if (!forms.length || typeof window.fetch !== 'function') return;

  function collect(form) {
    var data = { interest: [] };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') {
        if (el.checked) data.interest.push(el.value);
      } else if (el.type !== 'submit' && el.type !== 'button') {
        data[el.name] = el.value;
      }
    });
    data.source = form.getAttribute('data-lead');
    return data;
  }

  function confirmation(form) {
    var box = document.createElement('div');
    box.className = 'form__done';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<b>That\'s in.</b>' +
      '<p>You get a reply from a person, not an autoresponder. ' +
      'If it is urgent, call <a href="tel:+18259772020">+1 (825) 977-2020</a>.</p>';
    form.replaceWith(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function fail(form, message) {
    var note = form.querySelector('.form__error') || document.createElement('p');
    note.className = 'form__error';
    note.setAttribute('role', 'alert');
    note.textContent = message;
    var submit = form.querySelector('.form__submit');
    if (submit) submit.insertAdjacentElement('beforebegin', note);
    else form.appendChild(note);
  }

  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) return;
      e.preventDefault();

      var submit = form.querySelector('.form__submit');
      var stale = form.querySelector('.form__error');
      if (stale) stale.remove();
      if (submit) {
        submit.disabled = true;
        submit.classList.add('is-busy');
      }

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collect(form))
      })
        .then(function (res) {
          return res.json().then(function (payload) { return { res: res, payload: payload }; });
        })
        .then(function (r) {
          if (r.res.ok && r.payload.ok) {
            confirmation(form);
            return;
          }
          // 4xx is our own validation talking; surface it rather than retrying.
          if (r.res.status >= 400 && r.res.status < 500) {
            fail(form, r.payload.error || 'Please check the fields and try again.');
            if (submit) { submit.disabled = false; submit.classList.remove('is-busy'); }
            return;
          }
          throw new Error('server');
        })
        .catch(function () {
          // Endpoint down: hand the submit back to Netlify Forms.
          form.submit();
        });
    });
  });
})();
