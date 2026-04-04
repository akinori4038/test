export async function fetchWeatherMarine(lat, lng) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weathercode,precipitation&timezone=auto`;

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
    `&hourly=wave_height,swell_wave_height,sea_surface_temperature&timezone=auto`;

  const [w, m] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
  return [await w.json(), await m.json()];
}