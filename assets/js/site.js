/* Luciana Varandas · comportamento do site */
(function () {
  'use strict';

  var doc = document.documentElement;
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress span');

  /* topo: fundo translúcido ao rolar e barra de progresso */
  var ticking = false;
  function paint() {
    var y = window.scrollY || window.pageYOffset || 0;
    var max = doc.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 8);
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
  }, { passive: true });
  paint();

  /* menu do celular */
  var btn = document.getElementById('menu-btn');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('is-open', open);
  }
  if (btn && menu) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* animação de rolagem: o GSAP só é baixado depois que a página carregou */
  var me = document.currentScript;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !me) return;
  var srcGsap = me.getAttribute('data-gsap'), srcST = me.getAttribute('data-st');
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var el = document.createElement('script');
      el.src = src; el.async = false; el.onload = ok; el.onerror = fail;
      document.head.appendChild(el);
    });
  }
  var gsap, ST, mm;

  /* o resto das animações espera o navegador ficar livre, para não atrasar o carregamento */
  var idle = window.requestIdleCallback || function (fn) { return window.setTimeout(fn, 200); };
  function whenReady(fn) {
    if (document.readyState === 'complete') idle(fn, { timeout: 900 });
    else window.addEventListener('load', function () { idle(fn, { timeout: 900 }); }, { once: true });
  }

  whenReady(function () {
    loadScript(srcGsap).then(function () { return loadScript(srcST); }).then(start).catch(function () {});
  });

  function start() {
    gsap = window.gsap; ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);
    doc.classList.add('js-motion');
    mm = gsap.matchMedia();
    mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    desk: '(min-width: 901px)',
    sm: '(max-width: 600px)',
    land: '(orientation: landscape)',
    fine: '(pointer: fine)'
  }, function (ctx) {
    var c = ctx.conditions;
    if (!c.motion) return;
    var cleanups = [];

    /* cartões do topo flutuam só enquanto o topo está na tela */
    var floats = gsap.utils.toArray('.fc-in').map(function (el, i) {
      return gsap.to(el, { y: '+=7', duration: 2.6 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.4 });
    });
    ST.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: function (self) {
      floats.forEach(function (t) { if (self.isActive) t.resume(); else t.pause(); });
    } });

    /* retrato: profundidade ao rolar e ao mover o mouse */
    gsap.to('.art-photo', { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.art-blob', { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    if (c.fine) {
      var hero = document.querySelector('.hero');
      var depth = [14, -12, 10];
      var px = gsap.utils.toArray('.fc-px').map(function (el, i) {
        return { x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }), d: depth[i] || 10 };
      });
      var bx = gsap.quickTo('.art-blob', 'x', { duration: 1.3, ease: 'power3' });
      var by = gsap.quickTo('.art-blob', 'y', { duration: 1.3, ease: 'power3' });
      var move = function (e) {
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        px.forEach(function (p) { p.x(nx * p.d); p.y(ny * p.d); });
        bx(-nx * 10); by(-ny * 10);
      };
      hero.addEventListener('pointermove', move);
      cleanups.push(function () { hero.removeEventListener('pointermove', move); });
    }

    /* uma manhã comum */
    cleanups.push(scene(c.desk));

    /* entradas suaves das seções */
    /* o que já está na tela quando o GSAP chega fica como está */
    function seen(el) { return el.getBoundingClientRect().top < window.innerHeight * 0.92; }
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      if (seen(el)) return;
      gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    /* para quem: a linha do topo se desenha */
    if (!seen(document.querySelector('.who-grid'))) gsap.fromTo('.who-grid', { '--draw': 0 }, { '--draw': 1, duration: 1.1, ease: 'power2.inOut', scrollTrigger: { trigger: '.who-grid', start: 'top 88%', once: true } });

    /* serviços: a agenda se confirma e a mensagem aparece */
    var rows = gsap.utils.toArray('.agenda .pill');
    if (!seen(document.querySelector('.agenda'))) gsap.from(rows, { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.18, scrollTrigger: { trigger: '.agenda', start: 'top 80%', once: true } });
    if (!seen(document.querySelector('.c-wa'))) gsap.from('.bubble', { scale: 0.85, opacity: 0, duration: 0.7, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.c-wa', start: 'top 70%', once: true } });

    /* diferença: as marcas de cada lado entram em sequência */
    gsap.utils.toArray('.vs').forEach(function (box) {
      if (seen(box)) return;
      gsap.from(box.querySelectorAll('li'), { x: -14, opacity: 0, duration: 0.55, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: box, start: 'top 78%', once: true } });
    });

    /* como funciona: a linha de cada etapa se desenha em ordem */
    var steps = seen(document.querySelector('.steps')) ? [] : gsap.utils.toArray('[data-step]');
    var stl = gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true } });
    steps.forEach(function (s, i) {
      stl.fromTo(s, { '--draw': 0 }, { '--draw': 1, duration: 0.6, ease: 'power2.inOut' }, i * 0.18)
         .from(s.children, { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, i * 0.18 + 0.15);
    });

    /* planos sobem em degraus, o do meio por último */
    if (!seen(document.querySelector('.plans'))) gsap.from('[data-plan]', { y: 70, opacity: 0, duration: 1, ease: 'power3.out', stagger: { each: 0.12, from: 'edges' }, scrollTrigger: { trigger: '.plans', start: 'top 85%', once: true } });

    /* sobre: a foto se abre de baixo para cima */
    gsap.fromTo('.about-photo', { clipPath: 'inset(18% 0% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: '.about-photo', start: 'top 92%', end: 'top 45%', scrub: true } });
    gsap.fromTo('.about-photo img', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.about-photo', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* contato: painel cresce e a mancha rosé desliza */
    gsap.fromTo('.cta-panel', { scale: 0.94 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 95%', end: 'top 45%', scrub: true } });
    gsap.fromTo('.cta-blob', { x: 60, y: -40 }, { x: 0, y: 0, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    return function () { cleanups.forEach(function (f) { if (f) f(); }); };
  });

    /* abrir ou fechar uma dúvida muda a altura da página */
    document.querySelectorAll('.qa details').forEach(function (d) {
      d.addEventListener('toggle', function () { ST.refresh(); });
    });

    /* quem chega por um link com # (ex.: /#planos) cai no lugar certo depois que a cena fixa ocupa o espaço dela */
    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      var go = function () { if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' }); };
      ST.refresh(); go();
      window.setTimeout(go, 450);
    }
  }

  function scene(desk) {
    var sec = document.querySelector('.scene');
    if (!sec) return null;
    var stage = sec.querySelector('.stage');
    var cards = gsap.utils.toArray('.task').filter(function (el) { return el.offsetParent !== null; });
    var n = cards.length;
    var num = sec.querySelector('.count-num'), lab = sec.querySelector('.count-label');
    function setCount(k) { num.textContent = k; lab.textContent = (k === 1 ? 'pendência' : 'pendências') + ' na sua mesa'; }

    sec.classList.add('is-pinned');
    var sceneIn = sec.querySelector('.scene-in');
    var pin = sceneIn.scrollHeight <= sceneIn.clientHeight + 2;
    if (!pin) sec.classList.remove('is-pinned');

    var deskPts = [[0.06, 0, -8], [0.94, 0.06, 6], [0.28, 0.27, 4], [1, 0.44, -6], [0, 0.6, 7], [0.62, 0.78, -4], [0.36, 1, 3]];
    var mobPts = [[0.12, 0, -7], [0.9, 0.34, 6], [0, 0.66, 5], [0.86, 1, -6]];
    var pts = desk ? deskPts : mobPts;
    function pt(i) { return pts[i % pts.length]; }
    function box() {
      var w = stage.clientWidth, h = stage.clientHeight;
      return desk ? { l: -w * 0.04, t: -h * 0.1, w: w * 1.36, h: h * 1.2 } : { l: -w * 0.14, t: -h * 0.02, w: w * 1.28, h: h * 1.04 };
    }
    function sx(i) { var b = box(), el = cards[i]; return b.l + pt(i)[0] * (b.w - el.offsetWidth) - el.offsetLeft; }
    function sy(i) { var b = box(), el = cards[i]; return b.t + pt(i)[1] * (b.h - el.offsetHeight) - el.offsetTop; }

    var step = n > 5 ? 0.1 : 0.15, t0 = 0.08, resolveAt = [];
    var trig = pin
      ? { trigger: sec, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * (desk ? 2.6 : 2.2)); }, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true }
      : { trigger: stage, start: 'top 88%', end: 'bottom 55%', scrub: 0.6, invalidateOnRefresh: true };
    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: trig,
      onUpdate: function () {
        var t = tl.time(), r = 0;
        for (var k = 0; k < resolveAt.length; k++) if (t >= resolveAt[k]) r++;
        setCount(n - r);
      }
    });
    cards.forEach(function (el, i) {
      var at = t0 + i * step;
      tl.fromTo(el, { x: function () { return sx(i); }, y: function () { return sy(i); }, rotation: pt(i)[2], scale: 1.02, zIndex: n - i },
        { x: 0, y: 0, rotation: 0, scale: 1, zIndex: n + i, duration: 0.16 }, at);
      tl.fromTo([el.querySelector('.before'), el.querySelector('.pill-warn')], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.04, ease: 'none' }, at + 0.13);
      tl.fromTo([el.querySelector('.after'), el.querySelector('.pill-ok')], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04, ease: 'none' }, at + 0.14);
      resolveAt.push(at + 0.15);
    });
    var end = t0 + (n - 1) * step + 0.2;
    tl.fromTo('.scene-h .hb', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.07 }, end);
    tl.fromTo('.scene-foot', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.07 }, end + 0.04);
    tl.to({}, { duration: pin ? 0.14 : 0.02 });
    setCount(n);
    return function () { sec.classList.remove('is-pinned'); setCount(0); };
  }

})();
