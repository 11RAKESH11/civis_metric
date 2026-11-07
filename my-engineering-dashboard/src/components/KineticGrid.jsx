import { useEffect, useRef } from 'react';

// Interactive grid background (ported from a TypeScript component to JSX). The grid bends toward the
// pointer and ripples where you click. Differences from the original: it is sized to its parent
// instead of the window, follows the light/dark theme, draws crisply on high-DPI screens, and only
// runs its animation loop while something is moving, so it costs nothing when the page is idle.
const CELL_SIZE = 55;
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const DOT_SPACING = 28;
const LERP_SPEED = 0.08;
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;
const OFFSCREEN = -9999;

const THEMES = {
  light: {
    line: { r: 28, g: 28, b: 30, a: 0.1 },
    node: { r: 28, g: 28, b: 30, a: 0.2 },
    dot: 'rgba(28,28,30,0.07)',
    lineActive: { r: 194, g: 80, b: 12, a: 0.85 },
    nodeActive: { r: 194, g: 80, b: 12, a: 1 },
    glow: '194,80,12',
    ripple: '194,80,12',
  },
  dark: {
    line: { r: 255, g: 255, b: 255, a: 0.13 },
    node: { r: 255, g: 255, b: 255, a: 0.2 },
    dot: 'rgba(255,255,255,0.05)',
    lineActive: { r: 242, g: 140, b: 40, a: 0.9 },
    nodeActive: { r: 255, g: 186, b: 130, a: 1 },
    glow: '242,140,40',
    ripple: '255,186,130',
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const mixColor = (base, active, t) =>
  `rgba(${Math.round(lerp(base.r, active.r, t))},${Math.round(lerp(base.g, active.g, t))},${Math.round(lerp(base.b, active.b, t))},${lerp(base.a, active.a, t).toFixed(3)})`;

function warpedPoint(gx, gy, col, row, mouse, ripples, cols, rows) {
  // Edge pin: boundary rows and columns stay put.
  const edge = 1.5;
  const colPin = Math.min(col / edge, (cols - 1 - col) / edge, 1);
  const rowPin = Math.min(row / edge, (rows - 1 - row) / edge, 1);
  const pin = colPin * colPin * rowPin * rowPin;

  const dx = gx - mouse.x;
  const dy = gy - mouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pin;

  let rx = 0;
  let ry = 0;
  for (const r of ripples) {
    const rdx = gx - r.x;
    const rdy = gy - r.y;
    const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
    const waveWidth = 55;
    const diff = rdist - r.radius;
    if (Math.abs(diff) < waveWidth) {
      const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pin;
      const angle = Math.atan2(rdy, rdx);
      const sign = diff < 0 ? -1 : 1;
      rx += Math.cos(angle) * strength * sign * -1;
      ry += Math.sin(angle) * strength * sign * -1;
    }
  }

  if (dist < INFLUENCE_RADIUS && dist > 0 && pin > 0) {
    const t = dist / INFLUENCE_RADIUS;
    const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
    const warp = eased * MAX_WARP * pin;
    const angle = Math.atan2(dy, dx);
    return { x: gx - Math.cos(angle) * warp + rx, y: gy - Math.sin(angle) * warp + ry, proximity };
  }
  return { x: gx + rx, y: gy + ry, proximity };
}

export default function KineticGrid({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const s = {
      w: 0,
      h: 0,
      mouse: { x: OFFSCREEN, y: OFFSCREEN },
      target: { x: OFFSCREEN, y: OFFSCREEN },
      ripples: [],
      raf: 0,
    };
    const themeName = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const draw = (now) => {
      const { w: W, h: H, mouse, ripples } = s;
      const theme = THEMES[themeName()];
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = theme.dot;
      for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);
      const pts = [];
      for (let row = 0; row < rows; row += 1) {
        pts[row] = [];
        for (let col = 0; col < cols; col += 1) pts[row][col] = warpedPoint(col * cellW, row * cellH, col, row, mouse, ripples, cols, rows);
      }

      const seg = (a, b) => {
        const avg = (a.proximity + b.proximity) / 2;
        const t = avg * avg * (3 - 2 * avg);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = mixColor(theme.line, theme.lineActive, t);
        ctx.lineWidth = lerp(0.8, 1.5, t);
        ctx.stroke();
      };
      for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols - 1; col += 1) seg(pts[row][col], pts[row][col + 1]);
      for (let col = 0; col < cols; col += 1) for (let row = 0; row < rows - 1; row += 1) seg(pts[row][col], pts[row + 1][col]);

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const p = pts[row][col];
          const t = p.proximity * p.proximity * (3 - 2 * p.proximity);
          const r = lerp(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);
          if (t > 0.3) {
            const glowR = r + lerp(0, 6, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
            grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3).toFixed(3)})`);
            grd.addColorStop(1, `rgba(${theme.glow},0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = mixColor(theme.node, theme.nodeActive, t);
          ctx.fill();
        }
      }

      for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    // The loop runs only while the grid is still moving.
    const tick = (now) => {
      s.mouse.x = lerp(s.mouse.x, s.target.x, LERP_SPEED);
      s.mouse.y = lerp(s.mouse.y, s.target.y, LERP_SPEED);
      draw(now);
      const settled = Math.abs(s.mouse.x - s.target.x) < 0.5 && Math.abs(s.mouse.y - s.target.y) < 0.5;
      s.raf = !settled || s.ripples.length ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!s.raf) s.raf = requestAnimationFrame(tick); };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = parent.clientWidth;
      s.h = parent.clientHeight;
      canvas.width = Math.round(s.w * dpr);
      canvas.height = Math.round(s.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e) => {
      const p = local(e);
      if (s.mouse.x === OFFSCREEN) s.mouse = { ...p }; // appear under the pointer, not from off-screen
      s.target = p;
      kick();
    };
    const onClick = (e) => {
      const p = local(e);
      s.ripples.push({ x: p.x, y: p.y, radius: 0, opacity: 1, born: performance.now() });
      kick();
    };
    const onLeave = () => {
      s.mouse = { x: OFFSCREEN, y: OFFSCREEN };
      s.target = { x: OFFSCREEN, y: OFFSCREEN };
      draw(performance.now());
    };

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const mo = new MutationObserver(() => draw(performance.now()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (!reduce) {
      window.addEventListener('mousemove', onMove, { passive: true });
      window.addEventListener('click', onClick, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
    }
    resize();

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`print:hidden ${className}`} />;
}
