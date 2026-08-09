import { memo } from "react";
import styles from "./Skeleton.module.css";

export function SkeletonLine({ width = "100%", height = 12 }) {
  return <div className={styles.skeleton} style={{ width, height }} />;
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <SkeletonLine width="40%" height={9} />
      <SkeletonLine width="60%" height={20} />
      <SkeletonLine width="30%" height={9} />
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
