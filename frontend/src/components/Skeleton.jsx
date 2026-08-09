import { memo } from "react";
import { motion } from "framer-motion";
import styles from "./Skeleton.module.css";

export function SkeletonLine({ width = "100%", height = 12 }) {
  return (
    <motion.div
      className={styles.skeleton}
      style={{ width, height }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <SkeletonLine width="40%" height={10} />
      <SkeletonLine width="60%" height={24} />
      <SkeletonLine width="30%" height={10} />
    </div>
  );
}

export function SkeletonPanel({ count = 3 }) {
  return (
    <div className={styles.panel}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default memo(SkeletonPanel);
