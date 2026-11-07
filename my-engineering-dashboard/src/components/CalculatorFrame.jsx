import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Calculators put inputs and the model side by side only when *this frame* has room for both
// (the `wide:` variant in tailwind.config.js). Using the viewport width instead collapsed the
// 3D viewer to 0px at 1280px once the sidebar took its share.
const WIDE_MIN = 900;

export default function CalculatorFrame({ children }) {
  const ref = useRef(null);
  const [wide, setWide] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    const update = () => setWide(el.clientWidth >= WIDE_MIN);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Switching layouts resizes the calculator's 3D viewport after its own window-resize handler
  // has already measured, so ask it to measure again once the new layout is in place.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.dispatchEvent(new Event('resize'));
  }, [wide]);

  return (
    <div ref={ref} className={`page-enter ${wide ? 'is-wide h-full' : ''}`}>
      {children}
    </div>
  );
}
