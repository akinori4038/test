import { fetchWeatherMarine } from "./forecast.js";
import { renderForecast } from "./forecastTable.js";

/* --- 追跡用の配列（lat, lng のみ） --- */
export let trackCoords = [];

/* --- ウェイポイント --- */
let waypoint = null;
let waypointMarker = null;
let waypointLine = null;

/* --- 状態フラグ --- */
let isTracking = true;   // 中央固定 ON/OFF
let isPathOn = false;    // 軌跡 ON/OFF（初期OFF）

/* --- カヤック SVG アイコン（誤記修正済み） --- */
const kayakSvg = `<svg width="60" height="60" viewBox="0 0 100 100"
xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="kayakBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4de0d8"/>
      <stop offset="50%" stop-color="#1fb5ad"/>
      <stop offset="100%" stop-color="#0e7f79"/>
    </linearGradient>

    <linearGradient id="cockpitGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#777"/>
      <stop offset="100%" stop-color="#222"/>
    </linearGradient>

    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>

  <path d="M50 3 C56 22, 60 40, 60 50 C60 60, 56 78, 50 97 C44 78, 40 60, 40 50 C40 40, 44 22, 50 3 Z"
        fill="url(#kayakBody)" stroke="#0a5f5a" stroke-width="3" filter="url(#dropShadow)"/>

  <path d="M50 6 C55 22, 58 40, 58 50 C58 60, 55 78, 50 94"
        stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none"/>

  <ellipse cx="50" cy="50" rx="5" ry="15"
           fill="url(#cockpitGrad)" stroke="#000" stroke-width="3"/>

  <line x1="50" y1="3" x2="50" y2="22" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
  <line x1="50" y1="78" x2="50" y2="97" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
</svg>`;

const kayakIcon = L.icon({
  iconUrl: "data:image/svg+xml;utf8," + encodeURIComponent(kayakSvg),
  iconSize: [76, 76],
  iconAnchor: [38, 38],
});

/* --- 距離計算（m） --- */
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* --- 方位計算（°） --- */
function calcBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.cos(toRad(lon2 - lon1));

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* --- map.js のメイン --- */
export function initMap() {

  const map = L.map("map").setView([35.681236, 139.767125], 17);
  window._leaflet_map_instance = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  let marker = null;
  let trackLine = L.polyline([], { color: "red", weight: 3 }).addTo(map);

  const trackChk = document.getElementById("trackChk");
  const pathBtn = document.getElementById("pathBtn");
  const wpClearBtn = document.getElementById("wpClearBtn");
  const navInfo = document.getElementById("navInfo");

  /* --- 初期状態 --- */
  isTracking = trackChk.checked;  // 中央固定
  wpClearBtn.style.background = "#888";
  wpClearBtn.disabled = true;

  /* --- WP削除処理 --- */
  function clearWaypoint() {
    waypoint = null;

    if (waypointMarker) {
      map.removeLayer(waypointMarker);
      waypointMarker = null;
    }

    if (waypointLine) {
      map.removeLayer(waypointLine);
      waypointLine = null;
    }

    navInfo.textContent = "";

    wpClearBtn.style.background = "#888";
    wpClearBtn.disabled = true;
  }

  wpClearBtn.addEventListener("click", clearWaypoint);

  /* --- WP設定（地図タップ） --- */
  map.on("click", (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    waypoint = [lat, lng];

    if (waypointMarker) map.removeLayer(waypointMarker);
    waypointMarker = L.marker([lat, lng]).addTo(map);

    if (waypointLine) map.removeLayer(waypointLine);
    waypointLine = L.polyline([], { color: "blue", weight: 2 }).addTo(map);

    navInfo.textContent = "";

    wpClearBtn.style.background = "#0078d4";
    wpClearBtn.disabled = false;
  });

  /* --- 位置更新（常に実行） --- */
  async function onLocationUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const heading = pos.coords.heading;

    /* --- カヤックアイコンは常に更新 --- */
    if (!marker) {
      marker = L.marker([lat, lng], {
        icon: kayakIcon,
        rotationAngle: heading || 0,
        rotationOrigin: "center center"
      }).addTo(map);
    } else {
      marker.setLatLng([lat, lng]);
      marker.setRotationAngle(heading || 0);
    }

    /* --- 軌跡 ON のときだけ描く --- */
    if (isPathOn) {
      trackCoords.push([lat, lng]);
      trackLine.setLatLngs(trackCoords);
    }

    /* --- 中央固定 ON のときだけ panTo --- */
    if (isTracking) {
      map.panTo([lat, lng], { animate: false });
    }

    /* --- WPがある場合 --- */
    if (waypoint) {
      const [wlat, wlng] = waypoint;

      const dist = calcDistance(lat, lng, wlat, wlng);
      const bearing = calcBearing(lat, lng, wlat, wlng);

      const distStr = dist >= 1000
        ? `${(dist / 1000).toFixed(2)} km`
        : `${dist.toFixed(0)} m`;

      navInfo.textContent = `距離: ${distStr}　方位: ${bearing.toFixed(1)}°`;

      waypointLine.setLatLngs([[lat, lng], [wlat, wlng]]);

      if (dist <= 5) {
        clearWaypoint();
        navInfo.textContent = "ウェイポイント到達 → 自動削除";
      }
    }

    /* --- 天気更新（地図タブのみ） --- */
    const isMapActive = document.getElementById("mapScreen").classList.contains("active");
    if (isMapActive) {
      const { weather, marine } = await fetchWeatherMarine(lat, lng);
      if (weather && marine) {
        renderForecast(weather, marine);
      }
    }
  }

  navigator.geolocation.watchPosition(onLocationUpdate, (err) => {
    console.warn("位置情報エラー:", err.message);
  }, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
  });

  /* --- 中央固定チェックボックス --- */
  trackChk.addEventListener("change", () => {
    isTracking = trackChk.checked;
  });

  /* --- 軌跡ボタン（ON/OFF） --- */
  pathBtn.textContent = "軌跡OFF";
  pathBtn.style.background = "#888";

  pathBtn.addEventListener("click", () => {
    isPathOn = !isPathOn;

    if (isPathOn) {
      pathBtn.textContent = "軌跡ON";
      pathBtn.style.background = "#0078d4";
    } else {
      pathBtn.textContent = "軌跡OFF";
      pathBtn.style.background = "#888";
    }
  });

  document.getElementById("tabMap").addEventListener("click", () => {
    setTimeout(() => map.invalidateSize(), 50);
  });
}