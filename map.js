import { fetchWeatherMarine } from "./forecast.js";
import { renderForecast } from "./forecastTable.js";

/* --- 追跡用の配列（lat, lng のみ） --- */
export let trackCoords = [];

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

/* --- map.js のメイン --- */
export function initMap() {

  /* --- 地図初期化（ズーム17に変更） --- */
  const map = L.map("map").setView([35.681236, 139.767125], 17);

  /* ★ app.js の activateTab() が参照するため必須 */
  window._leaflet_map_instance = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  let marker = null;
  let trackLine = L.polyline([], { color: "red", weight: 3 }).addTo(map);
  let watchId = null;

  const locBtn = document.getElementById("locBtn");
  const status = document.getElementById("status");

  /* --- 位置更新（lat,lng のみ） --- */
  async function onLocationUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const heading = pos.coords.heading;

    /* --- マーカー更新 --- */
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

    /* --- 軌跡更新 --- */
    trackCoords.push([lat, lng]);
    trackLine.setLatLngs(trackCoords);

    /* --- 地図タブがアクティブの時だけ天気更新 --- */
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

  /* --- ★ 起動時に現在位置を1回取得してセンタリング --- */
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      map.setView([lat, lng], 17);

      marker = L.marker([lat, lng], {
        icon: kayakIcon
      }).addTo(map);

      trackCoords.push([lat, lng]);
      trackLine.setLatLngs(trackCoords);

      status.textContent = "追従中…";
    },
    onError,
    { enableHighAccuracy: true }
  );

  /* --- ★ 起動直後から追従開始（watchPosition 自動ON） --- */
  watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
  });

  /* ボタンの初期状態を「追従停止」にする */
  locBtn.textContent = "追従停止";

  /* --- 追従トグル（手動で停止/再開） --- */
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

  /* --- タブ切り替え時の map.invalidateSize --- */
  document.getElementById("tabMap").addEventListener("click", () => {
    setTimeout(() => map.invalidateSize(), 50);
  });
}