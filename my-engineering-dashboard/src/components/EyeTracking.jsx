import { useEffect, useRef } from 'react';

// A pair of eyes that follow the pointer (ported from a TypeScript/framer-motion component to plain JSX).
// All motion is written straight to element styles from one animation loop, so React never re-renders
// while the eyes move. `shut` closes the lids (used while a password is being typed). Respects reduced
// motion: the eyes then stay still and open.
const lerp = (a, b, t) => a + (b - a) * t;

function Eye({ size, pointer, shutRef, index }) {
  const eyeRef = useRef(null);
  const irisRef = useRef(null);
  const pupilRef = useRef(null);

  const w = size;
  const h = size * 0.85;
  const iris = size * 0.46;
  const pupil = iris * 0.5;
  const maxOffset = (w / 2 - iris / 2) * 0.62;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const st = { x: 0, y: 0, lid: 1, dilate: 1, blink: false };
    let raf = 0;
    let blinkTimer = 0;

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        st.blink = true;
        window.setTimeout(() => { st.blink = false; scheduleBlink(); }, 140);
      }, 2800 + Math.random() * 2600 + index * 350);
    };
    scheduleBlink();

    const loop = () => {
      const eye = eyeRef.current;
      if (eye) {
        const r = eye.getBoundingClientRect();
        const dx = pointer.current.x - (r.left + r.width / 2);
        const dy = pointer.current.y - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const reach = Math.min(dist, maxOffset * 3) / (maxOffset * 3);
        st.x = lerp(st.x, Math.cos(angle) * reach * maxOffset, 0.2);
        st.y = lerp(st.y, Math.sin(angle) * reach * maxOffset, 0.2);
        st.dilate = lerp(st.dilate, dist < 220 ? 1.25 - (dist / 220) * 0.2 : 0.9, 0.1);
        st.lid = lerp(st.lid, shutRef.current || st.blink ? 0.06 : 1, 0.35);
        eye.style.transform = `scaleY(${st.lid.toFixed(3)})`;
        if (irisRef.current) irisRef.current.style.transform = `translate(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px)`;
        if (pupilRef.current) pupilRef.current.style.transform = `scale(${st.dilate.toFixed(3)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); clearTimeout(blinkTimer); };
  }, [pointer, shutRef, index, maxOffset]);

  return (
    <div
      ref={eyeRef}
      className="relative overflow-hidden rounded-full"
      style={{ width: w, height: h, background: 'radial-gradient(circle at 35% 35%, #FFFFFF, #F3EEE8 70%, #E6DFD6)', boxShadow: 'inset 0 2px 8px rgb(0 0 0 / 0.18), 0 6px 18px rgb(0 0 0 / 0.35)', willChange: 'transform' }}
    >
      <div ref={irisRef} className="absolute rounded-full" style={{ width: iris, height: iris, left: w / 2 - iris / 2, top: h / 2 - iris / 2, background: 'radial-gradient(circle at 40% 40%, #F28C28, #C2500C 62%, #8F3705)', boxShadow: 'inset 0 2px 6px rgb(0 0 0 / 0.35)', willChange: 'transform' }}>
        <div ref={pupilRef} className="absolute rounded-full bg-black" style={{ width: pupil, height: pupil, left: iris / 2 - pupil / 2, top: iris / 2 - pupil / 2 }} />
        <span aria-hidden="true" className="absolute rounded-full" style={{ width: pupil * 0.38, height: pupil * 0.38, left: iris * 0.28, top: iris * 0.22, background: 'rgb(255 255 255 / 0.92)' }} />
        <span aria-hidden="true" className="absolute rounded-full" style={{ width: pupil * 0.16, height: pupil * 0.16, left: iris * 0.58, top: iris * 0.6, background: 'rgb(255 255 255 / 0.7)' }} />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" style={{ height: h * 0.34, background: 'linear-gradient(to bottom, rgb(0 0 0 / 0.14), transparent)' }} />
    </div>
  );
}

export default function EyeTracking({ size = 96, gap = 28, shut = false, className = '' }) {
  const pointer = useRef({ x: 0, y: 0 });
  const shutRef = useRef(shut);

  useEffect(() => { shutRef.current = shut; }, [shut]);

  useEffect(() => {
    pointer.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const onMove = (e) => { pointer.current = { x: e.clientX, y: e.clientY }; };
    const onTouch = (e) => { const t = e.touches[0]; if (t) pointer.current = { x: t.clientX, y: t.clientY }; };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('touchmove', onTouch); };
  }, []);

  return (
    <div aria-hidden="true" className={`flex items-center justify-center ${className}`} style={{ gap }}>
      {[0, 1].map((i) => <Eye key={i} index={i} size={size} pointer={pointer} shutRef={shutRef} />)}
    </div>
  );
}
