import { fetchWeatherMarine } from "./forecast.js";
import { renderForecast } from "./forecastTable.js";

/* --- 追跡用の配列（lat, lng のみ） --- */
export let trackCoords = [];

/* --- ウェイポイント --- */
let waypoint = null;
let waypointMarker = null;
let waypointLine = null;

/* --- カヤック SVG アイコン --- */
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

/* --- ★ ウェイポイント削除処理 --- */
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
  let watchId = null;

  const locBtn = document.getElementById("locBtn");
  const wpClearBtn = document.getElementById("wpClearBtn");
  const status = document.getElementById("status");
  const navInfo = document.getElementById("navInfo");

  /* --- WP削除ボタン --- */
  wpClearBtn.addEventListener("click", clearWaypoint);

  /* --- ウェイポイント設定（地図タップ） --- */
  map.on("click", (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    waypoint = [lat, lng];

    if (waypointMarker) map.removeLayer(waypointMarker);
    waypointMarker = L.marker([lat, lng], { color: "green" }).addTo(map);

    if (waypointLine) map.removeLayer(waypointLine);
    waypointLine = L.polyline([], { color: "blue", weight: 2 }).addTo(map);

    navInfo.textContent = "ウェイポイント設定済み";
  });

  /* --- 位置更新 --- */
  async function onLocationUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const heading = pos.coords.heading;

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

    trackCoords.push([lat, lng]);
    trackLine.setLatLngs(trackCoords);

    /* --- ウェイポイントがある場合 --- */
    if (waypoint) {
      const [wlat, wlng] = waypoint;

      const dist = calcDistance(lat, lng, wlat, wlng);
      const bearing = calcBearing(lat, lng, wlat, wlng);

      const distStr = dist >= 1000
        ? `${(dist / 1000).toFixed(2)} km`
        : `${dist.toFixed(0)} m`;

      navInfo.textContent = `距離: ${distStr}　方位: ${bearing.toFixed(1)}°`;

      waypointLine.setLatLngs([[lat, lng], [wlat, wlng]]);

      /* --- ★ 5m 以下なら自動削除 --- */
      if (dist <= 5) {
        clearWaypoint();
        navInfo.textContent = "ウェイポイント到達 → 自動削除";
      }
    }

    /* --- 天気更新 --- */
    const isMapActive = document.getElementById("mapScreen").classList.contains("active");
    if (isMapActive) {
      map.panTo([lat, lng], { animate: false });

      const { weather, marine } = await fetchWeatherMarine(lat, lng);
      if (weather && marine) {
        renderForecast(weather, marine);
      }
    }
  }

  function onError(err) {
    status.textContent = "位置情報エラー: " + err.message;
  }

  /* --- 起動時に追従開始 --- */
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      map.setView([lat, lng], 17);

      marker = L.marker([lat, lng], { icon: kayakIcon }).addTo(map);

      trackCoords.push([lat, lng]);
      trackLine.setLatLngs(trackCoords);

      status.textContent = "追従中…";
    },
    onError,
    { enableHighAccuracy: true }
  );

  watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
  });

  locBtn.textContent = "追従停止";

  locBtn.addEventListener("click", () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      locBtn.textContent = "追従開始";
      status.textContent = "追従停止中";
      return;
    }

    watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    locBtn.textContent = "追従停止";
    status.textContent = "追従中…";
  });

  document.getElementById("tabMap").addEventListener("click", () => {
    setTimeout(() => map.invalidateSize(), 50);
  });
}