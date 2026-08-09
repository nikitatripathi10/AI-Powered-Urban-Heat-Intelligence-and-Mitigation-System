import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import styles from "./App.module.css";

export default function App() {
  const [page, setPage] = useState("dashboard");
  return (
    <div className={styles.app}>
      {page !== "dashboard" && (
        <nav className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => setPage("dashboard")} type="button">
            ← Dashboard
          </button>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>◆</span>
            <span className={styles.navName}>THERMA</span>
          </div>
        </nav>
      )}
      <div className={styles.pageWrap}>
        {page === "dashboard" && <Dashboard onNavigate={setPage} />}
        {page === "analytics" && <Analytics />}
      </div>
    </div>
  );
}
