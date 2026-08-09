import { memo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LEVELS, LEVEL_CONFIG } from "../data/hotspots";
import styles from "./MapPanel.module.css";

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const FLY_OPTIONS = { duration: 1.4, easeLinearity: 0.25 };

function formatCoords(lat, lng) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `LAT ${Math.abs(lat).toFixed(4)}° ${latDir} · LON ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

function MapBridge({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    const timer = setTimeout(() => map.invalidateSize(), 200);
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    if (container) resizeObserver.observe(container);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [map, mapRef]);

  return null;
}

function MapFlyTo({ center, zoom }) {
  const map = useMap();
  const prevKey = useRef(null);

  useEffect(() => {
    const key = `${center[0]}-${center[1]}`;
    if (prevKey.current !== key) {
      map.flyTo(center, zoom, FLY_OPTIONS);
      prevKey.current = key;
    }
  }, [center, zoom, map]);

  return null;
}

const HotspotCircle = memo(function HotspotCircle({
  hotspot,
  selected,
  onSelect,
  visible,
  isPulsing,
}) {
  const handleClick = useCallback(() => onSelect(hotspot), [hotspot, onSelect]);

  if (!visible || !hotspot) return null;

  const isSelected = selected?.id === hotspot.id;

  return (
    <Circle
      center={[hotspot.lat, hotspot.lng]}
      radius={hotspot.radius}
      pathOptions={{
        color: isSelected ? "#ffffff" : hotspot.color,
        fillColor: hotspot.color,
        fillOpacity: isSelected
          ? Math.min(hotspot.fillOpacity + 0.15, 0.7)
          : hotspot.fillOpacity,
        weight: isSelected ? 3 : isPulsing ? 2.5 : 1.5,
        opacity: isSelected || isPulsing ? 1 : 0.85,
        className: isPulsing ? styles.pulsing : undefined,
      }}
      eventHandlers={{ click: handleClick }}
    />
  );
});

function MapPanel({
  city,
  cityConfig,           // { center: [lat, lng], zoom, bounds }
  hotspots,
  layers,
  onZoneSelect,
  selectedZone,
  pulseIds = [],
  isSimulating = false,
}) {
  const mapRef = useRef(null);

  const center = cityConfig?.center ?? [28.6139, 77.209];
  const zoom   = cityConfig?.zoom   ?? 11;

  const handleZoomIn  = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleReset   = useCallback(
    () => mapRef.current?.flyTo(center, zoom, FLY_OPTIONS),
    [center, zoom]
  );

  const showHotspots = layers?.compositeRisk !== false;

  const displayCoords = selectedZone
    ? formatCoords(selectedZone.lat, selectedZone.lng)
    : formatCoords(center[0], center[1]);

  if (!hotspots) return null;

  return (
    <motion.div
      className={styles.mapPanel}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15 }}
    >
      <div className={styles.mapHeader}>
        <div className={styles.mapTitle}>
          <span className={styles.mapCity}>{city}</span>
          <span className={styles.mapSubtitle}>Heat Zone Map</span>
        </div>
        <div className={styles.mapControls}>
          <button className={styles.controlBtn} onClick={handleZoomIn}  type="button" aria-label="Zoom in">+</button>
          <button className={styles.controlBtn} onClick={handleZoomOut} type="button" aria-label="Zoom out">−</button>
          <button className={styles.controlBtn} onClick={handleReset}   type="button" aria-label="Reset view">⟲</button>
        </div>
      </div>

      <div className={styles.mapCanvas}>
        <MapContainer
          center={center}
          zoom={zoom}
          className={styles.leafletMap}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={DARK_TILES} />
          <MapBridge mapRef={mapRef} />
          {/* MapFlyTo re-fires whenever center/zoom change */}
          <MapFlyTo center={center} zoom={zoom} />

          {hotspots.map((hotspot) => (
            <HotspotCircle
              key={`${city}-${hotspot.id}`}
              hotspot={hotspot}
              selected={selectedZone}
              onSelect={onZoneSelect}
              visible={showHotspots}
              isPulsing={isSimulating && pulseIds.includes(hotspot.id)}
            />
          ))}
        </MapContainer>

        {selectedZone && (
          <motion.div
            className={styles.selectedBadge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            key={selectedZone.id}
          >
            Zone {selectedZone.id} · {selectedZone.level}
          </motion.div>
        )}

        <motion.div
          className={styles.mapLegend}
          key={city}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {LEVELS.map((level) => (
            <div key={level} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: LEVEL_CONFIG[level].color }}
              />
              <span className={styles.legendLabel}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className={styles.mapFooter}>
        <motion.span
          className={styles.coord}
          key={displayCoords}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {displayCoords}
        </motion.span>
        <span className={styles.liveIndicator}>
          <span className={`${styles.liveDot} ${isSimulating ? styles.simulating : ""}`} />
          {isSimulating ? "SIMULATING" : "LIVE"} · {hotspots.length} HOTSPOTS
        </span>
      </div>
    </motion.div>
  );
}

export default memo(MapPanel);
