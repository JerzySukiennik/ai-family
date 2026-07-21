/* ═══════════════════════════════════════════════════════════════════
   AI Family — behaviour.

   Two rules held throughout:
   1. Nothing in here names a model. Everything is generated from
      window.MODELS, so a fourth model is a data edit, not a code edit.
   2. Only transform and opacity are animated. The target machine is an
      Intel MacBook Pro that throttles, not an M-chip.
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const models = window.MODELS || [];
  const root = document.documentElement;
  root.classList.add('js');

  gsap.registerPlugin(ScrollTrigger);

  /* ─────────────────────────────  build the DOM  ───────────────────────────── */

  const stage = document.getElementById('orbitStage');
  const family = document.getElementById('family');
  const footerLinks = document.getElementById('footerLinks');

  const badge = (status) =>
    `<p class="badge" data-kind="${status.kind}">${status.label}</p>`;

  models.forEach((m, i) => {
    // orbit item
    const btn = document.createElement('button');
    btn.className = 'orbit__item plate';
    btn.type = 'button';
    btn.dataset.index = String(i);
    btn.setAttribute('aria-label', `${m.name} — ${m.tagline}`);
    btn.innerHTML = `<img src="${m.icon}" alt="" width="512" height="512" draggable="false">`;
    stage.appendChild(btn);

    // full section
    const facts = m.facts
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');

    const repo = m.repo
      ? `<a class="repo" href="${m.repo}" target="_blank" rel="noopener">
           View the repo <span aria-hidden="true">↗</span>
         </a>`
      : `<span class="repo repo--none">${m.repoNote || 'No repo yet'}</span>`;

    const section = document.createElement('section');
    section.className = 'model';
    section.id = m.id;
    section.innerHTML = `
      <div class="model__inner">
        <div class="model__aside">
          <span class="plate model__mark"><img src="${m.icon}" alt="${m.name} icon" width="512" height="512"></span>
          ${badge(m.status)}
        </div>
        <div class="model__main">
          <h2 class="model__name">${m.name}</h2>
          <p class="model__tagline">${m.tagline}</p>
          <p class="model__lede">${m.lede}</p>
          <p class="model__body">${m.body}</p>
          <dl class="facts">${facts}</dl>
          ${m.note ? `<p class="model__note">${m.note}</p>` : ''}
          ${repo}
        </div>
      </div>`;
    family.appendChild(section);

    // footer link
    const li = document.createElement('li');
    li.innerHTML = m.repo
      ? `<a class="repo" href="${m.repo}" target="_blank" rel="noopener">${m.name} <span aria-hidden="true">↗</span></a>`
      : `<span class="repo repo--none">${m.name} — no repo yet</span>`;
    footerLinks.appendChild(li);
  });

  // The generated sections need reveal marks too.
  document.querySelectorAll('.model__aside, .model__main').forEach((el) =>
    el.setAttribute('data-reveal', '')
  );

  /* ─────────────────────────────  the orbit  ─────────────────────────────
     Items ride an ellipse. Depth (how near the front an item is) drives
     scale, opacity and stacking, which is what sells it as an orbit rather
     than a ring of flat icons.
  */

  const items = Array.from(stage.children);
  const orbit = document.getElementById('orbit');
  const spin = { angle: 0 };
  let radii = { rx: 0, ry: 0 };

  /* Read by js/webgl-hero.js, one plain object per item, updated in place()
     below. This is the same "single source of truth" pattern as models-data.js:
     the WebGL layer never re-derives the orbit math, it just reads the numbers
     GSAP already computed this frame — no DOM-transform parsing, no drift
     between the CSS orbit and its 3D mirror. */
  const orbitState = items.map(() => ({ x: 0, y: 0, scale: 1, opacity: 1, size: 0 }));
  window.AIFamilyOrbit = { items, state: orbitState };

  function measure() {
    const r = orbit.getBoundingClientRect();
    // Matches the ellipse in the markup: rx 380/1000, ry 84/300 of the box.
    radii = { rx: r.width * 0.38, ry: r.height * 0.28 };
    // Cached here rather than read every animation frame — offsetWidth only
    // changes on resize (the CSS size is a clamp()), so there is no reason
    // to risk a forced layout read 60 times a second.
    items.forEach((el, i) => (orbitState[i].size = el.offsetWidth));
  }

  /* Per-item hover weight, 0..1. It is blended inside place() rather than
     tweened onto the element separately, so orbit position and hover lift
     compose instead of overwriting each other — no pop when the spin resumes. */
  const boost = items.map(() => ({ v: 0 }));

  function place() {
    const step = (Math.PI * 2) / (items.length || 1);
    items.forEach((el, i) => {
      const a = spin.angle + i * step;
      const depth = (Math.cos(a) + 1) / 2;          // 1 at the front, 0 at the back
      const b = boost[i].v;
      const restScale = 0.62 + depth * 0.38;
      const restAlpha = 0.38 + depth * 0.62;
      const x = Math.sin(a) * radii.rx;
      const y = Math.cos(a) * radii.ry;
      // Hovering pulls an item all the way to the front, wherever it sits on
      // the orbit — interpolating to a fixed size rather than multiplying the
      // depth size, so a back item does not stay small while it is selected.
      const scale = restScale + (1.08 - restScale) * b;
      const opacity = restAlpha + (1 - restAlpha) * b;
      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x,
        y,
        scale,
        opacity,
        zIndex: Math.round(depth * 100) + (b > 0.5 ? 200 : 0),
      });
      const s = orbitState[i];
      s.x = x; s.y = y; s.scale = scale; s.opacity = opacity;
    });
  }

  measure();
  place();

  const rotation = gsap.to(spin, {
    angle: Math.PI * 2,
    duration: 30,
    ease: 'none',
    repeat: -1,
    onUpdate: place,
    paused: true,
  });

  // Never spin off-screen — it is wasted work on a throttling laptop.
  ScrollTrigger.create({
    trigger: orbit,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? rotation.play() : rotation.pause()),
  });

  let resizeRaf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      measure();
      place();
    });
  });

  /* ── readout ───────────────────────────────────────────────────── */

  const hint = document.getElementById('readoutHint');
  const card = document.getElementById('readoutCard');
  const rName = document.getElementById('readoutName');
  const rTag = document.getElementById('readoutTagline');
  const rStatus = document.getElementById('readoutStatus');
  let activeIndex = -1;

  // On a touch screen there is no hover, and a tap goes straight to the
  // section. Say what actually happens.
  const canHover = window.matchMedia('(hover: hover)').matches;
  if (!canHover) hint.textContent = 'Tap a model';

  // Ease the spin down rather than stopping dead — a hard stop reads as frozen.
  const setSpin = (value) =>
    gsap.to(rotation, { timeScale: value, duration: 0.55, ease: 'power2.out', overwrite: true });

  // The lift drives place(), which is otherwise idle while the spin is paused.
  const lift = (i, to) =>
    gsap.to(boost[i], { v: to, duration: 0.45, ease: 'power3.out', onUpdate: place, overwrite: true });

  function show(i) {
    if (i === activeIndex) return;
    if (activeIndex !== -1) lift(activeIndex, 0);
    activeIndex = i;
    const m = models[i];

    items.forEach((el, n) => (el.dataset.active = String(n === i)));
    lift(i, 1);

    hint.hidden = true;
    card.hidden = false;
    rName.textContent = m.name;
    rTag.textContent = m.tagline;
    rStatus.textContent = m.status.label;
    rStatus.dataset.kind = m.status.kind;

    // Materialise: blur and scale together, so it arrives rather than fades.
    gsap.fromTo(
      card,
      { opacity: 0, y: 8, scale: 0.97, filter: 'blur(6px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out', overwrite: true }
    );
    setSpin(0);
  }

  function clear() {
    if (activeIndex === -1) return;
    lift(activeIndex, 0);
    activeIndex = -1;
    items.forEach((el) => (el.dataset.active = 'false'));
    gsap.to(card, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => {
        card.hidden = true;
        hint.hidden = false;
        gsap.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      },
    });
    setSpin(1);
  }

  items.forEach((el, i) => {
    el.addEventListener('pointerenter', () => show(i));
    el.addEventListener('focus', () => show(i));
    el.addEventListener('click', () => {
      document.getElementById(models[i].id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  orbit.addEventListener('pointerleave', clear);
  orbit.addEventListener('focusout', (e) => {
    if (!orbit.contains(e.relatedTarget)) clear();
  });

  /* ─────────────────────────────  motion  ───────────────────────────── */

  const mm = gsap.matchMedia();

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduced: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { motion } = ctx.conditions;

      /* The CSS pre-state is translateY(105%). GSAP parses that back as a
         pixel `y`, not as `yPercent`, so animating yPercent alone would move
         nothing. Normalise into GSAP's own properties first. */
      gsap.set('.display .line > span', { y: 0, yPercent: 105 });

      /* Page-load sequence. One orchestrated moment beats scattered effects. */
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (motion) {
        intro
          .to('.hero .eyebrow', { opacity: 1, duration: 0.6 }, 0.1)
          .to('.display .line > span', { yPercent: 0, duration: 1.05, stagger: 0.09 }, 0.15)
          .to('.orbit', { opacity: 1, duration: 0.9 }, 0.5)
          .from('.orbit__stage', { scale: 0.9, duration: 1.1, ease: 'power2.out' }, 0.5)
          .to('.readout', { opacity: 1, duration: 0.6 }, 0.85)
          .to('.scrollcue', { opacity: 1, duration: 0.6 }, 1.1);
      } else {
        gsap.set('.hero .eyebrow, .orbit, .readout, .scrollcue', { opacity: 1 });
        gsap.set('.display .line > span', { yPercent: 0 });
      }

      /* Section reveals. Reduced motion gets the fade without the travel. */
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        if (el.closest('.hero')) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: motion ? 26 : 0 },
          {
            opacity: 1,
            y: 0,
            duration: motion ? 0.85 : 0.4,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        );
      });

      /* Hero exit parallax: the headline and orbit ease up and fade as the
         point section arrives underneath, so the transition between the two
         reads as one continuous scroll rather than a hard cut. Scrubbed, not
         timed — it tracks the scrollbar directly. */
      if (motion) {
        gsap.to('.hero__inner', {
          yPercent: -12,
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
      }

      /* The three principles get a scroll-scrubbed progress rail instead of
         a plain once-off fade: --rail-progress tracks how far through the
         list the reader is, and the current item's heading darkens. Reused
         is-current toggling means keyboard/reduced-motion users still get a
         correct (if static) state at rest. */
      const principles = document.getElementById('principles');
      if (principles) {
        const rows = gsap.utils.toArray('li', principles);
        ScrollTrigger.create({
          trigger: principles,
          start: 'top 65%',
          end: 'bottom 65%',
          scrub: motion ? 0.3 : false,
          onUpdate: (self) => {
            principles.style.setProperty('--rail-progress', self.progress.toFixed(4));
            const idx = Math.min(rows.length - 1, Math.floor(self.progress * rows.length));
            rows.forEach((li, i) => li.classList.toggle('is-current', i === idx));
          },
        });
      }

      /* Blueprint: the guides sweep across, then the marks draw themselves.
         This is the one place the page is allowed to show off. */
      const bp = document.querySelector('[data-blueprint]');
      if (bp) {
        const guides = bp.querySelectorAll('[data-guide]');
        const marks = bp.querySelectorAll('[data-mark]');
        const strokes = [];
        const fills = [];

        marks.forEach((g) =>
          g.querySelectorAll('path, circle').forEach((el) => {
            if (el.getAttribute('stroke') === 'none') fills.push(el);
            else strokes.push(el);
          })
        );

        if (motion) {
          strokes.forEach((el) => {
            const len = el.getTotalLength();
            gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
          });
          gsap.set(guides, { scaleX: 0, transformOrigin: 'left center' });
          gsap.set([fills, '.bp-label text', '.bp-caption text'], { opacity: 0 });

          // Scrubbed to the scrollbar rather than played once: this is a
          // technical drawing, so it reads naturally as something that
          // unfolds under your hand as you scroll, and — unlike prose —
          // nothing is lost if a reader scrubs back and forth over it.
          gsap
            .timeline({
              scrollTrigger: { trigger: bp, start: 'top 80%', end: 'bottom 55%', scrub: 0.4 },
            })
            .to(guides, { scaleX: 1, duration: 0.9, stagger: 0.1, ease: 'none' })
            .to('.bp-label text', { opacity: 1, duration: 0.4, stagger: 0.06 }, '-=0.45')
            .to(strokes, { strokeDashoffset: 0, duration: 1.1, stagger: 0.05, ease: 'none' }, '-=0.3')
            .to(fills, { opacity: 1, duration: 0.35 }, '-=0.35')
            .to('.bp-caption text', { opacity: 1, duration: 0.4, stagger: 0.08 }, '-=0.5');
        }
      }

      /* Model sections: the sticky mark drifts a little slower than the
         facts scrolling past it, a small parallax that keeps the pinned
         icon feeling like it is sitting in real space rather than glued
         to the viewport. */
      if (motion) {
        gsap.utils.toArray('.model').forEach((section) => {
          const mark = section.querySelector('.model__mark');
          if (!mark) return;
          gsap.fromTo(
            mark,
            { y: -24, rotate: -1.5 },
            {
              y: 24,
              rotate: 1.5,
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
            }
          );
        });
      }

      /* Parameter count. Watching it land on an exact, odd number is the
         point — it says the figure is counted, not rounded. */
      const counter = document.querySelector('[data-count]');
      if (counter && motion) {
        const target = Number(counter.dataset.count);
        const n = { v: 0 };
        gsap.to(n, {
          v: target,
          duration: 1.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: counter, start: 'top 85%', once: true },
          onUpdate: () => (counter.textContent = Math.round(n.v).toLocaleString('en-US')),
        });
      }

      /* Token chips stagger in, so the two rows read as a comparison. */
      if (motion) {
        gsap.utils.toArray('[data-chips]').forEach((row) => {
          gsap.from(row.children, {
            opacity: 0,
            y: 10,
            duration: 0.45,
            stagger: 0.035,
            ease: 'power2.out',
            scrollTrigger: { trigger: row, start: 'top 88%', once: true },
          });
        });
      }

      return () => intro.kill();
    }
  );

  /* Fonts land after first paint and change metrics; recompute once. */
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      measure();
      place();
      ScrollTrigger.refresh();
    });
  }
})();
