import { memo } from "react";
import styles from "./Toast.module.css";

function ToastItem({ toast, onDismiss }) {
  const icon = toast.type === "error" ? "✕" : toast.type === "warning" ? "!" : toast.type === "info" ? "i" : "✓";
  return (
    <div className={`${styles.toast} ${styles[toast.type] ?? styles.success}`}>
      <span className={styles.toastIcon}>{icon}</span>
      <span className={styles.toastMessage}>{toast.message}</span>
      <button className={styles.dismissBtn} onClick={() => onDismiss(toast.id)} type="button" aria-label="Dismiss">×</button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

export default memo(ToastContainer);
