import type { LiveWeather, LiveDay } from './live';

// The forecast is fetched straight from Open-Meteo in the farmer's browser.
// Server-side calls share one IP on free hosting and get rate-limited (HTTP 429).
// Mirrors backend/live_data.py live_weather() so pages see the same shape.

const CODES: Record<number, [string, string]> = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Cloudy', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'], 66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Snow showers', '🌨️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Thunderstorm, hail', '⛈️'],
};
const describe = (code: number | null | undefined) => {
  const [label, icon] = CODES[Number(code ?? 0)] ?? ['Unknown', '🌡️'];
  return { label, icon };
};

function dayAdvice(rainProb: number, rainMm: number, windMax: number, tMax: number, et0: number): string[] {
  const tips: string[] = [];
  if (rainProb >= 60 || rainMm >= 10) tips.push('Skip irrigation and fertilizer — rain expected');
  else if (et0 - rainMm >= 4) tips.push('Crop will lose a lot of water — irrigate');
  if (windMax < 15 && rainProb < 40) tips.push('Good day for spraying');
  else if (windMax >= 25) tips.push('Too windy to spray');
  else if (rainMm >= 3) tips.push('Some rain expected — you can delay irrigation');
  if (tMax >= 38) tips.push('Heat stress — water early morning or evening');
  return tips.length ? tips : ['Normal field work'];
}

const cache = new Map<string, { at: number; value: Promise<LiveWeather> }>();
const TTL = 5 * 60 * 1000;

export function fetchWeatherDirect(lat: number, lon: number): Promise<LiveWeather> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = load(lat, lon);
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}

async function load(lat: number, lon: number): Promise<LiveWeather> {
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lon), timezone: 'auto', forecast_days: '7',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day',
    hourly: 'precipitation_probability,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_temperature_6cm',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,uv_index_max,sunrise,sunset',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather service busy (HTTP ${res.status})`);
  const d = await res.json();
  const cur = d.current, hourly = d.hourly, daily = d.daily;

  const hourKey = String(cur.time).slice(0, 13) + ':00';
  const hi = Math.max(0, hourly.time.indexOf(hourKey));
  const pick = (k: string): number | null => hourly[k]?.[hi] ?? null;

  const days: LiveDay[] = daily.time.map((date: string, i: number) => {
    const rp = daily.precipitation_probability_max[i] ?? 0;
    const rmm = daily.precipitation_sum[i] ?? 0;
    const wmax = daily.wind_speed_10m_max[i] ?? 0;
    const tmax = daily.temperature_2m_max[i];
    const et0 = daily.et0_fao_evapotranspiration[i] ?? 0;
    return {
      date, ...describe(daily.weather_code[i]),
      temp_max: tmax, temp_min: daily.temperature_2m_min[i],
      rain_mm: rmm, rain_probability: rp, wind_max: wmax, et0_mm: et0,
      uv_max: daily.uv_index_max[i], sunrise: daily.sunrise[i], sunset: daily.sunset[i],
      advice: dayAdvice(rp, rmm, wmax, tmax, et0),
    };
  });
  const root = pick('soil_moisture_3_to_9cm');
  return {
    source: 'Open-Meteo', fetched_at: new Date().toISOString(), timezone: d.timezone, elevation: d.elevation,
    current: {
      time: cur.time, ...describe(cur.weather_code),
      temperature: cur.temperature_2m, feels_like: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m, precipitation: cur.precipitation,
      rain_probability: pick('precipitation_probability') ?? days[0]?.rain_probability ?? 0,
      wind_speed: cur.wind_speed_10m, wind_gusts: cur.wind_gusts_10m, is_day: Boolean(cur.is_day ?? 1),
    },
    soil: {
      moisture_surface: pick('soil_moisture_0_to_1cm'), moisture_root: root,
      temperature: pick('soil_temperature_6cm'),
      status: root == null ? null : root < 0.15 ? 'Dry' : root > 0.35 ? 'Wet' : 'Moist',
    },
    daily: days,
  };
}
