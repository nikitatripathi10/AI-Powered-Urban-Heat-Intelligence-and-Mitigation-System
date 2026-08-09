import { useEffect, useState, useRef } from "react";
import { animate } from "framer-motion";

export default function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
}) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
