import { initMap } from "./map.js";
import { fetchWeatherMarine } from "./forecast.js";
import { renderForecast } from "./forecastTable.js";

document.addEventListener("DOMContentLoaded", () => {
  initMap();

  const tabMap = document.getElementById("tabMap");
  const tabForecast = document.getElementById("tabForecast");

  tabMap.addEventListener("click", () => {
    tabMap.classList.add("active");
    tabForecast.classList.remove("active");
    mapScreen.classList.add("active");
    forecastScreen.classList.remove("active");
  });

  tabForecast.addEventListener("click", async () => {
    tabForecast.classList.add("active");
    tabMap.classList.remove("active");
    forecastScreen.classList.add("active");
    mapScreen.classList.remove("active");

    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const [w, m] = await fetchWeatherMarine(lat, lng);
      renderForecast(w, m);
    });
  });
});