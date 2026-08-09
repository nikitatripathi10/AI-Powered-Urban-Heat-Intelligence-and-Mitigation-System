import { memo, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LEVELS, LEVEL_CONFIG } from "../data/hotspots";
import styles from "./MapPanel.module.css";

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const FLY_OPTIONS = { duration: 1.2, easeLinearity: 0.25 };

function formatCoords(lat, lng) {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}  ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;
}

function MapBridge({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 200);
    const ro = new ResizeObserver(() => map.invalidateSize());
    const el = map.getContainer();
    if (el) ro.observe(el);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [map, mapRef]);
  return null;
}

function MapFlyTo({ center, zoom }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    const key = `${center[0]}-${center[1]}`;
    if (prev.current !== key) { map.flyTo(center, zoom, FLY_OPTIONS); prev.current = key; }
  }, [center, zoom, map]);
  return null;
}

const HotspotCircle = memo(function HotspotCircle({ hotspot, selected, onSelect, visible, isPulsing }) {
  const handleClick = useCallback(() => onSelect(hotspot), [hotspot, onSelect]);
  if (!visible || !hotspot) return null;
  const isSelected = selected?.id === hotspot.id;
  return (
    <Circle
      center={[hotspot.lat, hotspot.lng]}
      radius={hotspot.radius}
      pathOptions={{
        color:       isSelected ? "#ffffff" : hotspot.color,
        fillColor:   hotspot.color,
        fillOpacity: isSelected ? Math.min(hotspot.fillOpacity + 0.15, 0.7) : hotspot.fillOpacity,
        weight:      isSelected ? 2.5 : isPulsing ? 2 : 1.5,
        opacity:     1,
        className:   isPulsing ? styles.pulsing : undefined,
      }}
      eventHandlers={{ click: handleClick }}
    />
  );
});

function MapPanel({ city, cityConfig, hotspots, layers, onZoneSelect, selectedZone, pulseIds = [], isSimulating = false }) {
  const mapRef = useRef(null);
  const center = cityConfig?.center ?? [28.6139, 77.209];
  const zoom   = cityConfig?.zoom   ?? 11;

  const handleZoomIn  = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleReset   = useCallback(() => mapRef.current?.flyTo(center, zoom, FLY_OPTIONS), [center, zoom]);

  const showHotspots = layers?.compositeRisk !== false;
  const displayCoords = selectedZone
    ? formatCoords(selectedZone.lat, selectedZone.lng)
    : formatCoords(center[0], center[1]);

  if (!hotspots) return null;

  return (
    <div className={styles.mapPanel}>
      <div className={styles.mapHeader}>
        <div className={styles.mapTitle}>
          <span className={styles.mapCity}>{city}</span>
          <span className={styles.mapSubtitle}>Heat Zone Map</span>
        </div>
        <div className={styles.mapControls}>
          <button className={styles.controlBtn} onClick={handleZoomIn}  type="button" aria-label="Zoom in">+</button>
          <button className={styles.controlBtn} onClick={handleZoomOut} type="button" aria-label="Zoom out">−</button>
          <button className={styles.controlBtn} onClick={handleReset}   type="button" aria-label="Reset">⟲</button>
        </div>
      </div>

      <div className={styles.mapCanvas}>
        <MapContainer center={center} zoom={zoom} className={styles.leafletMap}
          zoomControl={false} attributionControl={false}>
          <TileLayer url={DARK_TILES} />
          <MapBridge mapRef={mapRef} />
          <MapFlyTo center={center} zoom={zoom} />
          {hotspots.map(h => (
            <HotspotCircle key={`${city}-${h.id}`} hotspot={h}
              selected={selectedZone} onSelect={onZoneSelect}
              visible={showHotspots}
              isPulsing={isSimulating && pulseIds.includes(h.id)}
            />
          ))}
        </MapContainer>

        {selectedZone && (
          <div className={styles.selectedBadge}>
            Zone {selectedZone.id} · {selectedZone.level}
          </div>
        )}

        <div className={styles.mapLegend}>
          {LEVELS.map(level => (
            <div key={level} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: LEVEL_CONFIG[level].color }} />
              <span className={styles.legendLabel}>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mapFooter}>
        <span className={styles.coord}>{displayCoords}</span>
        <span className={styles.liveIndicator}>
          <span className={`${styles.liveDot} ${isSimulating ? styles.simulating : ""}`} />
          {isSimulating ? "simulating" : "live"} · {hotspots.length} zones
        </span>
      </div>
    </div>
  );
}

export default memo(MapPanel);
