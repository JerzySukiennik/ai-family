/* ═══════════════════════════════════════════════════════════════════
   Custom cursor — a small ring with inertia, growing over anything
   clickable. Only for a mouse with real hover; a touch visitor never
   loses their system cursor, and reduced motion skips it entirely
   rather than shipping a laggy dot nobody asked for.
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined') return;

  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  cursor.hidden = false;
  document.body.classList.add('cursor-active-page');

  // Centre once via GSAP's own properties so quickTo's later x/y writes
  // compose with this instead of overwriting it (see the ai-family memory
  // note on gsap yPercent vs CSS translate — same trap, avoided here).
  gsap.set(cursor, { xPercent: -50, yPercent: -50, x: innerWidth / 2, y: innerHeight / 2 });

  const setX = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
  const setY = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });

  let shown = false;
  window.addEventListener('pointermove', (e) => {
    setX(e.clientX);
    setY(e.clientY);
    if (!shown) {
      shown = true;
      gsap.to(cursor, { opacity: 1, duration: 0.2 });
    }
  });

  const grow = () => cursor.classList.add('cursor--active');
  const shrink = () => cursor.classList.remove('cursor--active');

  // Queried once, after main.js has finished building the model sections
  // and footer links — script order in index.html guarantees that.
  document.querySelectorAll('a, button, input, [data-cursor-hover]').forEach((el) => {
    el.addEventListener('pointerenter', grow);
    el.addEventListener('pointerleave', shrink);
  });

  window.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
})();
