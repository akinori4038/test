import { generateGPX } from "./gpx.js";

export let trackCoords = [];

export function initMap() {
  const map = L.map("map").setView([35.681236, 139.767125], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  const trackLine = L.polyline([], { color: "red", weight: 3 }).addTo(map);
  let marker = null;

  function onUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const heading = pos.coords.heading;

    if (!marker) {
      marker = L.marker([lat, lng], {
        rotationAngle: heading || 0,
        rotationOrigin: "center center"
      }).addTo(map);
    } else {
      marker.setLatLng([lat, lng]);
      marker.setRotationAngle(heading || 0);
    }

    trackCoords.push([lat, lng]);
    trackLine.setLatLngs(trackCoords);
    map.panTo([lat, lng], { animate: false });
  }

  let watchId = null;

  document.getElementById("locBtn").addEventListener("click", () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      locBtn.textContent = "追従開始";
      return;
    }

    watchId = navigator.geolocation.watchPosition(onUpdate, console.warn, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    locBtn.textContent = "追従停止";
  });

  // GPX保存ボタン
  document.getElementById("saveGpxBtn").addEventListener("click", () => {
    const gpx = generateGPX(trackCoords);
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "track.gpx";
    a.click();

    URL.revokeObjectURL(url);
  });
}