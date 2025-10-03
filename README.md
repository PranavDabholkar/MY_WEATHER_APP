# Weather App

A clean single-page weather app using vanilla HTML/CSS/JS. Search by city or use your current location to view current conditions and a 5‑day forecast. Includes theme toggle, °C/°F switch, and toasts for status.

## Features
- City search with loading/error states
- Current: temperature, condition, humidity, wind
- 5‑day forecast (aggregated from 3‑hourly data)
- Dark/Light theme toggle (persisted)
- °C/°F unit switch (persisted)
- Current location via Geolocation with IP fallback

## Tech Stack
- HTML, CSS, JavaScript
- localStorage for small persistence

## APIs
- OpenWeatherMap (required)
  - Current: https://api.openweathermap.org/data/2.5/weather
  - Forecast: https://api.openweathermap.org/data/2.5/forecast
- BigDataCloud reverse geocoding (nice city name for coordinates)
  - https://api.bigdatacloud.net/data/reverse-geocode-client
- IPinfo IP geolocation fallback
  - https://ipinfo.io/json (optional token supported via query string)

## Setup
1) Open `app.js` and set your OpenWeatherMap API key:
```js
// Just the key string, not a URL
const OPENWEATHER_API_KEY = 'YOUR_REAL_KEY_HERE';
```
2) Save the file.

If you see 401 Unauthorized, your key may be invalid or not yet activated (can take up to ~2 hours after creation).

## Run Locally
- Easiest: open `index.html` directly in your browser
- Recommended: run a simple static server for better geolocation behavior
```bash
npx serve .
# or
npx http-server -c-1 .
```
Open the printed URL.

## Usage
- Type a city and press Search (e.g., "London" or "Pune, India")
- Click "Use Current Location" and allow permission; IP fallback is used if denied
- Toggle theme (🌙/☀️) and switch units (°C/°F)

## Project Structure
```
MY_WEATHER_APP/
  index.html
  styles.css
  app.js
  about.md
  README.md
```

## License
For learning and personal use.
