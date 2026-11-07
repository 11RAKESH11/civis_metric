import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import disposeObject from '../lib/disposeObject';

// A procedural RCC frame building (slabs, columns, beams, masonry, rebar stubs) drawn with three.js.
// Order of events: blueprint grid and footprint, floors rising one by one, dimension markers.
// `explodeRef.current` (0..1) lifts the floors apart, driven by scroll in the visualisation section.
const FLOORS = 4;
const FH = 2.8;
const W = 10;
const D = 6;
const ease = (p) => 1 - Math.pow(1 - p, 3);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
// The model's line colour follows the page palette (--c-tint).
const tintColor = (varName = '--c-tint') => {
  const [r, g, b] = getComputedStyle(document.documentElement).getPropertyValue(varName).trim().split(/s+/).map(Number);
  return new THREE.Color((r || 143) / 255, (g || 178) / 255, (b || 245) / 255);
};

export default function BuildingScene({ className = '', label, explodeRef, rotate = true, showDims = true, distance = 25, lineVar = '--c-tint' }) {
  const mount = useRef(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return undefined; // no WebGL: the surrounding layout still reads without the model
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    const target = new THREE.Vector3(0, 5.4, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.autoRotate = rotate && !reduce;
    controls.autoRotateSpeed = 0.7;

    scene.add(new THREE.HemisphereLight(0xfff0dc, 0x1c1c1e, 1.05));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(9, 16, 11);
    scene.add(sun);

    const concrete = new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.85 });
    const colMat = new THREE.MeshStandardMaterial({ color: 0xb5aea2, roughness: 0.7 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdccdb6, roughness: 0.95 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xf28c28, metalness: 0.55, roughness: 0.4 });
    const edgeMat = new THREE.LineBasicMaterial({ color: tintColor(lineVar), transparent: true, opacity: 0.55 });

    const box = (w, h, d, mat, x, y, z, edges = true) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, y, z);
      if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
      return m;
    };

    const colXs = [-W / 2, -W / 6, W / 6, W / 2];
    const colZs = [-D / 2, 0, D / 2];

    // Ground: blueprint grid + footprint outline.
    const grid = new THREE.GridHelper(26, 26, tintColor(lineVar), tintColor(lineVar));
    grid.material.transparent = true;
    grid.material.opacity = 0;
    grid.position.y = -0.02;
    scene.add(grid);
    const fp = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-W / 2 - 1, 0.02, -D / 2 - 1), new THREE.Vector3(W / 2 + 1, 0.02, -D / 2 - 1),
        new THREE.Vector3(W / 2 + 1, 0.02, D / 2 + 1), new THREE.Vector3(-W / 2 - 1, 0.02, D / 2 + 1),
      ]),
      new THREE.LineBasicMaterial({ color: tintColor(lineVar), transparent: true, opacity: 0 }),
    );
    scene.add(fp);

    const floors = [];
    for (let i = 0; i <= FLOORS; i += 1) {
      const g = new THREE.Group();
      g.position.y = i * FH;
      g.add(box(W + 0.8, 0.26, D + 0.8, concrete, 0, 0.13, 0)); // slab
      if (i < FLOORS) {
        colXs.forEach((x) => colZs.forEach((z) => g.add(box(0.42, FH - 0.26, 0.42, colMat, x, 0.26 + (FH - 0.26) / 2, z))));
        [-D / 2, 0, D / 2].forEach((z) => g.add(box(W, 0.34, 0.26, colMat, 0, FH - 0.2, z))); // beams along x
        g.add(box(W, FH - 0.6, 0.2, wallMat, 0, 0.26 + (FH - 0.6) / 2, -D / 2 + 0.1)); // back masonry wall
        g.add(box(0.2, FH - 0.6, D, wallMat, W / 2 - 0.1, 0.26 + (FH - 0.6) / 2, 0)); // side wall
        if (i < 2) g.add(box(W / 3, FH - 0.6, 0.2, wallMat, 0, 0.26 + (FH - 0.6) / 2, D / 2 - 0.1)); // front infill
      } else {
        colXs.forEach((x) => colZs.forEach((z) => {
          const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), steel);
          r.position.set(x, 0.26 + 0.65, z);
          g.add(r);
        }));
      }
      g.scale.y = 0.001;
      g.visible = false;
      scene.add(g);
      floors.push(g);
    }

    // Dimension markers (width along the front, height up the left side).
    const dimMat = new THREE.LineBasicMaterial({ color: 0xf28c28, transparent: true, opacity: 0 });
    const dimLine = (a, b) => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), dimMat);
      scene.add(l);
    };
    const zf = D / 2 + 1.8;
    const xl = -W / 2 - 1.6;
    const top = FLOORS * FH + 0.26;
    dimLine(new THREE.Vector3(-W / 2, 0.03, zf), new THREE.Vector3(W / 2, 0.03, zf));
    dimLine(new THREE.Vector3(-W / 2, 0.03, zf - 0.3), new THREE.Vector3(-W / 2, 0.03, zf + 0.3));
    dimLine(new THREE.Vector3(W / 2, 0.03, zf - 0.3), new THREE.Vector3(W / 2, 0.03, zf + 0.3));
    dimLine(new THREE.Vector3(xl, 0, D / 2), new THREE.Vector3(xl, top, D / 2));
    dimLine(new THREE.Vector3(xl - 0.3, 0, D / 2), new THREE.Vector3(xl + 0.3, 0, D / 2));
    dimLine(new THREE.Vector3(xl - 0.3, top, D / 2), new THREE.Vector3(xl + 0.3, top, D / 2));

    // Dimension tags are DOM nodes projected onto the canvas each frame.
    const tags = showDims ? [
      { p: new THREE.Vector3(0, 0.3, zf + 0.2), text: `${W.toFixed(1)} m` },
      { p: new THREE.Vector3(xl - 0.2, top / 2, D / 2), text: `${top.toFixed(1)} m` },
    ].map((t) => {
      const n = document.createElement('span');
      n.textContent = t.text;
      n.setAttribute('aria-hidden', 'true');
      n.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;font:600 12px/1 "Roboto Mono",monospace;color:#101c35;background:#f28c28;padding:3px 6px;border-radius:3px;white-space:nowrap;will-change:transform';
      el.appendChild(n);
      return { ...t, n };
    }) : [];

    const mo = new MutationObserver(() => {
      const c = tintColor(lineVar);
      edgeMat.color.copy(c);
      grid.material.color.copy(c);
      fp.material.color.copy(c);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'class'] });

    let visible = true;
    let raf = 0;
    const start = performance.now();
    const v = new THREE.Vector3();

    const render = (now) => {
      const t = reduce ? 99 : (now - start) / 1000;
      const ex = explodeRef ? explodeRef.current : 0;
      const gp = clamp01(t / 0.9);
      grid.material.opacity = 0.28 * gp;
      fp.material.opacity = 0.9 * gp;
      floors.forEach((g, i) => {
        const p = clamp01((t - 0.8 - i * 0.5) / 0.75);
        g.visible = p > 0;
        g.scale.y = Math.max(0.001, ease(p));
        g.position.y = i * FH + ex * i * 1.5;
      });
      const dp = clamp01((t - (0.8 + FLOORS * 0.5 + 0.6)) / 0.6);
      dimMat.opacity = dp;
      controls.update();
      const w = el.clientWidth;
      const h = el.clientHeight;
      tags.forEach((tag) => {
        v.copy(tag.p).project(camera);
        tag.n.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
        tag.n.style.opacity = String(dp);
      });
      renderer.render(scene, camera);
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (visible) render(now);
    };

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      const k = w < 600 ? 1.5 : camera.aspect < 0.9 ? 1.45 : camera.aspect < 1.3 ? 1.2 : 1;
      const dir = new THREE.Vector3(15, 9.5, 20).normalize();
      camera.position.copy(target).addScaledVector(dir, distance * k);
      camera.updateProjectionMatrix();
      controls.update();
      render(performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      tags.forEach((tag) => tag.n.remove());
      renderer.domElement.remove();
    };
  }, [explodeRef, rotate, showDims, distance, lineVar]);

  return <div ref={mount} className={`relative ${className}`} role="img" aria-label={label || 'Interactive 3D model of a reinforced concrete framed building. Drag to rotate.'} />;
}
