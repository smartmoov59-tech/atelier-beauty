/* ==========================================================================
   ATELIER BEAUTY — mouvement & interactions
   GSAP + ScrollTrigger + Lenis (smooth scroll), tout en local (aucun CDN).
   Règles : courbes douces (expo / power3), transform + opacity en priorité,
   version allégée sur mobile et si prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';
  var CFG = window.ATELIER || {};

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Sécurité : sans GSAP, le site reste lisible (contenu statique) */
  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.className = document.documentElement.className.replace('js', '');
    var l0 = $('.loader'); if (l0) l0.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (reduce) document.documentElement.classList.add('rm');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- Utilitaires partagés (utilisés aussi par booking.js) ---------- */
  var AB = window.AB = {};
  AB.parisNow = function (d) {
    d = d || new Date();
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var hh = parseInt(o.hour, 10) % 24;
    return {
      dow: map[o.weekday], hh: hh, mm: parseInt(o.minute, 10),
      mins: hh * 60 + parseInt(o.minute, 10),
      iso: o.year + '-' + o.month + '-' + o.day,
      y: +o.year, m: +o.month, d: +o.day
    };
  };
  AB.toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  AB.fmtHM = function (mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return h + 'h' + (m ? ('0' + m).slice(-2) : '00');
  };
  AB.pad = function (n) { return ('0' + n).slice(-2); };

  /* Génère un petit PRNG déterministe (rendu identique à chaque visite) */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- Éventail de cils (SVG généré) : le fil rouge ---------- */
  function buildFan(svg, o) {
    o = o || {};
    var n = o.n || 17, from = o.from == null ? -78 : o.from, to = o.to == null ? 62 : o.to;
    var vb = svg.viewBox.baseVal, W = vb.width, H = vb.height, rnd = mulberry(o.seed || 3);
    var x0 = W * (o.ox == null ? .5 : o.ox), y0 = H * (o.oy == null ? .98 : o.oy), out = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var ang = (from + (to - from) * t) * Math.PI / 180 + (rnd() - .5) * .05;
      var len = H * .95 * ((o.min || .5) + ((o.max || 1) - (o.min || .5)) * Math.pow(Math.sin(Math.PI * (.12 + .76 * t)), .9)) * (.9 + rnd() * .12);
      var bend = .15 + rnd() * .1;
      var x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
      var cx = x0 + Math.sin(ang) * len * .55 + Math.cos(ang) * len * bend;
      var cy = y0 - Math.cos(ang) * len * .55 + Math.sin(ang) * len * bend;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1));
      p.setAttribute('stroke-width', (1 + rnd() * 1.7).toFixed(2));
      p.setAttribute('opacity', (.55 + rnd() * .45).toFixed(2));
      svg.appendChild(p);
      if (o.draw) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; }
      out.push(p);
    }
    return out;
  }

  /* ---------- Œil du loader : paupière + cils dessinés ---------- */
  function buildEye(svg) {
    var P0 = [30, 128], P1 = [105, 14], P2 = [295, 14], P3 = [370, 128];
    function bez(t) { var u = 1 - t; return [
      u*u*u*P0[0] + 3*u*u*t*P1[0] + 3*u*t*t*P2[0] + t*t*t*P3[0],
      u*u*u*P0[1] + 3*u*u*t*P1[1] + 3*u*t*t*P2[1] + t*t*t*P3[1]]; }
    function der(t) { var u = 1 - t; return [
      3*u*u*(P1[0]-P0[0]) + 6*u*t*(P2[0]-P1[0]) + 3*t*t*(P3[0]-P2[0]),
      3*u*u*(P1[1]-P0[1]) + 6*u*t*(P2[1]-P1[1]) + 3*t*t*(P3[1]-P2[1])]; }
    function mk(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
    var lids = [
      mk('path', { d: 'M30 128C105 14 295 14 370 128', 'stroke-width': 2.4 }),
      mk('path', { d: 'M30 128C115 206 285 206 370 128', 'stroke-width': 1.4, opacity: .55 })
    ];
    var iris = mk('circle', { cx: 200, cy: 112, r: 34, 'stroke-width': 1.4, opacity: .85 });
    var pupil = mk('circle', { cx: 200, cy: 112, r: 12, fill: 'currentColor', stroke: 'none' });
    var lashes = [], N = 26;
    for (var i = 0; i < N; i++) {
      var t = .04 + .92 * i / (N - 1), pt = bez(t), d = der(t), l = Math.hypot(d[0], d[1]);
      var nx = d[1] / l, ny = -d[0] / l;
      var a = Math.atan2(ny, nx) + (t - .5) * .55;
      var dx = Math.cos(a), dy = Math.sin(a);
      var len = 16 + 34 * Math.pow(Math.sin(Math.PI * t), .7) + 14 * t;
      var ex = pt[0] + dx * len, ey = pt[1] + dy * len;
      var cx = pt[0] + dx * len * .55 - dy * len * .2, cy = pt[1] + dy * len * .55 + dx * len * .2;
      lashes.push(mk('path', { d: 'M' + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1) + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1), 'stroke-width': 1.8 }));
    }
    var all = lids.concat(lashes);
    all.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    iris.style.opacity = 0; pupil.style.opacity = 0;
    return { lids: lids, lashes: lashes, iris: iris, pupil: pupil, all: all };
  }

  /* ---------- Découpe de texte (lettres / mots) pour les titres animés ---------- */
  function splitText(el, mode) {
    if (el._split) return el._split;
    var out = [], host = el.closest('h1,h2,h3');
    if (host && !host.getAttribute('aria-label')) host.setAttribute('aria-label', host.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; if (host) w.setAttribute('aria-hidden', 'true');
            if (mode === 'chars') {
              Array.prototype.forEach.call(part, function (ch) { var c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c); out.push(c); });
            } else { var c2 = document.createElement('span'); c2.className = 'c'; c2.textContent = part; w.appendChild(c2); out.push(c2); }
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') { walk(child); }
      });
    })(el);
    el._split = out;
    return out;
  }

  /* ======================================================================
     SMOOTH SCROLL (Lenis)
     ====================================================================== */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .085, wheelMultiplier: .95, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // bloqué pendant le loader
  }
  function scrollToEl(t, off) {
    if (lenis) lenis.scrollTo(t, { offset: off || 0, duration: 1.6, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  AB.scrollTo = scrollToEl;

  /* ======================================================================
     TITRES : découpe initiale (états de départ posés avant le 1er rendu)
     ====================================================================== */
  var heroChars = [];
  if (!reduce) {
    $$('[data-split]').forEach(function (el) {
      var ch = splitText(el, el.dataset.split === 'chars' ? 'chars' : 'words');
      gsap.set(ch, { yPercent: 118 });
      if (el.closest('.hero')) heroChars = heroChars.concat(ch);
    });
  }

  /* Connexion lente ou économie de données : on garde la photo (poster) au lieu de la vidéo du hero */
  var conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || ''))) {
    var hv0 = $('.hero__video');
    if (hv0) { hv0.pause(); hv0.removeAttribute('autoplay'); hv0.setAttribute('preload', 'none'); while (hv0.firstChild) hv0.removeChild(hv0.firstChild); hv0.removeAttribute('src'); hv0.load(); }
  }

  /* Fans de cils (décor) */
  var heroFan = $('[data-fan="hero"]'), heroFanPaths = [];
  if (heroFan) heroFanPaths = buildFan(heroFan, { n: 19, from: -80, to: 55, seed: 7, draw: !reduce, ox: .55 });
  var statsFan = $('[data-fan="stats"]');
  if (statsFan) buildFan(statsFan, { n: 31, from: -85, to: 85, seed: 11, min: .35, max: 1, ox: .5, oy: .99 });

  /* ======================================================================
     LOADER → INTRO
     ====================================================================== */
  var introDone = false;
  function heroIntro() {
    if (introDone) return; introDone = true;
    if (reduce) { if (lenis) lenis.start(); return; }
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero__video', { scale: 1.38 }, { scale: 1, duration: 2.8, ease: 'power3.out' }, 0)
      .to(heroChars, { yPercent: 0, duration: 1.5, stagger: .045 }, .1)
      .fromTo('.hero__eyebrow', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, .45)
      .fromTo('.hero__lead', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1 }, .65)
      .fromTo('.hero__cta .btn', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, stagger: .1 }, .8)
      .fromTo('.hero__badge', { scale: 0, rotation: -70 }, { scale: 1, rotation: 0, duration: 1.4, ease: 'back.out(1.5)' }, .95)
      .fromTo('.hero__ghost', { opacity: 0, xPercent: 6 }, { opacity: 1, xPercent: 0, duration: 2.2 }, .3)
      .fromTo('.nav', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1.1 }, .6)
      .fromTo(heroFanPaths, { strokeDashoffset: function (i, t) { return t.getTotalLength(); } }, { strokeDashoffset: 0, duration: 2.2, stagger: .045, ease: 'power3.out' }, .5)
      .add(function () { if (lenis) lenis.start(); ScrollTrigger.refresh(); }, 1.2);
  }

  function runLoader() {
    var loader = $('.loader');
    if (!loader) { heroIntro(); return; }
    if (reduce) { loader.remove(); heroIntro(); return; }

    var svg = $('.loader__eye'), eye = buildEye(svg);
    var num = $('#loadNum'), name = $('.loader__name'), cnt = $('.loader__count');
    var hole = $('#lhole');
    gsap.set(name, { opacity: 0, y: 16 }); gsap.set(cnt, { opacity: 0 });

    var state = { p: 0 };
    var ready = Promise.race([
      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise(function (r) { var v = $('.hero__video'); if (!v || v.readyState >= 3) r(); else v.addEventListener('canplay', r, { once: true }); })
      ]),
      new Promise(function (r) { setTimeout(r, 2800); })   // filet de sécurité : le loader ne dépasse jamais ~5 s
    ]);

    var draw = gsap.timeline();
    draw.to(eye.lids, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: .15 }, 0)
        .to(eye.lashes, { strokeDashoffset: 0, duration: .9, ease: 'power2.out', stagger: { each: .035, from: 'center' } }, .45)
        .to([eye.iris, eye.pupil], { opacity: 1, duration: .8 }, .9)
        .to(name, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, .7)
        .to(cnt, { opacity: 1, duration: .6 }, .7);
    var count = gsap.to(state, { p: 100, duration: 2, ease: 'power1.inOut', onUpdate: function () { num.textContent = Math.round(state.p); } });

    var countDone = new Promise(function (r) { count.eventCallback('onComplete', r); });
    Promise.all([countDone, ready]).then(function () {
      var W = window.innerWidth, H = window.innerHeight;
      var r = svg.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .62;
      var o = { w: r.width * .42, h: r.height * .06 };
      function lens() { hole.setAttribute('d', 'M' + (cx - o.w) + ' ' + cy + 'Q' + cx + ' ' + (cy - 2 * o.h) + ' ' + (cx + o.w) + ' ' + cy + 'Q' + cx + ' ' + (cy + 2 * o.h) + ' ' + (cx - o.w) + ' ' + cy + 'Z'); }
      lens();
      var open = gsap.timeline({ onComplete: function () { loader.remove(); } });
      open.to('.loader__center', { opacity: 0, scale: 1.18, duration: .7, ease: 'power2.in' }, 0)
          .to(o, { w: W * 1.7, h: H * 1.45, duration: 1.7, ease: 'expo.inOut', onUpdate: lens }, .1)
          .add(heroIntro, .55);
    });
  }

  /* ======================================================================
     NAVIGATION, MENU, BARRE DE PROGRESSION, BOUTONS FLOTTANTS
     ====================================================================== */
  var nav = $('#nav'), menu = $('#menu'), burger = $('#burger'), fab = $('#fab'), menuOpen = false;

  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      nav.classList.toggle('is-solid', y > 90);
      if (!menuOpen) {
        if (y > 500 && self.direction === 1) nav.classList.add('is-hidden');
        else if (self.direction === -1 || y <= 500) nav.classList.remove('is-hidden');
      }
      if (fab) fab.classList.toggle('is-on', y > window.innerHeight * .7);
    }
  });
  gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });
  /* Les boutons flottants s'effacent quand le formulaire de réservation est à l'écran */
  ScrollTrigger.create({ trigger: '#reservation', start: 'top 80%', end: 'bottom 20%', onToggle: function (s) { if (fab) fab.classList.toggle('is-off', s.isActive); } });

  function openMenu() {
    if (menuOpen) return; menuOpen = true;
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu');
    menu.setAttribute('aria-hidden', 'false'); nav.classList.add('menu-open'); nav.classList.remove('is-hidden');
    menu.style.visibility = 'visible'; menu.classList.add('is-open');
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    var R = Math.hypot(window.innerWidth, window.innerHeight) * 1.1;
    gsap.to(menu, { clipPath: 'circle(' + R + 'px at calc(100% - 44px) 44px)', duration: .95, ease: 'power3.inOut' });
    gsap.fromTo('.menu nav a span', { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: .06, delay: .3 });
    gsap.fromTo('.menu__foot', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, delay: .7 });
  }
  function closeMenu() {
    if (!menuOpen) return; menuOpen = false;
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', 'true'); nav.classList.remove('menu-open');
    gsap.to(menu, { clipPath: 'circle(0px at calc(100% - 44px) 44px)', duration: .75, ease: 'power3.inOut', onComplete: function () { menu.style.visibility = 'hidden'; menu.classList.remove('is-open'); } });
    if (lenis) lenis.start(); else document.body.style.overflow = '';
  }
  if (burger) burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* Ancres internes en défilement fluide */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (!id || id.length < 2) return;
      var t = $(id); if (!t) return;
      e.preventDefault();
      var wasOpen = menuOpen; closeMenu();
      setTimeout(function () { scrollToEl(t); }, wasOpen ? 450 : 0);
      history.replaceState(null, '', id);
    });
  });
  var totop = $('#totop'); if (totop) totop.addEventListener('click', function () { scrollToEl($('#top')); });

  /* ======================================================================
     RÉVÉLATIONS GÉNÉRIQUES (titres + fondus)
     ====================================================================== */
  if (!reduce) {
    $$('[data-split]').forEach(function (el) {
      if (el.closest('.hero')) return;
      var ch = el._split || [];
      ScrollTrigger.create({
        trigger: el, start: el.closest('.footer') ? 'top 98%' : 'top 88%', once: true,
        onEnter: function () { gsap.to(ch, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: el.dataset.split === 'chars' ? .03 : .06 }); }
      });
    });
    $$('[data-fade]').forEach(function (el) {
      gsap.from(el, { y: 38, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ======================================================================
     HERO : parallax multicouche
     ====================================================================== */
  if (!reduce) {
    var hp = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    hp.to('[data-hero-media]', { yPercent: 18, scale: 1.14 }, 0)       // fond (lent)
      .to('.hero__ghost', { xPercent: -14 }, 0)                         // plan intermédiaire
      .to('.hero__content', { yPercent: -16, opacity: .05 }, 0)         // texte
      .to('.hero__fan', { yPercent: -26, rotation: -6, transformOrigin: '55% 100%' }, 0) // premier plan (rapide)
      .to('.hero__badge', { yPercent: -60 }, 0);
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onToggle: function (s) { var v = $('.hero__video'); if (!v) return; s.isActive ? v.play().catch(function () {}) : v.pause(); } });

    if (fine) {
      var gx = gsap.quickTo('.hero__fan', 'x', { duration: 1.2, ease: 'power3' }), gy = gsap.quickTo('.hero__ghost', 'y', { duration: 1.4, ease: 'power3' });
      window.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - .5, ny = e.clientY / window.innerHeight - .5;
        gx(nx * -40); gy(ny * 30);
      });
    }
  } else {
    var hv = $('.hero__video'); if (hv) { hv.pause(); hv.removeAttribute('autoplay'); }
  }

  /* ======================================================================
     MARQUEE : vitesse + sens réagissent au scroll
     ====================================================================== */
  if (!reduce) {
    var rail = $$('[data-marquee]').map(function (r) {
      var track = $('.marquee__track', r), group = $('.marquee__group', track);
      var w = group.offsetWidth;
      var copies = Math.max(2, Math.ceil((window.innerWidth * 1.3) / Math.max(w, 1)) + 1);
      for (var i = 0; i < copies; i++) { var c = group.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
      return { track: track, w: w, x: 0, dir: parseFloat(r.dataset.marquee) };
    });
    var lastY = window.scrollY, mul = 1, vel = 0;
    window.addEventListener('resize', function () { rail.forEach(function (r) { r.w = $('.marquee__group', r.track).offsetWidth; }); });
    gsap.ticker.add(function (time, dt) {
      var y = window.scrollY, dy = y - lastY; lastY = y;
      vel += (dy - vel) * .12;
      if (Math.abs(vel) > .4) mul += ((vel > 0 ? 1 : -1) - mul) * .06;
      var boost = Math.min(Math.abs(vel), 60) * 9;
      rail.forEach(function (r) {
        r.x += r.dir * (70 + boost) * mul * (dt / 1000);
        if (r.x <= -r.w) r.x += r.w; if (r.x >= 0) r.x -= r.w;
        r.track.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0)';
      });
    });
  }

  /* ======================================================================
     MANIFESTE : le texte se remplit au scroll
     ====================================================================== */
  var mf = $('[data-fill]');
  if (mf) {
    var words = [];
    (function () {
      var txt = mf.textContent.trim(); mf.textContent = '';
      txt.split(/\s+/).forEach(function (w, i, arr) {
        var s = document.createElement('span'); s.className = 'fw'; s.textContent = w; mf.appendChild(s); words.push(s);
        if (i < arr.length - 1) mf.appendChild(document.createTextNode(' '));
      });
    })();
    if (!reduce) gsap.to(words, { opacity: 1, ease: 'none', stagger: .12, scrollTrigger: { trigger: mf, start: 'top 82%', end: 'bottom 52%', scrub: .4 } });
    else words.forEach(function (s) { s.style.opacity = 1; });
    var ml = $('.manifest__lash');
    if (ml && !reduce) gsap.fromTo(ml, { rotation: -14, y: 40 }, { rotation: 10, y: -60, ease: 'none', scrollTrigger: { trigger: '.manifest', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ======================================================================
     SECTIONS PILOTÉES PAR matchMedia (bureau = épinglé ; mobile = pile native)
     ====================================================================== */
  var mm = gsap.matchMedia();
  if (!reduce) {
    /* --- L'ATELIER : storytelling épinglé (4 étapes) --- */
    mm.add('(min-width: 821px)', function () {
      var steps = $$('.st'), figs = $$('.sf'), bgs = $$('.sb'), lis = $$('.story__progress li'), bar = $('.story__bar i');
      var imgs = figs.map(function (f) { return $('img', f); });
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '.story', start: 'top top', end: function () { return '+=' + window.innerHeight * 3.8; },
          pin: '.story__pin', scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (self) {
            var idx = Math.min(3, Math.round(self.progress * 3));
            lis.forEach(function (li, i) { li.classList.toggle('is-on', i === idx); });
          }
        }
      });
      gsap.set(imgs[0], { scale: 1.14 });
      tl.to(imgs[0], { scale: 1.02, duration: 1 }, 0);
      for (var i = 1; i < 4; i++) {
        (function (i) {
          var at = .5 + (i - 1) * 1.1;
          tl.to(steps[i - 1], { opacity: 0, y: -44, duration: .4 }, at)
            .fromTo(steps[i], { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: .5 }, at + .3)
            .fromTo(figs[i], { clipPath: 'ellipse(0% 0% at 50% 50%)' }, { clipPath: 'ellipse(76% 76% at 50% 50%)', duration: .7 }, at)
            .fromTo(imgs[i], { scale: 1.32 }, { scale: 1.06, duration: 1.1 }, at)
            .to(bgs[i], { opacity: 1, duration: .7 }, at)
            .to(bar, { scaleX: (i + 1) / 4, duration: .7 }, at);
        })(i);
      }
      tl.to({}, { duration: .55 });
    });

    /* --- SOINS : défilement horizontal piloté par le scroll vertical --- */
    mm.add('(min-width: 821px)', function () {
      var track = $('.services__track');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var h = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: '.services', start: 'top top', end: function () { return '+=' + dist(); }, pin: '.services__pin', scrub: .7, anticipatePin: 1, invalidateOnRefresh: true }
      });
      $$('.card', track).forEach(function (card) {
        gsap.fromTo($('img', card), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
        gsap.from(card, { y: 80, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left 92%', toggleActions: 'play none none none' } });
      });
    });

    /* --- Mobile : simples apparitions --- */
    mm.add('(max-width: 820px)', function () {
      $$('.st').forEach(function (s) { gsap.from(s, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%', once: true } }); });
      $$('.card').forEach(function (c) { gsap.from(c, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 95%', once: true } }); });
    });
  }

  /* ======================================================================
     CHIFFRES : compteurs + étoiles
     ====================================================================== */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), o = { v: 0 };
    var fmt = function (v) { return v.toFixed(dec).replace('.', ','); };
    if (reduce) { el.textContent = fmt(end); return; }
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function () { gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v); } }); }
    });
  });
  if (!reduce) {
    gsap.from('.stats .stars svg', { scale: 0, rotation: -120, duration: 1, ease: 'back.out(2.2)', stagger: .12, scrollTrigger: { trigger: '.stats .stars', start: 'top 90%', once: true } });
    gsap.from('.stat', { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.stats__grid', start: 'top 85%', once: true } });
    if (statsFan) {
      gsap.set(statsFan, { xPercent: -50, transformOrigin: '50% 100%' });
      gsap.fromTo(statsFan, { rotation: -14 }, { rotation: 14, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  /* ======================================================================
     VIDÉO EN CERCLE : masque qui s'agrandit, piloté par le scroll
     ====================================================================== */
  if (!reduce) {
    var rvTitle = $$('[data-rv-title] .rl > span');
    gsap.set(rvTitle, { yPercent: 115 });
    gsap.set(['.rv__text .eyebrow', '.rv__sub'], { opacity: 0, y: 24 });
    var rv = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.rv', start: 'top top', end: 'bottom bottom', scrub: .5 } });
    rv.to('.rv__hint', { opacity: 0, scale: .8, duration: .12 }, 0)
      .fromTo('[data-rv-mask]', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(76% at 50% 50%)', duration: .6 }, 0)
      .fromTo('.rv__video', { scale: 1.25 }, { scale: 1, duration: 1 }, 0)
      .to(rvTitle, { yPercent: 0, duration: .2, stagger: .06, ease: 'power3.out' }, .4)
      .to(['.rv__text .eyebrow', '.rv__sub'], { opacity: 1, y: 0, duration: .15, stagger: .1 }, .52)
      .to({}, { duration: .3 });
  } else {
    var rm = $('[data-rv-mask]'); if (rm) rm.style.clipPath = 'none';
  }

  /* ======================================================================
     GALERIE : colonnes parallax, rideaux, tilt, lightbox
     ====================================================================== */
  if (!reduce) {
    $$('.gcol').forEach(function (col) {
      var s = parseFloat(col.dataset.speed) || 0;
      gsap.fromTo(col, { y: function () { return -s * window.innerWidth / 100 * 1.2; } }, { y: function () { return s * window.innerWidth / 100 * 1.2; }, ease: 'none', scrollTrigger: { trigger: '.gallery__cols', start: 'top bottom', end: 'bottom top', scrub: .6, invalidateOnRefresh: true } });
    });
    $$('.gi').forEach(function (fig, i) {
      var img = $('img', fig);
      if (img) gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: fig, start: 'top 92%', once: true } });
    });
  }
  var lb = null;
  function lightbox(src, alt) {
    if (!lb) {
      lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo agrandie');
      lb.innerHTML = '<button type="button" aria-label="Fermer">✕</button><img alt="">';
      document.body.appendChild(lb);
      var close = function () { gsap.to(lb, { opacity: 0, duration: .4, onComplete: function () { lb.classList.remove('is-open'); } }); if (lenis) lenis.start(); };
      lb.addEventListener('click', close); document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('is-open')) close(); });
    }
    var im = $('img', lb); im.src = src; im.alt = alt || '';
    lb.classList.add('is-open'); if (lenis) lenis.stop();
    gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .5 });
    gsap.fromTo(im, { scale: .9, y: 30 }, { scale: 1, y: 0, duration: .9, ease: 'expo.out' });
    $('button', lb).focus();
  }
  $$('.gi:not(.gi--cta)').forEach(function (fig) {
    fig.tabIndex = 0; fig.setAttribute('role', 'button'); fig.setAttribute('aria-label', 'Agrandir la photo : ' + ($('img', fig).alt || ''));
    var open = function () { var im = $('img', fig); lightbox(im.currentSrc || im.src, im.alt); };
    fig.addEventListener('click', open);
    fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  /* ======================================================================
     AVIS : carrousel (glisser, flèches, défilement auto)
     ====================================================================== */
  (function () {
    var track = $('#rtrack'); if (!track) return;
    var cards = $$('.review', track), dots = $('#rdots'), user = false, inView = false, timer = null, drag = null, moved = 0;
    cards.forEach(function () { dots.appendChild(document.createElement('i')); });
    function current() {
      var c = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
      cards.forEach(function (card, i) { var d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - c); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function paint() { var i = current(); Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('is-on', k === i); }); }
    function go(i) {
      i = (i + cards.length) % cards.length;
      var left = cards[i].offsetLeft - (track.clientWidth - cards[i].offsetWidth) / 2;
      track.classList.add('is-drag');
      gsap.to(track, { scrollLeft: left, duration: reduce ? 0 : 1, ease: 'power3.inOut', onComplete: function () { track.classList.remove('is-drag'); } });
    }
    track.addEventListener('scroll', paint, { passive: true }); paint();
    $('#rprev').addEventListener('click', function () { user = true; go(current() - 1); });
    $('#rnext').addEventListener('click', function () { user = true; go(current() + 1); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { user = true; go(current() + 1); } if (e.key === 'ArrowLeft') { user = true; go(current() - 1); } });
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, l: track.scrollLeft }; moved = 0; user = true; track.classList.add('is-drag'); });
    window.addEventListener('pointermove', function (e) { if (!drag) return; moved = Math.abs(e.clientX - drag.x); track.scrollLeft = drag.l - (e.clientX - drag.x); });
    window.addEventListener('pointerup', function () { if (!drag) return; drag = null; track.classList.remove('is-drag'); go(current()); });
    track.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    ScrollTrigger.create({ trigger: '.reviews', start: 'top 70%', end: 'bottom 30%', onToggle: function (s) { inView = s.isActive; } });
    if (!reduce) {
      timer = setInterval(function () { if (!user && inView && !document.hidden) go(current() + 1); }, 5600);
      gsap.from(cards, { x: 90, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: track, start: 'top 85%', once: true } });
    }
  })();

  /* ======================================================================
     MICRO-INTERACTIONS : tilt 3D + reflet, boutons magnétiques, curseur
     ====================================================================== */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        gsap.to(el, { rotationY: (px - .5) * 11, rotationX: -(py - .5) * 11, transformPerspective: 900, duration: .55, ease: 'power3.out', overwrite: 'auto' });
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () { gsap.to(el, { rotationX: 0, rotationY: 0, duration: 1, ease: 'elastic.out(1,.55)', overwrite: 'auto' }); });
    });
    $$('[data-magnetic]').forEach(function (btn) {
      var lab = $('.btn__label', btn);
      var bx = gsap.quickTo(btn, 'x', { duration: .7, ease: 'power3' }), by = gsap.quickTo(btn, 'y', { duration: .7, ease: 'power3' });
      btn.addEventListener('pointerenter', function (e) { var r = btn.getBoundingClientRect(); btn.style.setProperty('--fx', (e.clientX - r.left) + 'px'); btn.style.setProperty('--fy', (e.clientY - r.top) + 'px'); });
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        bx(dx * .3); by(dy * .4);
        if (lab) gsap.to(lab, { x: dx * .1, y: dy * .14, duration: .5, ease: 'power3.out', overwrite: 'auto' });
      });
      btn.addEventListener('pointerleave', function (e) {
        var r = btn.getBoundingClientRect(); btn.style.setProperty('--fx', (e.clientX - r.left) + 'px'); btn.style.setProperty('--fy', (e.clientY - r.top) + 'px');
        bx(0); by(0); if (lab) gsap.to(lab, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.5)', overwrite: 'auto' });
      });
    });
    var cur = $('.cursor'), clab = $('.cursor__label');
    if (cur) {
      var cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
      window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });
      document.addEventListener('pointerover', function (e) {
        var lbl = e.target.closest ? e.target.closest('[data-cursor]') : null;
        var lnk = e.target.closest ? e.target.closest('a,button,input,textarea,label,[role="button"]') : null;
        cur.classList.toggle('is-label', !!lbl); cur.classList.toggle('is-link', !!lnk && !lbl);
        clab.textContent = lbl ? lbl.dataset.cursor : '';
      });
    }
  }

  /* ======================================================================
     VIDÉOS À CHARGEMENT DIFFÉRÉ (lecture seulement quand visibles)
     ====================================================================== */
  $$('video[data-lazy-video]').forEach(function (v) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          if (!v.getAttribute('src')) { v.src = v.dataset.lazyVideo; v.load(); }
          if (!reduce) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        } else { v.pause(); }
      });
    }, { rootMargin: '250px' });
    io.observe(v);
  });

  /* ======================================================================
     TARIFS (lus dans config.js) + HORAIRES « OUVERT / FERMÉ » EN DIRECT
     ====================================================================== */
  (CFG.services || []).forEach(function (s) {
    var el = $('[data-price="' + s.id + '"]');
    if (el && s.price) el.textContent = s.price;
  });

  function paintHours() {
    var now = AB.parisNow(), H = CFG.hours || {}, st = $('#status'); if (!st) return;
    $$('#hoursBody tr').forEach(function (tr) { tr.classList.toggle('is-today', +tr.dataset.d === now.dow); });
    var closedToday = (CFG.closedDates || []).indexOf(now.iso) > -1;
    var today = H[now.dow], label = st.querySelector('span');
    if (today && !closedToday) {
      var o = AB.toMin(today[0]), c = AB.toMin(today[1]);
      if (now.mins >= o && now.mins < c) { st.className = 'status is-open'; label.textContent = 'Ouvert · ferme à ' + AB.fmtHM(c); return; }
      if (now.mins < o) { st.className = 'status is-closed'; label.textContent = 'Fermé · ouvre aujourd’hui à ' + AB.fmtHM(o); return; }
    }
    for (var k = 1; k <= 7; k++) {
      var d = (now.dow + k) % 7;
      if (H[d]) { st.className = 'status is-closed'; label.textContent = 'Fermé · ouvre ' + (k === 1 ? 'demain' : ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][d]) + ' à ' + AB.fmtHM(AB.toMin(H[d][0])); return; }
    }
  }
  paintHours(); setInterval(paintHours, 60000);

  /* Footer : léger parallax du grand nom */
  if (!reduce) gsap.fromTo('.footer__giant', { yPercent: 14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ======================================================================
     DÉMARRAGE
     ====================================================================== */
  window.scrollTo(0, 0);
  runLoader();
  var refresh = function () { ScrollTrigger.refresh(); };
  window.addEventListener('load', function () { setTimeout(refresh, 300); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(refresh, 100); });
})();
