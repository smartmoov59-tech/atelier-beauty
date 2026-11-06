/* ==========================================================================
   ATELIER BEAUTY — assistant de demande de rendez-vous
   100 % statique : aucun back-end, aucun service payant.
   Le visiteur choisit soin + créneau + coordonnées, puis envoie la demande
   par le canal de son choix (Messenger, SMS/e-mail si configurés, téléphone)
   ou l'ajoute à son agenda (fichier .ics). Rien n'est stocké ni transmis
   par le site lui-même.
   ========================================================================== */
(function () {
  'use strict';
  var CFG = window.ATELIER; if (!CFG) return;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var hasGsap = !!window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var form = $('#wizard'); if (!form) return;
  var elServices = $('#wServices'), elDays = $('#wDays'), elSlots = $('#wSlots'), elFlex = $('#wFlex');
  var elName = $('#wName'), elTel = $('#wTel'), elMsg = $('#wMsg');
  var elRecap = $('#wRecap'), elSend = $('#wSend'), elOk = $('#wOk'), elErr = $('#wErr');
  var btnBack = $('#wBack'), btnNext = $('#wNext'), bar = $('#wbar');
  var stepsLi = $$('#wsteps li'), steps = $$('.wstep', form);

  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var pad = function (n) { return ('0' + n).slice(-2); };
  var toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  var fmtHM = function (m) { return Math.floor(m / 60) + 'h' + pad(m % 60); };

  /* Date / heure « Paris » indépendamment du fuseau de l'appareil */
  function parisNow() {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }

  var state = { step: 1, services: [], first: '', date: null, time: null, flex: false };
  var now = parisNow();

  /* ---------- Étape 1 : soins ---------- */
  CFG.services.forEach(function (s) {
    var lab = document.createElement('label'); lab.className = 'opt';
    lab.innerHTML = '<input type="checkbox" name="svc" value="' + s.id + '"><span><i><svg><use href="#i-check"/></svg></i><b></b><em></em></span>';
    $('b', lab).textContent = s.name; $('em', lab).textContent = s.price || '';
    elServices.appendChild(lab);
  });
  elServices.addEventListener('change', function (e) {
    var t = e.target;
    /* « conseillez-moi » est exclusif des autres choix */
    if (t.checked) $$('input[name="svc"]', elServices).forEach(function (i) { if (i !== t && (t.value === 'conseil' || i.value === 'conseil')) i.checked = false; });
    state.services = $$('input[name="svc"]:checked', elServices).map(function (i) { return i.value; });
  });
  $$('input[name="first"]', form).forEach(function (r) { r.addEventListener('change', function () { state.first = r.value; }); });

  /* ---------- Étape 2 : jours + créneaux ---------- */
  function dayInfo(offset) {
    var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + offset, 12));
    var dow = dt.getUTCDay(), iso = dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
    return { dt: dt, dow: dow, iso: iso, d: dt.getUTCDate(), mo: dt.getUTCMonth(), y: dt.getUTCFullYear() };
  }
  function slotsFor(info, offset) {
    var h = CFG.hours[info.dow]; if (!h || CFG.closedDates.indexOf(info.iso) > -1) return [];
    var first = Math.max(toMin(CFG.slots.first), toMin(h[0])), last = Math.min(toMin(CFG.slots.last), toMin(h[1]) - 30), out = [];
    var lead = offset === 0 ? now.mins + CFG.minLeadHours * 60 : -1;
    for (var m = first; m <= last; m += CFG.slots.stepMinutes) if (m >= lead) out.push(m);
    return out;
  }
  var dayList = [];
  for (var i = 0; i < CFG.horizonDays; i++) {
    var info = dayInfo(i); info.offset = i; info.slots = slotsFor(info, i); dayList.push(info);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'day'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', 'false');
    b.dataset.iso = info.iso; b.disabled = info.slots.length === 0;
    b.innerHTML = '<small>' + DAYS[info.dow].slice(0, 3) + '.</small><b>' + info.d + '</b><span>' + MONTHS[info.mo].slice(0, 4) + (MONTHS[info.mo].length > 4 ? '.' : '') + '</span>';
    b.setAttribute('aria-label', DAYS[info.dow] + ' ' + info.d + ' ' + MONTHS[info.mo] + (b.disabled ? ' : indisponible' : ''));
    if (b.disabled) b.title = info.dow === 0 ? 'Fermé le dimanche' : 'Indisponible (fermé ou jour férié)';
    elDays.appendChild(b);
  }
  function renderSlots() {
    elSlots.innerHTML = '';
    var info = dayList.filter(function (d) { return d.iso === state.date; })[0];
    if (!info) { elSlots.innerHTML = '<p class="slots__empty">Choisissez d\u2019abord un jour.</p>'; return; }
    info.slots.forEach(function (m) {
      var s = document.createElement('button'); s.type = 'button'; s.className = 'slot'; s.setAttribute('role', 'option');
      s.setAttribute('aria-selected', state.time === m ? 'true' : 'false'); s.dataset.m = m; s.textContent = fmtHM(m);
      elSlots.appendChild(s);
    });
    if (hasGsap && !reduce) gsap.from(elSlots.children, { y: 14, opacity: 0, duration: .5, ease: 'power3.out', stagger: .025 });
  }
  elDays.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b || b.disabled) return;
    state.date = b.dataset.iso; state.time = null;
    $$('.day', elDays).forEach(function (d) { d.setAttribute('aria-selected', d === b ? 'true' : 'false'); });
    renderSlots();
  });
  elSlots.addEventListener('click', function (e) {
    var s = e.target.closest('.slot'); if (!s || s.disabled) return;
    state.time = +s.dataset.m;
    $$('.slot', elSlots).forEach(function (x) { x.setAttribute('aria-selected', x === s ? 'true' : 'false'); });
  });
  elFlex.addEventListener('change', function () { state.flex = elFlex.checked; });
  renderSlots();

  /* ---------- Validation ---------- */
  function telOk(v) { var d = v.replace(/[\s.\-()]/g, ''); return /^(\+|00)?\d{9,14}$/.test(d); }
  function showErr(msg, el) {
    elErr.textContent = msg;
    if (el) { el.classList.add('is-bad'); el.focus(); }
    if (hasGsap && !reduce) gsap.fromTo(elErr, { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1,.4)' });
  }
  function validate(step) {
    elErr.textContent = ''; elName.classList.remove('is-bad'); elTel.classList.remove('is-bad');
    if (step === 1 && !state.services.length) { showErr('Choisissez au moins un soin pour continuer.'); return false; }
    if (step === 2) {
      if (!state.date) { showErr('Choisissez un jour.'); return false; }
      if (state.time == null) { showErr('Choisissez une heure de début souhaitée.'); return false; }
    }
    if (step === 3) {
      if (elName.value.trim().length < 2) { showErr('Indiquez votre prénom.', elName); return false; }
      if (!telOk(elTel.value)) { showErr('Indiquez un numéro de téléphone valide (par exemple 06 12 34 56 78).', elTel); return false; }
    }
    return true;
  }

  /* ---------- Construction du message ---------- */
  function serviceNames() {
    return state.services.map(function (id) { return CFG.services.filter(function (s) { return s.id === id; })[0].name; });
  }
  function dateLabel() {
    var i = dayList.filter(function (d) { return d.iso === state.date; })[0];
    return DAYS[i.dow] + ' ' + i.d + ' ' + MONTHS[i.mo];
  }
  function buildMessage() {
    var lines = [
      'Bonjour Atelier Beauty,',
      'je souhaiterais prendre rendez-vous :',
      '• Soin : ' + serviceNames().join(', '),
      '• Créneau souhaité : ' + dateLabel() + ' à ' + fmtHM(state.time) + (state.flex ? ' (je suis flexible, un jour avant ou après)' : ''),
    ];
    if (state.first) lines.push('• Première visite : ' + (state.first === 'oui' ? 'oui' : 'non, déjà cliente'));
    lines.push('• Prénom : ' + elName.value.trim(), '• Téléphone : ' + elTel.value.trim());
    if (elMsg.value.trim()) lines.push('• Message : ' + elMsg.value.trim());
    lines.push('Merci de me confirmer le créneau. À bientôt !');
    return lines.join('\n');
  }

  /* ---------- Fichier agenda (.ics) ---------- */
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function downloadIcs() {
    var i = dayList.filter(function (d) { return d.iso === state.date; })[0];
    var dur = state.services.reduce(function (a, id) { return a + (CFG.services.filter(function (s) { return s.id === id; })[0].durationMin || 60); }, 0) || 60;
    var s0 = state.time, e0 = s0 + dur;
    var base = i.y + pad(i.mo + 1) + pad(i.d);
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var a = CFG.address;
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier Beauty//Demande de rendez-vous//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@atelier-beauty.local',
      'DTSTAMP:' + stamp,
      'DTSTART:' + base + 'T' + pad(Math.floor(s0 / 60)) + pad(s0 % 60) + '00',
      'DTEND:' + base + 'T' + pad(Math.floor(Math.min(e0, 1439) / 60)) + pad(Math.min(e0, 1439) % 60) + '00',
      'SUMMARY:' + icsEscape('Atelier Beauty (RDV à confirmer) : ' + serviceNames().join(', ')),
      'LOCATION:' + icsEscape(a.street + ', ' + a.zip + ' ' + a.city),
      'DESCRIPTION:' + icsEscape('Demande de rendez-vous à confirmer par le salon. Téléphone : ' + CFG.phone + '. Durée indicative.'),
      'STATUS:TENTATIVE',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous Atelier Beauty', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'rdv-atelier-beauty.ics'; document.body.appendChild(link); link.click();
    setTimeout(function () { URL.revokeObjectURL(url); link.remove(); }, 1000);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } ta.remove();
    });
  }
  function ok(msg) {
    elOk.hidden = false; $('span', elOk).textContent = msg;
    if (hasGsap && !reduce) gsap.fromTo(elOk, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'expo.out' });
  }

  /* ---------- Étape 4 : récapitulatif + canaux d'envoi ---------- */
  function renderStep4() {
    var msg = buildMessage();
    elRecap.innerHTML = '';
    [['Soin', serviceNames().join(' · ')], ['Créneau souhaité', dateLabel() + ' à ' + fmtHM(state.time) + (state.flex ? ' (flexible)' : '')], ['Contact', elName.value.trim() + ' · ' + elTel.value.trim()]]
      .forEach(function (r) { var d = document.createElement('div'); d.innerHTML = '<span></span><b></b>'; d.children[0].textContent = r[0]; d.children[1].textContent = r[1]; elRecap.appendChild(d); });

    elSend.innerHTML = ''; elOk.hidden = true;
    function btn(kind, icon, label, main) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sbtn' + (main ? ' sbtn--main' : ''); b.dataset.send = kind;
      b.innerHTML = '<svg><use href="#i-' + icon + '"/></svg><span></span>'; $('span', b).textContent = label; elSend.appendChild(b); return b;
    }
    function link(href, icon, label, main, ext) {
      var a = document.createElement('a'); a.className = 'sbtn' + (main ? ' sbtn--main' : ''); a.href = href;
      if (ext) { a.target = '_blank'; a.rel = 'noopener'; }
      a.innerHTML = '<svg><use href="#i-' + icon + '"/></svg><span></span>'; $('span', a).textContent = label; elSend.appendChild(a); return a;
    }
    var main = true;
    if (CFG.sms) { link('sms:' + CFG.sms + '?&body=' + encodeURIComponent(msg), 'msg', 'Envoyer par SMS', main).addEventListener('click', function () { ok('Votre application SMS s\u2019ouvre avec le message prêt à envoyer.'); }); main = false; }
    if (CFG.messenger) { btn('messenger', 'msg', 'Envoyer sur Messenger', main); main = false; }
    if (CFG.email) { link('mailto:' + CFG.email + '?subject=' + encodeURIComponent('Demande de rendez-vous : ' + serviceNames().join(', ')) + '&body=' + encodeURIComponent(msg), 'mail', 'Envoyer par e-mail', main).addEventListener('click', function () { ok('Votre messagerie s\u2019ouvre avec la demande prête à envoyer.'); }); main = false; }
    link('tel:' + CFG.phoneTel, 'phone', 'Appeler le ' + CFG.phone, main).addEventListener('click', function () { ok('Appel en cours : annoncez simplement votre demande de rendez-vous.'); });
    btn('ics', 'cal', 'Ajouter à mon agenda');
    btn('copy', 'copy', 'Copier le message');

    elSend.onclick = function (e) {
      var b = e.target.closest('[data-send]'); if (!b) return;
      var kind = b.dataset.send, text = buildMessage();
      if (kind === 'ics') { downloadIcs(); ok('Fichier agenda téléchargé : ouvrez-le pour ajouter le rendez-vous (à confirmer par le salon).'); }
      if (kind === 'copy') { copyText(text).then(function () { ok('Message copié : collez-le où vous voulez (SMS, mail, Messenger…).'); }, function () { ok('Copie impossible ici : sélectionnez le message ci-dessus à la main.'); }); }
      if (kind === 'messenger') {
        copyText(text).then(function () { ok('Message copié ! Collez-le dans la conversation Messenger qui vient de s\u2019ouvrir, puis envoyez.'); }, function () { ok('Messenger s\u2019ouvre : recopiez votre demande (bouton « Copier le message »).'); });
        window.open(CFG.messenger, '_blank', 'noopener');
      }
    };
  }

  /* ---------- Navigation entre étapes ---------- */
  function setStep(n, dir) {
    var prev = steps.filter(function (s) { return s.classList.contains('is-active'); })[0];
    var next = steps[n - 1]; state.step = n;
    if (n === 4) renderStep4();
    function show() {
      steps.forEach(function (s) { s.classList.toggle('is-active', s === next); });
      if (hasGsap && !reduce) gsap.fromTo(next, { x: 34 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: 'expo.out', clearProps: 'transform' });
      var focusEl = $('legend,h3', next); if (focusEl) { focusEl.tabIndex = -1; focusEl.focus({ preventScroll: true }); }
    }
    if (prev && prev !== next && hasGsap && !reduce) gsap.to(prev, { x: -30 * dir, opacity: 0, duration: .25, ease: 'power2.in', onComplete: function () { gsap.set(prev, { clearProps: 'all' }); show(); } });
    else show();
    stepsLi.forEach(function (li, i) { li.classList.toggle('is-active', i === n - 1); li.classList.toggle('is-done', i < n - 1); });
    bar.style.transform = 'scaleX(' + (n / 4) + ')';
    btnBack.hidden = n === 1; btnNext.hidden = n === 4;
    btnNext.firstChild.nodeValue = n === 3 ? 'Voir le récapitulatif ' : 'Continuer ';
    elErr.textContent = '';
  }
  btnNext.addEventListener('click', function () { if (validate(state.step)) setStep(state.step + 1, 1); });
  btnBack.addEventListener('click', function () { if (state.step > 1) setStep(state.step - 1, -1); });
  form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio' && e.target.type !== 'checkbox' && state.step < 4) { e.preventDefault(); btnNext.click(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  [elName, elTel].forEach(function (i) { i.addEventListener('input', function () { i.classList.remove('is-bad'); elErr.textContent = ''; }); });
  bar.style.transform = 'scaleX(.25)';

  /* ---------- Boutons « Réserver ce soin » des cartes ---------- */
  $$('[data-book]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.book;
      $$('input[name="svc"]', elServices).forEach(function (i) { i.checked = i.value === id; });
      state.services = [id];
      if (state.step !== 1) setStep(1, -1);
      var t = $('#reservation');
      if (window.AB && AB.scrollTo) AB.scrollTo(t); else t.scrollIntoView({ behavior: 'smooth' });
      if (hasGsap && !reduce) gsap.fromTo($('input[value="' + id + '"]', elServices).nextElementSibling, { scale: .97 }, { scale: 1, duration: 1.2, ease: 'elastic.out(1,.4)', delay: .9 });
    });
  });
})();
