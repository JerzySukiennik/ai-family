/* ═══════════════════════════════════════════════════════════════════
   "Where it's heading" — WebGL enhancement layer.

   The dashed SVG lines in the fallback markup stay visible in both
   states — they're the honest, static "this is a plan" part, and redrawing
   them in WebGL would add risk for zero benefit. This module only replaces
   the flat icon plates with tilting 3D cards and adds a couple of small
   pulses that travel toward the hub, standing in for "heading there",
   never for "already there".

   Same optional-enhancement contract as js/webgl-hero.js: no WebGL, no
   module support, and the static fallback — dashed lines, flat plates,
   labels — is already a complete, honest section on its own.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

(() => {
  'use strict';

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }
  if (!hasWebGL()) return;

  const stageEl = document.querySelector('[data-network-stage]');
  const canvas = document.getElementById('networkCanvas');
  const fallback = document.getElementById('networkFallback');
  if (!stageEl || !canvas || !fallback) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodeEls = Array.from(fallback.querySelectorAll('.network__node'));
  const hubIndex = nodeEls.findIndex((el) => el.classList.contains('network__node--hub'));
  if (hubIndex === -1 || nodeEls.length < 2) return;

  const pct = (v) => parseFloat(v) || 0; // "18%" → 18

  const nodes = nodeEls.map((el) => ({
    el,
    img: el.querySelector('img'),
    mark: el.querySelector('.network__mark'),
    x: pct(el.style.getPropertyValue('--x')),
    y: pct(el.style.getPropertyValue('--y')),
  }));
  const hub = nodes[hubIndex];
  const sources = nodes.filter((_, i) => i !== hubIndex);

  stageEl.classList.add('gl-active');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  let camera;
  let stageW = 0;
  let stageH = 0;
  const px = (v) => (v / 100) * stageW;
  const py = (v) => (v / 100) * stageH;

  const loader = new THREE.TextureLoader();
  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(13,13,15,0.9)');
    g.addColorStop(0.4, 'rgba(13,13,15,0.35)');
    g.addColorStop(1, 'rgba(13,13,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  function makeShadowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(13,13,15,0.35)');
    g.addColorStop(1, 'rgba(13,13,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = makeGlowTexture();
  const shadowTex = makeShadowTexture();

  // Icon cards — same texture-plane recipe as the hero orbit.
  const cards = nodes.map((n, i) => {
    const tex = loader.load(n.img.getAttribute('src'));
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.renderOrder = 10 + i;

    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), shadowMat);
    shadow.renderOrder = i;

    scene.add(shadow, mesh);
    return { node: n, mesh, shadow, phase: i * 1.7 };
  });

  // Two bezier curves, matching the fallback SVG's control points exactly
  // (55/45 on the x-axis) so the WebGL pulses travel the same visual path
  // the dashed lines already draw.
  function curveFor(src) {
    return new THREE.CubicBezierCurve3(
      new THREE.Vector3(px(src.x), py(src.y), 0),
      new THREE.Vector3(px(55), py(src.y), 0),
      new THREE.Vector3(px(45), py(hub.y), 0),
      new THREE.Vector3(px(hub.x), py(hub.y), 0)
    );
  }

  const PULSES_PER_LINE = 2;
  const pulses = [];
  sources.forEach((src) => {
    const curve = curveFor(src);
    for (let p = 0; p < PULSES_PER_LINE; p++) {
      const mat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 5;
      scene.add(sprite);
      pulses.push({ curve, sprite, phase: p / PULSES_PER_LINE });
    }
  });

  function layout() {
    const r = stageEl.getBoundingClientRect();
    stageW = r.width;
    stageH = r.height;
    renderer.setSize(stageW, stageH, false);
    camera = new THREE.OrthographicCamera(0, stageW, 0, stageH, -200, 200);
    camera.position.z = 10;

    cards.forEach(({ node, mesh, shadow }) => {
      const size = node.mark.offsetWidth;
      mesh.position.set(px(node.x), py(node.y), 1);
      mesh.scale.setScalar(size);
      shadow.position.set(px(node.x), py(node.y) + size * 0.08, 0.5);
      shadow.scale.setScalar(size * 1.5);
    });

    // Rebuild the curves against the new stage size.
    let ci = 0;
    sources.forEach((src) => {
      const curve = curveFor(src);
      for (let p = 0; p < PULSES_PER_LINE; p++) pulses[ci++].curve = curve;
    });

    const pulseSize = (hub.mark ? hub.mark.offsetWidth : 60) * 0.16;
    pulses.forEach(({ sprite }) => sprite.scale.setScalar(pulseSize));

    // Reduced motion never re-enters the render loop on its own, so a resize
    // would otherwise leave last frame's (now stale) layout on screen.
    if (reduced && running) render(0);
  }

  let raf = null;
  let running = false;

  layout();
  window.addEventListener('resize', layout);

  function render(t) {
    const time = t * 0.001;

    // A slow idle tilt — the only motion these cards have on their own,
    // reduced motion gets them held at rest instead.
    if (!reduced) {
      cards.forEach(({ mesh, phase }) => {
        mesh.rotation.y = Math.sin(time * 0.35 + phase) * 0.18;
        mesh.rotation.z = Math.sin(time * 0.22 + phase) * 0.015;
      });
    }

    pulses.forEach(({ curve, sprite, phase }) => {
      const speed = reduced ? 0 : 0.12;
      const tt = reduced ? (0.3 + phase) % 1 : (time * speed + phase) % 1;
      const point = curve.getPointAt(tt);
      sprite.position.copy(point);
      sprite.position.z = 2;
      // Fade in/out at both ends of the path so a pulse never appears to
      // pop into existence on top of a node.
      sprite.material.opacity = Math.sin(tt * Math.PI) * 0.85 + 0.05;
    });

    renderer.render(scene, camera);
    if (!reduced) raf = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    if (reduced) {
      render(0); // one static frame is enough — nothing to keep looping
    } else {
      raf = requestAnimationFrame(render);
    }
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  new IntersectionObserver(
    ([entry]) => (entry.isIntersecting ? start() : stop()),
    { threshold: 0.05 }
  ).observe(stageEl);
})();
