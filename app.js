// 初期地図（東京駅付近）
const map = L.map('map').setView([35.681236, 139.767125], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker = null;
const statusEl = document.getElementById('status');
const btn = document.getElementById('locBtn');

function setStatus(msg) {
  statusEl.textContent = msg;
}

function centerToCurrentPosition() {
  if (!navigator.geolocation) {
    setStatus('この端末・ブラウザはGeolocation APIに対応していません。');
    return;
  }

  btn.disabled = true;
  setStatus('現在地を取得しています…');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng]).addTo(map);
      }

      map.setView([lat, lng], 16);

      setStatus(`現在地を取得しました（緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)}）。`);
      btn.disabled = false;
    },
    (err) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setStatus('位置情報の利用が拒否されました。ブラウザの設定で許可してください。');
          break;
        case err.POSITION_UNAVAILABLE:
          setStatus('位置情報を取得できませんでした。電波状況やGPS設定を確認してください。');
          break;
        case err.TIMEOUT:
          setStatus('位置情報の取得がタイムアウトしました。再度お試しください。');
          break;
        default:
          setStatus('位置情報の取得中に不明なエラーが発生しました。');
      }
      btn.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

btn.addEventListener('click', centerToCurrentPosition);