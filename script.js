let currentCity = {
  name: "Detroit",
  state: "Michigan",
  lat: null,
  lon: null
};

// Get City Coordinates
async function getCityCoords(cityObj) {
  if (cityObj.lat && cityObj.lon) {
    return {
      lat: cityObj.lat,
      lon: cityObj.lon,
      name: cityObj.name,
      state: cityObj.state,
      country: cityObj.country
    };
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    cityObj.name
  )}&count=10&language=en&format=json`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) return null;

  // Try matching name + state
  let match = data.results.find((res) => {
    const admin = res.admin1 ? res.admin1.toLowerCase() : "";
    return (
      res.name.toLowerCase() === cityObj.name.toLowerCase() &&
      admin === cityObj.state.toLowerCase()
    );
  });

  if (!match) match = data.results[0];

  return {
    lat: match.latitude,
    lon: match.longitude,
    name: match.name,
    state: match.admin1 || "",
    country: match.country || "",
    admin2: match.admin2 || ""
  };
}

// Fetch Weather
async function getWeatherData(cityObj) {
  const coords = await getCityCoords(cityObj);
  if (!coords) {
    alert("City not found – try another.");
    return null;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,windspeed_10m_max,relative_humidity_2m_max&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();
  data.coords = coords;

  let name = coords.name || "";
  let state = coords.state || coords.admin2 || "";
  let country = coords.country || "";

  document.getElementById("city-name").textContent =
  country ? `${name}, ${state}, ${country}` : `${name}, ${state}`;

  return data;
}
// Weather Codes
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

// Format 12 Hour AM/PM
function formatTimeTo12Hour(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

// Create Day Cards
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
      <img src="${iconSrc}" class="weather-icon" alt="Weather Icon">
      <p>${weatherDesc}</p>
      <p class="temp"><strong>H:</strong> ${tempHigh}° | <strong>L:</strong> ${tempLow}°</p>
    `;

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
    const now = new Date();
    const start = hourly.time.findIndex((t) => new Date(t) > now);
    const next12 = hourly.time.slice(start, start + 12);

    next12.forEach((time, i) => {
      const hour = new Date(time).toLocaleTimeString([], { hour: "numeric" });
      const temp = Math.round(hourly.temperature_2m[start + i]);
      const wcode = hourly.weathercode[start + i];
      const icon = `${wcode}.png`;

      hourlyContainer.innerHTML += `
          <div class="hour">
            <p>${hour}</p>
            <img src="${icon}">
            <p>${temp}°</p>
          </div>
        `;
    });
  }

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

// Render/Show Forecast
function renderForecast(data, days) {
  const forecastEl = document.getElementById("forecast");
  forecastEl.innerHTML = "";
  forecastEl.className = "forecast";

  const daily = data.daily;
  const hourly = data.hourly;

  if (days === 7) {
    forecastEl.classList.add("seven-day");

    for (let i = 0; i < 7; i++) {
      forecastEl.appendChild(createDayCard(daily, hourly, null, i, days));
    }
  } else {
    for (let i = 0; i < days; i++) {
      forecastEl.appendChild(createDayCard(daily, hourly, null, i, days));
    }
  }
}

async function showForecast(days) {
  const data = await getWeatherData(currentCity);
  if (data) renderForecast(data, days);
}

// Dropdown Suggestions
const input = document.getElementById("locationInput");
const suggestions = document.getElementById("suggestions");

function parseInput(str) {
  const parts = str.split(",").map((s) => s.trim());
  return {
    name: parts[0] || "",
    state: parts[1] || ""
  };
}

async function fetchSuggestions(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=10&language=en&format=json`;

  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

input.addEventListener("input", async () => {
  const query = input.value.trim();
  if (!query) {
    suggestions.style.display = "none";
    return;
  }

  const parsed = parseInput(query);
  const results = await fetchSuggestions(parsed.name);

  suggestions.innerHTML = "";

  let count = 0;

  results.forEach((r) => {
    if (count >= 5) return;

    const state = r.admin1 ? `, ${r.admin1}` : "";
    const text = `${r.name}${state}, ${r.country}`;

    if (
      parsed.state &&
      r.admin1 &&
      !r.admin1.toLowerCase().startsWith(parsed.state.toLowerCase())
    ) {
      return;
    }

    const div = document.createElement("div");
    div.textContent = text;
    div.addEventListener("click", () => {
      input.value = text;
      input.dataset.selectedName = r.name;
      input.dataset.selectedState = r.admin1 || "";
      input.dataset.selectedLat = r.latitude;
      input.dataset.selectedLon = r.longitude;
      suggestions.style.display = "none";
    });

    suggestions.appendChild(div);
    count++;
  });

  suggestions.style.display = count > 0 ? "block" : "none";
});

// Search Function
async function searchCity() {
  const value = input.value.trim();
  if (!value) return;

  const parsed = parseInput(value);

  currentCity = {
    name: input.dataset.selectedName || parsed.name,
    state: input.dataset.selectedState || parsed.state,
    lat: input.dataset.selectedLat || null,
    lon: input.dataset.selectedLon || null
  };

  await showForecast(3);

  input.value = "";
  input.dataset.selectedName = "";
  input.dataset.selectedState = "";
  input.dataset.selectedLat = "";
  input.dataset.selectedLon = "";
  suggestions.style.display = "none";
}

// 1/3/7 Day Toggles
document.querySelectorAll(".day-toggles button").forEach((btn) => {
  btn.addEventListener("click", () => showForecast(parseInt(btn.textContent)));
});

// Default Loadstate
showForecast(3);
