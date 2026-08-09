import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Toast.module.css";

function ToastItem({ toast, onDismiss }) {
  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type] ?? styles.success}`}
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      layout
    >
      <span className={styles.toastIcon}>
        {toast.type === "warning" ? "⚠" : toast.type === "info" ? "◆" : "✓"}
      </span>
      <span className={styles.toastMessage}>{toast.message}</span>
      <button
        className={styles.dismissBtn}
        onClick={() => onDismiss(toast.id)}
        type="button"
        aria-label="Dismiss"
      >
        ×
      </button>
    </motion.div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div className={styles.container} aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default memo(ToastContainer);
