let currentCity = "Detroit";

// Get City Coordinates
async function getCityCoords(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    alert("City not found. Please try again.");
    return null;
  }
  const { latitude, longitude } = data.results[0];
  return { lat: latitude, lon: longitude };
}

// Fetch Weather Data
async function getWeatherData(city) {
  const coords = await getCityCoords(city);
  if (!coords) return null;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,windspeed_10m_max,relative_humidity_2m_max&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`;

  const response = await fetch(url);
  const data = await response.json();

  // Display City Name
  const cityNameEl = document.getElementById("city-name");
  if (cityNameEl) {
    cityNameEl.textContent = city.charAt(0).toUpperCase() + city.slice(1);
  }

  data.coords = coords;
  return data;
}

// Weather Code Descriptions
const weatherMap = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm (hail)",
  99: "Thunderstorm (heavy hail)"
};

// Format 12-Hour AM/PM
function formatTimeTo12Hour(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// Build Day Card
function createDayCard(daily, hourly, current, index, days) {
  const card = document.createElement("div");
  card.classList.add("day-card");

  const date = new Date(daily.time[index]);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const weatherCode = daily.weathercode[index];
  const iconSrc = `${weatherCode}.png`;

  const tempHigh = Math.round(daily.temperature_2m_max[index]);
  const tempLow = Math.round(daily.temperature_2m_min[index]);
  const weatherDesc = weatherMap[weatherCode] || "Unknown";

  card.innerHTML = `
    <h3>${dayName}</h3>
    <img src="${iconSrc}" alt="Weather icon" class="weather-icon">
    <p>${weatherDesc}</p>
    <p class="temp"><strong>H:</strong> ${tempHigh}° | <strong>L:</strong> ${tempLow}°</p>
  `;

  // 1 Day Card (detailed)
  if (days === 1) {
    card.classList.add("detailed");

    const sunrise = formatTimeTo12Hour(daily.sunrise[index]);
    const sunset = formatTimeTo12Hour(daily.sunset[index]);
    const wind = daily.windspeed_10m_max[index].toFixed(1);
    const humidity = daily.relative_humidity_2m_max[index];

    card.innerHTML += `
      <div class="section">
        <p><strong>Sunrise:</strong> ${sunrise}</p>
        <p><strong>Sunset:</strong> ${sunset}</p>
        <p><strong>Wind:</strong> ${wind} mph</p>
        <p><strong>Humidity:</strong> ${humidity}%</p>
      </div>
      <h4>Hourly Forecast</h4>
      <div class="hourly-forecast"></div>
    `;

    // Hourly Forecast
    const hourlyContainer = card.querySelector(".hourly-forecast");
    if (hourly && hourly.time) {
      const now = new Date();
      const startIndex = hourly.time.findIndex(t => new Date(t) > now);
      const next12 = hourly.time.slice(startIndex, startIndex + 12);

      next12.forEach((time, i) => {
        const hour = new Date(time).toLocaleTimeString([], { hour: "numeric" });
        const temp = Math.round(hourly.temperature_2m[startIndex + i]);
        const wcode = hourly.weathercode[startIndex + i];
        const icon = `${wcode}.png`;
        hourlyContainer.innerHTML += `
          <div class="hour">
            <p>${hour}</p>
            <img src="${icon}" alt="">
            <p>${temp}°</p>
          </div>
        `;
      });
    }
  }

  // 3 Day Card
  if (days === 3) {
    const wind = daily.windspeed_10m_max[index].toFixed(1);
    const humidity = daily.relative_humidity_2m_max[index];
    card.innerHTML += `
      <div class="section">
        <p><strong>Wind:</strong> ${wind} mph</p>
        <p><strong>Humidity:</strong> ${humidity}%</p>
      </div>
    `;
  }

  return card;
}

// Render Forecast
function renderForecast(data, days) {
  const forecastEl = document.getElementById("forecast");
  forecastEl.innerHTML = "";
  forecastEl.className = "forecast";

  const daily = data.daily;
  const hourly = data.hourly;
  const current = data.current_weather;

  if (days === 7) {
    forecastEl.classList.add("seven-day");
    const topRow = document.createElement("div");
    topRow.classList.add("row-top");
    const bottomRow = document.createElement("div");
    bottomRow.classList.add("row-bottom");

    for (let i = 0; i < 7; i++) {
      const card = createDayCard(daily, hourly, current, i, days);
      if (i < 3) topRow.appendChild(card);
      else bottomRow.appendChild(card);
    }
    forecastEl.appendChild(topRow);
    forecastEl.appendChild(bottomRow);
  } else {
    for (let i = 0; i < days; i++) {
      const card = createDayCard(daily, hourly, current, i, days);
      forecastEl.appendChild(card);
    }
  }
}

// Show Forecast
async function showForecast(days) {
  const data = await getWeatherData(currentCity);
  if (data) {
    renderForecast(data, days);
  }
}

// Search
function searchCity() {
  const input = document.getElementById("locationInput").value.trim();
  if (input) {
    currentCity = input;
    showForecast(3);
  }
}

// Default Load
showForecast(3);

