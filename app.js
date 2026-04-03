document.addEventListener("DOMContentLoaded", () => {

  // --- SVGシーカヤックアイコン（リアル3D・ターコイズ） ---
  const kayakSvg = `<svg width="60" height="60" viewBox="0 0 100 100"
xmlns="http://www.w3.org/2000/svg">

  <defs>
    <!-- 船体の3Dグラデーション -->
    <linearGradient id="kayakBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4de0d8"/>
      <stop offset="50%" stop-color="#1fb5ad"/>
      <stop offset="100%" stop-color="#0e7f79"/>
    </linearGradient>

    <!-- コーミングの立体グラデーション -->
    <linearGradient id="cockpitGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#444"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
  </defs>

  <!-- 細長いカヤック本体 -->
  <path d="M50 1
           C60 22, 68 40, 68 50
           C75 60, 63 78, 50 99
           C37 78, 25 60, 25 50
           C25 40, 37 22, 50 3 Z"
        fill="url(#kayakBody)" stroke="#0a5f5a" stroke-width="3"/>

  <!-- ハイライト（光の反射） -->
  <path d="M50 6
           C58 22, 66 40, 66 50
           C66 60, 58 78, 50 94"
        stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none"/>

  <!-- 細長いコーミング -->
  <ellipse cx="50" cy="50" rx="10" ry="22"
           fill="url(#cockpitGrad)" stroke="#000" stroke-width="3"/>

  <!-- デッキライン -->
  <line x1="50" y1="3" x2="50" y2="22"
        stroke="#ffffff" stroke-width="2" opacity="0.6"/>
  <line x1="50" y1="78" x2="50" y2="97"
        stroke="#ffffff" stroke-width="2" opacity="0.6"/>

</svg>`;

  // --- アイコン化（Base64を使わない安全方式） ---
  const kayakIcon = L.icon({
    iconUrl: "data:image/svg+xml;utf8," + encodeURIComponent(kayakSvg),
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });

  // --- 地図初期化 ---
  const map = L.map('map').setView([35.681236, 139.767125], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker = null;

  // --- トラックライン ---
  let trackCoords = [];
  let trackLine = L.polyline([], { color: 'red', weight: 3 }).addTo(map);

  // --- watchId ---
  let watchId = null;

  // --- 位置更新 ---
  function onLocationUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const heading = pos.coords.heading;

    if (!marker) {
      marker = L.marker([lat, lng], {
        icon: kayakIcon,
        rotationAngle: heading || 0,
        rotationOrigin: 'center center'
      }).addTo(map);
    } else {
      marker.setLatLng([lat, lng]);
      marker.setRotationAngle(heading || 0);
    }

    trackCoords.push([lat, lng]);
    trackLine.setLatLngs(trackCoords);

    // ★ ズームを変えずに位置だけ追従（ズーム保持）
    map.panTo([lat, lng], { animate: false });
  }

  function onError(err) {
    console.error(err);
    document.getElementById("status").textContent = "位置情報エラー: " + err.message;
  }

  // --- トグルボタン ---
  const locBtn = document.getElementById("locBtn");
  const status = document.getElementById("status");

  locBtn.addEventListener("click", () => {
    // 追従中 → 停止
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;

      locBtn.textContent = "追従開始";
      status.textContent = "追従停止中";
      return;
    }

    // 停止中 → 開始
    watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    locBtn.textContent = "追従停止";
    status.textContent = "追従中…";
  });

});