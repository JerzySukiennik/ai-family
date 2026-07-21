/* ═══════════════════════════════════════════════════════════════════
   Hero — WebGL enhancement layer.

   Two small three.js pieces sharing the hero's own coordinate system:
   1. A faint full-hero grid shader that warps toward the pointer.
   2. The orbit's icons, rendered as tilting 3D cards instead of flat
      <img> plates.

   Neither re-implements the orbit's math. main.js already computes each
   item's x/y/scale/opacity every frame (it has to, to drive the real DOM
   hit-targets) and publishes it on window.AIFamilyOrbit — this module just
   reads those numbers back. Same values, two renderers: the invisible DOM
   buttons stay the source of truth for hover/focus/click/accessibility,
   and this canvas only mirrors what they're already doing visually.

   Fully optional: no WebGL, no module support, or prefers-reduced-motion,
   and this file does nothing — main.js's CSS/DOM orbit is already a
   complete page on its own.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }
  if (!hasWebGL()) return;

  const hero = document.querySelector('.hero');
  const orbitEl = document.getElementById('orbit');
  const ring = orbitEl && orbitEl.querySelector('.orbit__ring');
  const stage = document.getElementById('orbitStage');
  if (!hero || !orbitEl || !stage) return;

  function boot() {
    const orbitData = window.AIFamilyOrbit;
    if (!orbitData) return; // main.js failed to init — nothing to mirror
    const { items, state } = orbitData;
    if (!items.length) return;

    hero.classList.add('gl-active');
    orbitEl.classList.add('gl-active');

    /* ---------- background grid shader ---------- */

    const gridCanvas = document.createElement('canvas');
    gridCanvas.className = 'hero__gl hero__gl--grid';
    hero.insertBefore(gridCanvas, hero.firstChild);

    const gridRenderer = new THREE.WebGLRenderer({ canvas: gridCanvas, alpha: true, antialias: false });
    gridRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const gridScene = new THREE.Scene();
    const gridCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const gridUniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.32) },
      uTargetMouse: { value: new THREE.Vector2(0.5, 0.32) },
      uAspect: { value: 1 },
    };
    const gridMat = new THREE.ShaderMaterial({
      uniforms: gridUniforms,
      transparent: true,
      depthTest: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uAspect;

        float gridLines(vec2 uv, float cells) {
          vec2 g = fract(uv * cells);
          vec2 d = fwidth(uv * cells) * 1.5;
          vec2 line = smoothstep(vec2(0.0), d, g) * smoothstep(vec2(0.0), d, 1.0 - g);
          return 1.0 - min(line.x, line.y);
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);
          vec2 m = vec2((uMouse.x - 0.5) * uAspect, uMouse.y - 0.5);
          float dist = length(p - m);
          float glow = smoothstep(0.42, 0.0, dist);
          vec2 warped = uv + vec2(0.0, sin(uv.x * 10.0 + uTime * 0.25) * 0.0025 * glow);
          float g = gridLines(warped, 26.0);
          float vign = smoothstep(0.95, 0.3, length(uv - 0.5));
          float alpha = g * (0.035 + glow * 0.16) * vign;
          gl_FragColor = vec4(0.051, 0.051, 0.059, alpha);
        }
      `,
    });
    gridScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridMat));

    let mouseX = 0.5;
    let mouseY = 0.32;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width;
      mouseY = 1 - (e.clientY - r.top) / r.height;
    });

    /* ---------- icon cards ---------- */

    const iconCanvas = document.createElement('canvas');
    iconCanvas.className = 'hero__gl hero__gl--orbit';
    orbitEl.insertBefore(iconCanvas, stage);

    const iconRenderer = new THREE.WebGLRenderer({ canvas: iconCanvas, alpha: true, antialias: true });
    iconRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const iconScene = new THREE.Scene();
    let iconCamera;

    function makeShadowTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
      grd.addColorStop(0, 'rgba(13,13,15,0.4)');
      grd.addColorStop(1, 'rgba(13,13,15,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    const shadowTex = makeShadowTexture();
    const loader = new THREE.TextureLoader();

    const meshes = items.map((el, i) => {
      const img = el.querySelector('img');
      const tex = loader.load(img.getAttribute('src'));
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.renderOrder = 10 + i;

      const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), shadowMat);
      shadow.renderOrder = i;

      iconScene.add(shadow, mesh);
      return { mesh, shadow };
    });

    function resizeGrid() {
      const hr = hero.getBoundingClientRect();
      gridRenderer.setSize(hr.width, hr.height, false);
      gridUniforms.uAspect.value = hr.width / Math.max(hr.height, 1);
    }

    function resizeOrbit() {
      const or = orbitEl.getBoundingClientRect();
      iconRenderer.setSize(or.width, or.height, false);
      iconCamera = new THREE.OrthographicCamera(
        -or.width / 2, or.width / 2, or.height / 2, -or.height / 2, -200, 200
      );
      iconCamera.position.z = 10;
    }

    function resize() {
      resizeGrid();
      resizeOrbit();
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---------- render loop, paused off-screen ---------- */

    let raf = null;

    function frame(t) {
      raf = requestAnimationFrame(frame);

      gridUniforms.uTime.value = t * 0.001;
      gridUniforms.uTargetMouse.value.set(mouseX, mouseY);
      gridUniforms.uMouse.value.lerp(gridUniforms.uTargetMouse.value, 0.06);
      gridRenderer.render(gridScene, gridCamera);

      state.forEach((s, i) => {
        const { mesh, shadow } = meshes[i];
        const size = s.size * s.scale;
        // s.x/s.y are the orbit offsets from the box centre in CSS pixels —
        // exactly the world position under an orthographic camera centred
        // on that same box. Flip y: CSS is down-positive, three is up-positive.
        mesh.position.set(s.x, -s.y, i * 0.01);
        mesh.scale.setScalar(size);
        // A cosmetic tilt, not a real perspective foreshortening (the camera
        // is orthographic) — but it reads as a card turning in space, which
        // is the whole point of putting this in WebGL at all.
        mesh.rotation.y = (1 - s.scale) * 1.0 * (s.x >= 0 ? 1 : -1);
        mesh.material.opacity = s.opacity;

        shadow.position.set(s.x, -s.y - size * 0.05, i * 0.01 - 0.001);
        shadow.scale.setScalar(size * 1.55);
        shadow.material.opacity = s.opacity * 0.85;
      });

      if (iconCamera) iconRenderer.render(iconScene, iconCamera);
    }

    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(frame);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      },
      { threshold: 0 }
    ).observe(hero);
  }

  // main.js runs its IIFE synchronously on parse, including the initial
  // measure()/place() call that populates window.AIFamilyOrbit — by the
  // time this module (deferred by the module spec) executes, it's ready.
  boot();
})();
