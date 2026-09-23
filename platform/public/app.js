// Progressive enhancement only: every page works without this script.
(function () {
  // Show the navigation expanded on wide screens.
  var menus = document.querySelectorAll('.main-nav details.menu, details.side-menu');
  var wide = window.matchMedia('(min-width: 64rem)');
  function sync() { menus.forEach(function (m) { m.open = wide.matches; }); }
  sync();
  wide.addEventListener('change', sync);

  // Move focus to feedback after a submission so screen-reader users hear it.
  if (location.hash === '#feedback') {
    var fb = document.getElementById('feedback');
    if (fb) fb.focus();
  }

  // Optional speech input, only when the institution has enabled it and the
  // browser supports it. Text goes into the field for the student to review.
  var form = document.querySelector('form[data-dictation="on"]');
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!form || !Recognition) return;
  var flag = form.querySelector('input[name="dictation_used"]');
  form.querySelectorAll('textarea[data-dictate]').forEach(function (area) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary small';
    button.textContent = 'Dictate';
    button.setAttribute('aria-label', 'Dictate into ' + (document.querySelector('label[for="' + area.id + '"]') || {}).textContent);
    var status = document.createElement('span');
    status.className = 'small muted';
    status.setAttribute('role', 'status');
    area.insertAdjacentElement('afterend', status);
    area.insertAdjacentElement('afterend', button);
    var rec = null;
    button.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      rec = new Recognition();
      rec.lang = document.documentElement.lang || 'en';
      rec.onresult = function (e) {
        var text = Array.prototype.map.call(e.results, function (r) { return r[0].transcript; }).join(' ');
        area.value = (area.value ? area.value + ' ' : '') + text;
        if (flag) flag.value = '1';
      };
      rec.onend = function () { rec = null; button.textContent = 'Dictate'; status.textContent = 'Dictation stopped. Please review the text.'; };
      rec.onerror = function () { status.textContent = 'Speech input is not available right now.'; };
      rec.start();
      button.textContent = 'Stop dictation';
      status.textContent = 'Listening…';
    });
  });
})();
