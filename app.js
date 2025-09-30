// Simple Weather App using OpenWeatherMap
// Features: city search, loading/error states, current weather, 5-day forecast, persist last city

(function initWeatherApp() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('city-input');
  const statusEl = null;
  const toastEl = document.getElementById('toast');
  const currentEl = document.getElementById('current-weather');
  const forecastEl = document.getElementById('forecast');
  const searchBtn = document.getElementById('search-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const unitC = document.getElementById('unit-c');
  const unitF = document.getElementById('unit-f');
  const locBtn = document.getElementById('loc-btn');
  const locStatus = document.getElementById('loc-status');

  const LAST_CITY_KEY = 'weather:lastCity';
  const THEME_KEY = 'weather:theme';
  const UNIT_KEY = 'weather:unit'; // 'c' | 'f'
  let unit = 'c';

  // Fill this with your OpenWeatherMap API key (JUST the key string, not a URL)
  const OPENWEATHER_API_KEY = '4440a9b992b2341f98d59bad14c2aafa';

  function hasValidApiKey() {
    const k = (OPENWEATHER_API_KEY || '').trim();
    if (!k) return false;
    if (k.includes('openweathermap.org') || k.includes('appid=') || k.includes('{') || k.includes('}')) return false;
    return true;
  }

  function setStatus(message, type) {
    if (!toastEl) return;
    toastEl.className = 'toast show ' + (type === 'error' ? 'toast-error' : 'toast-success');
    toastEl.textContent = message || '';
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2500);
  }

  function setLoading(isLoading) {
    searchBtn.disabled = isLoading;
    if (isLoading) setStatus('Loading…');
  }

  function saveLastCity(city) {
    try { localStorage.setItem(LAST_CITY_KEY, city); } catch {}
  }
  function getLastCity() {
    try { return localStorage.getItem(LAST_CITY_KEY) || ''; } catch { return ''; }
  }

  // OpenWeatherMap helpers
  function getOwmUnits() { return unit === 'f' ? 'imperial' : 'metric'; }

  async function fetchCurrentByCity(city) {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('q', city);
    url.searchParams.set('appid', OPENWEATHER_API_KEY);
    url.searchParams.set('units', getOwmUnits());
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid OpenWeatherMap API key (401)');
      if (res.status === 404) { const e = new Error('City not found'); e.code = 'NOT_FOUND'; throw e; }
      throw new Error('Failed to fetch weather');
    }
    return await res.json();
  }

  async function fetchCurrentByCoords(lat, lon) {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('appid', OPENWEATHER_API_KEY);
    url.searchParams.set('units', getOwmUnits());
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid OpenWeatherMap API key (401)');
      throw new Error('Failed to fetch weather');
    }
    return await res.json();
  }

  async function fetchForecastByCity(city) {
    const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
    url.searchParams.set('q', city);
    url.searchParams.set('appid', OPENWEATHER_API_KEY);
    url.searchParams.set('units', getOwmUnits());
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid OpenWeatherMap API key (401)');
      throw new Error('Failed to fetch forecast');
    }
    return await res.json();
  }

  async function fetchForecastByCoords(lat, lon) {
    const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('appid', OPENWEATHER_API_KEY);
    url.searchParams.set('units', getOwmUnits());
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid OpenWeatherMap API key (401)');
      throw new Error('Failed to fetch forecast');
    }
    return await res.json();
  }

  // Rendering helpers for OpenWeatherMap shapes
  function kphFromMs(ms) { return Math.round(ms * 3.6); }

  function weatherTextFromOwm(weather) {
    const w = weather && weather.weather && weather.weather[0];
    return (w && w.description) ? (w.description.charAt(0).toUpperCase() + w.description.slice(1)) : '—';
  }

  function weatherIconFromOwm(weather) {
    const id = weather && weather.weather && weather.weather[0] && weather.weather[0].id;
    if (id == null) return '❓';
    if (id === 800) return '☀️';
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 600) return '🌧️';
    if (id >= 600 && id < 700) return '🌨️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id > 800) return '⛅';
    return '❓';
  }

  function renderCurrent(placeName, weather) {
    const temp = Math.round(weather.main.temp);
    const codeText = weatherTextFromOwm(weather);
    const humidityText = weather.main.humidity + '%';
    const tempUnit = unit === 'f' ? '°F' : '°C';
    const windUnit = unit === 'f' ? 'mph' : 'km/h';
    const windValue = unit === 'f' ? Math.round(weather.wind.speed) : kphFromMs(weather.wind.speed);
    const icon = weatherIconFromOwm(weather);
    currentEl.innerHTML = `
      <div class="temp">${temp}${tempUnit}</div>
      <div>
        <div class="place"><span class="icon">📍</span><span>${placeName}</span></div>
        <div class="meta">
          <div class="condition"><span class="icon">${icon}</span><span>${codeText}</span></div>
          <div class="meta-item"><span class="icon">💧</span><span>Humidity: ${humidityText}</span></div>
          <div class="meta-item"><span class="icon">🌬️</span><span>Wind: ${windValue} ${windUnit}</span></div>
        </div>
      </div>
    `;
  }

  function renderForecast(forecast) {
    // forecast.list contains 3-hourly entries. Group by date and take min/max and a representative description.
    if (!forecast || !forecast.list) { forecastEl.innerHTML = ''; return; }
    const byDate = new Map();
    for (const item of forecast.list) {
      const dateStr = item.dt_txt.split(' ')[0];
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr).push(item);
    }
    const days = Array.from(byDate.keys()).slice(0, 5);
    const blocks = days.map(dateStr => {
      const items = byDate.get(dateStr);
      const temps = items.map(i => i.main.temp);
      const min = Math.round(Math.min(...temps));
      const max = Math.round(Math.max(...temps));
      // Pick description near midday if available
      let rep = items.reduce((prev, cur) => Math.abs(new Date(cur.dt_txt).getHours() - 12) < Math.abs(new Date(prev.dt_txt).getHours() - 12) ? cur : prev, items[0]);
      const label = new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' });
      const text = rep.weather && rep.weather[0] ? rep.weather[0].description : '';
      const icon = weatherIconFromOwm(rep);
      return `
        <div class="day">
          <div class="icon">${icon}</div>
          <div class="label">${label}</div>
          <div class="range">${min}° / ${max}°</div>
          <div class="label description">${text.charAt(0).toUpperCase() + text.slice(1)}</div>
        </div>
      `;
    });
    forecastEl.innerHTML = blocks.join('');
  }

  // Theme handling
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    // Update icon
    if (themeToggleBtn) themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  }
  function initTheme() {
    let stored = 'dark';
    try { stored = localStorage.getItem(THEME_KEY) || 'dark'; } catch {}
    applyTheme(stored);
  }

  // Unit handling
  function applyUnit(nextUnit) {
    unit = nextUnit === 'f' ? 'f' : 'c';
    try { localStorage.setItem(UNIT_KEY, unit); } catch {}
    if (unitC && unitF) {
      unitC.setAttribute('aria-pressed', unit === 'c' ? 'true' : 'false');
      unitF.setAttribute('aria-pressed', unit === 'f' ? 'true' : 'false');
    }
  }
  function initUnit() {
    let stored = 'c';
    try { stored = localStorage.getItem(UNIT_KEY) || 'c'; } catch {}
    applyUnit(stored);
  }

  async function handleSearch(cityRaw) {
    const city = cityRaw.trim();
    if (!city) return;
    if (!hasValidApiKey()) {
      setStatus('Add a valid OpenWeatherMap API key in app.js (only the key).', 'error');
      return;
    }
    setLoading(true);
    try {
      const weather = await fetchCurrentByCity(city);
      const forecast = await fetchForecastByCity(city);
      const placeName = `${weather.name}${weather.sys && weather.sys.country ? ', ' + weather.sys.country : ''}`;
      renderCurrent(placeName, weather);
      renderForecast(forecast);
      saveLastCity(placeName);
      setStatus('Updated', 'success');
    } catch (err) {
      if (err && err.code === 'NOT_FOUND') {
        setStatus('City not found. Try another name.', 'error');
      } else {
        setStatus('Something went wrong. Please try again.', 'error');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch(input.value);
  });

  // Geolocation flow
  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      locStatus.textContent = 'Geolocation not supported. Using IP location…';
      await fetchViaIpFallback();
      return;
    }
    locStatus.textContent = 'Getting location…';
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode (CORS-friendly service)
        let displayName = 'Current Location';
        try {
          const rgUrl = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
          rgUrl.searchParams.set('latitude', String(latitude));
          rgUrl.searchParams.set('longitude', String(longitude));
          rgUrl.searchParams.set('localityLanguage', 'en');
          const res = await fetch(rgUrl);
          if (res.ok) {
            const data = await res.json();
            const city = data.city || data.locality || data.principalSubdivision || '';
            const country = data.countryName || '';
            const parts = [city || 'Current Location', country].filter(Boolean);
            displayName = parts.join(', ');
          }
        } catch {}
        if (!hasValidApiKey()) throw new Error('Missing OpenWeatherMap API key');
        const weather = await fetchCurrentByCoords(latitude, longitude);
        const forecast = await fetchForecastByCoords(latitude, longitude);
        renderCurrent(displayName, weather);
        renderForecast(forecast);
        input.value = displayName;
        saveLastCity(displayName);
        setStatus('Updated from current location', 'success');
      } catch (err) {
        console.error(err);
        setStatus('Failed to get weather for current location.', 'error');
      } finally {
        setLoading(false);
        locStatus.textContent = '';
      }
    }, (err) => {
      setLoading(false);
      locStatus.textContent = 'Permission denied. Using IP location…';
      fetchViaIpFallback();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  async function fetchViaIpFallback() {
    try {
      setLoading(true);
      // Free IP geolocation endpoint (CORS-friendly)
      const res = await fetch('https://ipinfo.io/json?token=');
      const data = await res.json();
      if (!data || !data.loc) throw new Error('IP geolocation failed');
      const [latitudeStr, longitudeStr] = data.loc.split(',');
      const latitude = parseFloat(latitudeStr);
      const longitude = parseFloat(longitudeStr);
      let displayName = `${data.city || 'Current Location'}${data.country ? ', ' + data.country : ''}`;
      if (!hasValidApiKey()) throw new Error('Missing OpenWeatherMap API key');
      const weather = await fetchCurrentByCoords(latitude, longitude);
      const forecast = await fetchForecastByCoords(latitude, longitude);
      renderCurrent(displayName, weather);
      renderForecast(forecast);
      input.value = displayName;
      saveLastCity(displayName);
      setStatus('Updated from IP location', 'success');
    } catch (e) {
      console.error(e);
      setStatus('Unable to determine your location.', 'error');
    } finally {
      setLoading(false);
      if (locStatus) locStatus.textContent = '';
    }
  }

  locBtn?.addEventListener('click', handleUseCurrentLocation);

  themeToggleBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  unitC?.addEventListener('click', () => {
    if (unit === 'c') return;
    applyUnit('c');
    if (input.value) handleSearch(input.value);
  });
  unitF?.addEventListener('click', () => {
    if (unit === 'f') return;
    applyUnit('f');
    if (input.value) handleSearch(input.value);
  });

  // Initialize with last city or a default
  initTheme();
  initUnit();
  const last = getLastCity();
  if (last) {
    input.value = last;
    handleSearch(last);
  } else {
    input.value = 'London';
    handleSearch('London');
  }
})();


