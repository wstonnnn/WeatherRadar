let currentCity = {
  name: "Detroit",
  state: "Michigan",
  lat: null,
  lon: null
};

// Fetch City Coords
async function getCityCoords(cityObj) {
  if (cityObj.lat && cityObj.lon) return { lat: cityObj.lat, lon: cityObj.lon };

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityObj.name)}&count=5&language=en&format=json`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    alert("City not found. Please try again.");
    return null;
  }

  // Match City and State
  let match = data.results.find(c => {
    const stateText = c.admin1 || "";
    return cityObj.state.toLowerCase() === stateText.toLowerCase() && cityObj.name.toLowerCase() === c.name.toLowerCase();
  });

  if (!match) match = data.results[0];

  return { lat: match.latitude, lon: match.longitude };
}

// Fetch Weather Data
async function getWeatherData(cityObj) {
  const coords = await getCityCoords(cityObj);
  if (!coords) return null;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,windspeed_10m_max,relative_humidity_2m_max&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  data.coords = coords;

  // Update City Name
  document.getElementById("city-name").textContent = 
      `${cityObj.name}${cityObj.state ? ', ' + cityObj.state : ''}`;

  return data;
}

// Weather codes
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

// Format 12-Hour Time
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
  if (data) renderForecast(data, days);
}

// Dropdown Menu
const input = document.getElementById("locationInput");
const suggestionsEl = document.getElementById("suggestions");

async function fetchCitySuggestions(query) {
  if (!query) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

input.addEventListener("input", async () => {
  const query = input.value.trim();
  if (!query) {
    suggestionsEl.style.display = "none";
    return;
  }

  const cities = await fetchCitySuggestions(query);
  if (!cities.length) {
    suggestionsEl.style.display = "none";
    return;
  }

  suggestionsEl.innerHTML = "";

  cities.forEach(city => {
    const stateText = city.admin1 ? `, ${city.admin1}` : "";
    const div = document.createElement("div");
    div.textContent = `${city.name}${stateText}, ${city.country}`;

    div.addEventListener("click", () => {
      input.value = `${city.name}${stateText}, ${city.country}`;
      
      input.dataset.selectedCityName = city.name;
      input.dataset.selectedState = city.admin1 || "";
      input.dataset.selectedLat = city.latitude;
      input.dataset.selectedLon = city.longitude;
      suggestionsEl.style.display = "none";
    });

    suggestionsEl.appendChild(div);
  });

  suggestionsEl.style.display = "block";
});

// Search button
async function searchCity() {
  const inputValue = input.value.trim();
  if (!inputValue) return;

  const name = input.dataset.selectedCityName || inputValue;
  const state = input.dataset.selectedState || "";
  const lat = input.dataset.selectedLat ? parseFloat(input.dataset.selectedLat) : null;
  const lon = input.dataset.selectedLon ? parseFloat(input.dataset.selectedLon) : null;

  currentCity = { name, state, lat, lon };
  await showForecast(3);

  input.value = "";
  input.dataset.selectedCityName = "";
  input.dataset.selectedState = "";
  input.dataset.selectedLat = "";
  input.dataset.selectedLon = "";
  suggestionsEl.style.display = "none";
}

// Day Toggles
document.querySelectorAll(".day-toggles button").forEach(btn => {
  btn.addEventListener("click", () => {
    showForecast(parseInt(btn.textContent));
  });
});

// Default load
showForecast(3);
