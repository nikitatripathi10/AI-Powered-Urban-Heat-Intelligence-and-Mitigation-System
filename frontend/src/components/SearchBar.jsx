import { motion } from "framer-motion";
import styles from "./SearchBar.module.css";

export default function SearchBar({ value, onChange, placeholder = "Search zone ID or risk level..." }) {
  return (
    <motion.div
      className={styles.searchBar}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className={styles.searchIcon}>⌕</span>
      <input
        type="text"
        className={styles.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search hotspots"
      />
      {value && (
        <button
          className={styles.clearBtn}
          onClick={() => onChange("")}
          type="button"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}
