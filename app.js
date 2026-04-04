import { initMap } from "./map.js";
import { fetchWeatherMarine } from "./forecast.js";
import { renderForecast } from "./forecastTable.js";

/* --- DOMContentLoaded（分割前仕様を完全再現） --- */
document.addEventListener("DOMContentLoaded", () => {

  /* --- 地図初期化（map.js に完全移動） --- */
  initMap();

  /* --- タブ要素 --- */
  const tabMap = document.getElementById("tabMap");
  const tabForecast = document.getElementById("tabForecast");

  const mapScreen = document.getElementById("mapScreen");
  const forecastScreen = document.getElementById("forecastScreen");

  /* --- タブ切り替え（分割前仕様を完全再現） --- */
  function activateTab(target) {

    if (target === "map") {
      tabMap.classList.add("active");
      tabForecast.classList.remove("active");

      mapScreen.classList.add("active");
      forecastScreen.classList.remove("active");

      setTimeout(() => {
        const map = window._leaflet_map_instance;
        if (map) map.invalidateSize();
      }, 50);

    } else {
      tabForecast.classList.add("active");
      tabMap.classList.remove("active");

      forecastScreen.classList.add("active");
      mapScreen.classList.remove("active");

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            const { weather, marine } = await fetchWeatherMarine(lat, lng);
            if (weather && marine) {
              renderForecast(weather, marine);
            }
          },
          (err) => {
            console.warn("位置情報エラー:", err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );
      } else {
        console.warn("この端末では位置情報が利用できません。");
      }
    }
  }

  tabMap.addEventListener("click", () => activateTab("map"));
  tabForecast.addEventListener("click", () => activateTab("forecast"));
});