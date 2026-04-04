/* --- 天気＋海況 API（分割前仕様を完全再現） --- */
export async function fetchWeatherMarine(lat, lng) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weathercode,cloudcover,surface_pressure,precipitation&timezone=auto`;

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
    `&hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,` +
    `swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature&timezone=auto`;

  try {
    const [wRes, mRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl)
    ]);

    const weather = await wRes.json();
    const marine = await mRes.json();

    return { weather, marine };

  } catch (e) {
    console.warn("天気/海況データ取得エラー:", e);
    return { weather: null, marine: null };
  }
}