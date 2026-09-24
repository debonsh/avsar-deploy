// Mono buttons — amicro `magnetic-button` / `glow-button`, vendored.
// The published npm tarball ships no CLI binary, so this is the copy-to-code
// equivalent: motion/react imports, exact transition props, hover gated behind
// a fine pointer so touch taps never stick. Decorative pointer physics —
// reserve for rare moments (Labs demos), never for high-frequency controls.
import { useRef, useState } from "react";
import { motion, useSpring } from "motion/react";
import { cn } from "./ui.jsx";

// Follows the cursor within `range` px, springs back on leave. Spring values
// are pointer-driven (useSpring is the documented pattern for that); the CSS
// transition covers only `scale` so it never fights the spring transform.
export function MagneticButton({ children, range = 45, strength = 0.35, className = "", onClick, ...rest }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 150, damping: 15, mass: 0.6 });
  const y = useSpring(0, { stiffness: 150, damping: 15, mass: 0.6 });

  const move = (e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const dx = e.clientX - (left + width / 2);
    const dy = e.clientY - (top + height / 2);
    if (Math.hypot(dx, dy) < range) {
      x.set(dx * strength);
      y.set(dy * strength);
    } else {
      x.set(0);
      y.set(0);
    }
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onMouseMove={move}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ x, y }}
      className={cn(
        "relative inline-flex h-11 cursor-pointer select-none items-center justify-center rounded-full border-0 bg-neutral-900 px-6 text-sm font-semibold text-white shadow transition-[scale] duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.03] active:scale-[0.96] dark:bg-white dark:text-black",
        className
      )}
      {...rest}
    >
      <span className="pointer-events-none relative z-10 block">{children}</span>
    </motion.button>
  );
}

// Cursor-tracking radial glow. Opacity is state-driven (exact transition on
// opacity only); the glow position rides inline style, no layout involved.
export function GlowButton({ children, className = "", glowColor = "rgba(88, 101, 242, 0.22)", onClick, ...rest }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);

  return (
    <button
      ref={ref}
      type="button"
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 px-6 text-sm font-medium text-white shadow-md transition-[scale,background-color,border-color] duration-150 ease-out hover:border-neutral-700 active:scale-[0.96]",
        className
      )}
      {...rest}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-xl transition-opacity duration-300"
        style={{
          opacity: on ? 1 : 0,
          background: `radial-gradient(120px circle at ${pos.x}px ${pos.y}px, ${glowColor}, transparent 80%)`,
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
