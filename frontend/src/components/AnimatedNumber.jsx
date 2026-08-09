// Plain number display — no animation, just shows the value.
export default function AnimatedNumber({ value, decimals = 0, suffix = "", prefix = "" }) {
  const formatted = decimals > 0
    ? Number(value).toFixed(decimals)
    : String(Math.round(Number(value)));
  return <span>{prefix}{formatted}{suffix}</span>;
}
