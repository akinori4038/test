import { generateGPX } from "./gpx.js";
import { fetchWeatherMarine } from "./forecast.js";
import { renderForecast } from "./forecastTable.js";

/* --- 追跡用の配列（lat, lng, ele, time） --- */
export let trackCoords = [];

/* --- カヤック SVG アイコン（分割前仕様を完全再現） --- */
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

  /* --- 地図初期化（分割前仕様） --- */
  const map = L.map("map").setView([35.681236, 139.767125], 5);

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

  /* --- 位置更新（高度＋タイムスタンプ追加） --- */
  async function onLocationUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const ele = pos.coords.altitude ?? 0;          // 高度
    const time = new Date().toISOString();         // タイムスタンプ
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

    /* ★ 高度＋時刻入りで保存 */
    trackCoords.push([lat, lng, ele, time]);
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

  /* --- 追従トグル --- */
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

  /* --- GPX保存（スマホ対応＋高度＋タイムスタンプ＋日時ファイル名） --- */
  document.getElementById("saveGpxBtn").addEventListener("click", () => {

    if (trackCoords.length === 0) {
      alert("まだ軌跡がありません。追従開始して移動すると記録されます。");
      return;
    }

    /* ★ ファイル名を日時入りにする */
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const filename = `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.gpx`;

    /* ★ GPX 生成（高度＋タイムスタンプ入り） */
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="KayakApp" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Track Log</name>
    <trkseg>
`;

    trackCoords.forEach(p => {
      const lat = p[0];
      const lng = p[1];
      const ele = p[2];
      const time = p[3];

      gpx += `      <trkpt lat="${lat}" lon="${lng}">
        <ele>${ele}</ele>
        <time>${time}</time>
      </trkpt>\n`;
    });

    gpx += `    </trkseg>
  </trk>
</gpx>`;

    /* ★ スマホで確実にダウンロードされる方式 */
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    alert(`GPXファイルを保存しました。\nファイル名：${filename}\nスマホでは「ダウンロード」フォルダに保存されます。`);
  });

  /* --- タブ切り替え時の map.invalidateSize --- */
  document.getElementById("tabMap").addEventListener("click", () => {
    setTimeout(() => map.invalidateSize(), 50);
  });
}