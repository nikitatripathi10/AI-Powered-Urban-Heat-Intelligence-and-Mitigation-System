import { memo, useState, useEffect } from "react";
import { fetchCatalogue } from "../utils/api";
import styles from "./InterventionCatalogue.module.css";

const LEVEL_COLORS = { extreme:"#f43f5e", high:"#f97316", moderate:"#fbbf24", safe:"#4ade80" };

function CoolBar({ value, max = 6 }) {
  const pct   = Math.min(100, (value / max) * 100);
  const color = pct > 66 ? "var(--good)" : pct > 33 ? "var(--yellow)" : "var(--warn)";
  return (
    <div className={styles.coolBarTrack}>
      <div className={styles.coolBarFill} style={{ width:`${pct}%`, background:color }} />
    </div>
  );
}

function CatalogueCard({ item, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.card}>
      <button className={styles.cardHeader} onClick={() => setOpen(o=>!o)} type="button">
        <span className={styles.cardIcon}>{item.icon}</span>
        <div className={styles.cardMeta}>
          <span className={styles.cardName}>{item.name}</span>
          <span className={styles.cardDesc}>{item.description}</span>
        </div>
        <div className={styles.cardQuick}>
          <span className={styles.qCost}>₹{item.cost_range_crore[0]}–{item.cost_range_crore[1]}Cr</span>
          <span className={styles.qCool}>−{item.cooling_effect_c[0]}–{item.cooling_effect_c[1]}°C</span>
        </div>
        <span className={styles.chevron}>{open?"▴":"▾"}</span>
      </button>

      {open && (
        <div className={styles.cardDetail}>
          <div className={styles.detailGrid}>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Cooling effectiveness</span>
              <CoolBar value={item.cooling_effect_c[1]} />
              <span className={styles.detailSub}>−{item.cooling_effect_c[0]} to −{item.cooling_effect_c[1]}°C</span>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Implementation time</span>
              <span className={styles.detailValue}>{item.implementation_weeks[0]}–{item.implementation_weeks[1]} weeks</span>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Cost per unit</span>
              <span className={styles.detailValue}>₹{item.cost_range_crore[0]}–{item.cost_range_crore[1]} Cr</span>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Best for</span>
              <div className={styles.levelChips}>
                {item.best_for.map(l => (
                  <span key={l} className={styles.levelChip}
                    style={{ background:`${LEVEL_COLORS[l]}18`, color:LEVEL_COLORS[l], borderColor:`${LEVEL_COLORS[l]}44` }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.coBenefits}>
            <span className={styles.detailLabel}>Co-benefits</span>
            <div className={styles.coBenefitChips}>
              {item.co_benefits.map(b => <span key={b} className={styles.coBenefitChip}>{b}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InterventionCatalogue({ onClose }) {
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");

  useEffect(() => {
    fetchCatalogue()
      .then(d => setCatalogue(d.catalogue ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? catalogue : catalogue.filter(c => c.best_for.includes(filter));

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Intervention catalogue">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalTitle}>Intervention Catalogue</span>
            <span className={styles.modalSub}>All available cooling interventions</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        <div className={styles.filterRow}>
          {["all","extreme","high","moderate","safe"].map(f => (
            <button key={f}
              className={`${styles.filterChip} ${filter===f ? styles.filterActive : ""}`}
              onClick={() => setFilter(f)} type="button"
              style={filter===f && f!=="all" ? { borderColor:LEVEL_COLORS[f], color:LEVEL_COLORS[f] } : undefined}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          {loading && <div className={styles.skeletonList}>{[...Array(4)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>}
          {!loading && filtered.map((item,i) => <CatalogueCard key={item.id} item={item} index={i} />)}
        </div>
      </div>
    </div>
  );
}

export default memo(InterventionCatalogue);
