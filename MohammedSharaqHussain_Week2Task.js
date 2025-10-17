// A constant object to hold all the color palettes for our dynamic theme.
const THEMES = {
    cold: {
        morning: ['#e0eafc', '#cfdef3', '#313c4a'],
        day: ['#bbdefb', '#90caf9', '#0d47a1'],
        evening: ['#a6c1ee', '#fbc2eb', '#4a325a'],
        night: ['#141e30', '#243b55', '#ffffff'],
    },
    warm: {
        morning: ['#f6d365', '#fda085', '#3a2d0b'],
        day: ['#89f7fe', '#66a6ff', '#003c6a'],
        evening: ['#ff7e5f', '#feb47b', '#5d260c'],
        night: ['#2c3e50', '#465875', '#ffffff'],
    },
    hot: {
        morning: ['#ffecd2', '#fcb69f', '#6b3226'],
        day: ['#ffb347', '#ffcc33', '#5d3a00'],
        evening: ['#f87171', '#ff8c42', '#5d1a1a'],
        night: ['#480048', '#c04848', '#ffffff'],
    }
};

// We select all the HTML elements we need to interact with once, at the start.
const root = document.documentElement;
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const weatherContentDiv = document.getElementById('weather-content');
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const weatherIconEl = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const weatherDescriptionEl = document.getElementById('weather-description');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const pressureEl = document.getElementById('pressure');
const recommendationTextEl = document.getElementById('recommendation-text');
const hourlyForecastContainer = document.getElementById('hourly-forecast');
const dailyForecastContainer = document.getElementById('daily-forecast');

// This is the main function that orchestrates the fetching and displaying of weather data.
async function getWeatherData(city) {
    setLoadingState(true);
    try {
        // Step 1: Convert the city name into geographic coordinates.
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoData = await geoResponse.json();
        if (!geoData.results) {
            throw new Error(`Could not find location: "${city}". Please check the spelling.`);
        }
        
        const { latitude, longitude, name, timezone } = geoData.results[0];
        
        // Step 2: Use the coordinates to get the actual weather forecast.
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&wind_speed_unit=kmh&timezone=${timezone}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        if (weatherData.error) {
            throw new Error(weatherData.reason);
        }

        // Step 3: If everything is successful, update the webpage.
        updateUI(name, weatherData);

    } catch (error) {
        setErrorState(true, error.message);
    } finally {
        setLoadingState(false);
    }
}

// This function takes all the fetched data and populates the HTML.
function updateUI(cityName, data) {
    const { current, hourly, daily, timezone } = data;
    
    // Update the visual theme first.
    updateTheme(current.temperature_2m, timezone);

    // Update the main weather display.
    cityNameEl.textContent = cityName;
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone });
    temperatureEl.textContent = `${Math.round(current.temperature_2m)}°C`;
    
    const weatherInfo = getWeatherInfoFromCode(current.weather_code);
    weatherDescriptionEl.textContent = weatherInfo.description;
    weatherIconEl.innerHTML = weatherInfo.icon;
    
    // Update the details grid.
    feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°`;
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windSpeedEl.textContent = `${current.wind_speed_10m.toFixed(1)} km/h`;
    pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;

    // Generate and display the smart recommendation.
    recommendationTextEl.textContent = generateSmartRecommendation(current, daily);
    
    // Build and display the forecast sections.
    updateHourlyForecast(hourly, timezone);
    updateDailyForecast(daily, timezone);
}

// A simple rule-based engine to generate helpful advice.
function generateSmartRecommendation(current, daily) {
    const todayWeatherCode = daily.weather_code[0];
    const todayMaxTemp = daily.temperature_2m_max[0];
    const isRainy = (todayWeatherCode >= 51 && todayWeatherCode <= 67) || (todayWeatherCode >= 80 && todayWeatherCode <= 82);

    if (isRainy) {
        return "Heads up! Rain is expected today. It's a good idea to take an umbrella with you.";
    }
    if (todayMaxTemp > 35) {
        return "It's a hot one today! Remember to stay hydrated and avoid the sun during peak hours.";
    }
    if (current.temperature_2m < 15) {
        return "Feeling chilly! A jacket or sweater is recommended if you're heading out.";
    }
    if (current.wind_speed_10m > 25) {
        return "It's quite windy out there. A windbreaker would be a good choice.";
    }
    if (todayWeatherCode <= 1) {
        return "Looks like a beautiful and clear day. Perfect for spending some time outdoors!";
    }
    return "The weather is mild and pleasant. Have a great day!";
}

// Builds the HTML for the simplified hourly forecast.
function updateHourlyForecast(hourly, timezone) {
    hourlyForecastContainer.innerHTML = '';
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
    const currentHourIndex = hourly.time.findIndex(t => new Date(t) > now);

    // We'll show 3 intervals: Now + 2h, Now + 4h, Now + 6h.
    for (let i = 2; i <= 6; i += 2) {
        const forecastIndex = currentHourIndex + i;
        if (forecastIndex < hourly.time.length) {
            const time = hourly.time[forecastIndex];
            const temp = hourly.temperature_2m[forecastIndex];
            const code = hourly.weather_code[forecastIndex];
            
            const hourItemHTML = `
                <div class="hourly-item">
                    <p class="time">${new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: timezone })}</p>
                    <div class="icon">${getWeatherInfoFromCode(code).icon}</div>
                    <p class="temp">${Math.round(temp)}°C</p>
                </div>`;
            hourlyForecastContainer.innerHTML += hourItemHTML;
        }
    }
}

// Builds the HTML for the 3-day forecast.
function updateDailyForecast(daily, timezone) {
    dailyForecastContainer.innerHTML = '';
    // We start from index 1 for "tomorrow".
    for (let i = 1; i <= 3; i++) {
        const dayInfo = getWeatherInfoFromCode(daily.weather_code[i]);
        
        const dayItemHTML = `
            <div class="daily-item">
                <p class="day">${new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone })}</p>
                <div class="details">
                    <div class="icon">${dayInfo.icon}</div>
                    <p class="desc">${dayInfo.description}</p>
                </div>
                <p class="temps">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</p>
            </div>`;
        dailyForecastContainer.innerHTML += dayItemHTML;
    }
}

// This function is the heart of the dynamic visuals.
function updateTheme(temp, timezone) {
    const timeOfDay = getTimeOfDay(timezone);
    const tempCategory = (temp < 15) ? 'cold' : (temp <= 30) ? 'warm' : 'hot';
    
    // Select the right color palette from our THEMES constant.
    const [bgStart, bgEnd, textPrimary] = THEMES[tempCategory][timeOfDay];

    // Update the CSS variables on the root HTML element.
    root.style.setProperty('--bg-gradient-start', bgStart);
    root.style.setProperty('--bg-gradient-end', bgEnd);
    root.style.setProperty('--text-primary', textPrimary);
    root.style.setProperty('--text-secondary', `${textPrimary}b3`); // Add 70% opacity for secondary text.

    // A little extra logic to ensure contrast is good.
    const cardBg = (textPrimary === '#ffffff') ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
    root.style.setProperty('--card-bg', cardBg);
}

// A small helper to figure out the time of day.
function getTimeOfDay(timezone) {
    const hour = new Date(new Date().toLocaleString("en-US", { timeZone: timezone })).getHours();
    if (hour >= 5 && hour < 10) return 'morning';
    if (hour >= 10 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
}

// Converts a weather code from the API into a user-friendly description and an SVG icon.
function getWeatherInfoFromCode(code) {
    const descriptions = { 0:"Clear", 1:"Mainly Clear", 2:"Partly Cloudy", 3:"Overcast", 45:"Fog", 61:"Rain", 63:"Rain", 65:"Heavy Rain", 71:"Snow", 73:"Snow", 75:"Heavy Snow", 80:"Showers", 95:"Thunderstorm" };
    // We map the API's detailed codes to our simpler set of icons.
    const iconCodeMap = { 0:800, 1:800, 2:801, 3:804, 45:741, 61:500, 63:501, 65:502, 71:600, 73:601, 75:602, 80:520, 95:211};
    
    return {
        description: descriptions[code] || "Cloudy",
        icon: getStaticWeatherIcon(iconCodeMap[code] || 801)
    };
}

// Contains the actual SVG code for our weather icons.
// Using inline SVGs like this is efficient and lets us style them with CSS.
function getStaticWeatherIcon(code) {
    const icons = {
        thunder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M47.15 34.5A14.99 14.99 0 0132.16 49.5a14.92 14.92 0 01-11.43-5.11 5 5 0 00-3.57 1.43 5 5 0 00-3.54 8.54A24.93 24.93 0 0032.16 59.5a25 25 0 0025-25 5 5 0 00-10-0zM30.16 5.5l-3 6a5 5 0 003.54 8.54 5 5 0 006.21-3.54l3-11a5 5 0 00-9.75-5zM48.16 19.5l-3 6a5 5 0 009.75 5l3-11a5 5 0 10-9.75-5zM16.16 19.5a5 5 0 00-6.21-3.54l-3 11a5 5 0 009.75 5l3-6a5 5 0 00-3.54-8.54z"/></svg>`,
        rain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M47.15 34.5A14.99 14.99 0 0132.16 49.5a14.92 14.92 0 01-11.43-5.11 5 5 0 00-3.57 1.43 5 5 0 00-3.54 8.54A24.93 24.93 0 0032.16 59.5a25 25 0 0025-25 5 5 0 00-10-0zM48.16 15.5a5 5 0 10-10 0 5 5 0 0010 0zM32.16 15.5a5 5 0 10-10 0 5 5 0 0010 0zM16.16 15.5a5 5 0 10-10 0 5 5 0 0010 0z"/></svg>`,
        snow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M54.16 44.5a5 5 0 10-10 0 5 5 0 0010 0zM38.16 44.5a5 5 0 10-10 0 5 5 0 0010 0zM22.16 44.5a5 5 0 10-10 0 5 5 0 0010 0zM54.16 28.5a5 5 0 10-10 0 5 5 0 0010 0zM38.16 28.5a5 5 0 10-10 0 5 5 0 0010 0zM22.16 28.5a5 5 0 10-10 0 5 5 0 0010 0zM46.16 12.5a5 5 0 10-10 0 5 5 0 0010 0zM30.16 12.5a5 5 0 10-10 0 5 5 0 0010 0z"/></svg>`,
        clear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" /></svg>`,
        cloudy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M46.6 25.6c-.6-8.7-7.9-15.6-16.8-15.6-7.3 0-13.5 4.6-15.9 11.1-4.8.8-8.5 4.9-8.5 9.9 0 5.5 4.5 10 10 10h30.1c6 0 10.9-4.9 10.9-10.9 0-5.7-4.4-10.4-10-10.8z" opacity="0.7"/><path d="M32.2 18c-3.7 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8 6.8-3 6.8-6.8-3-6.8-6.8-6.8z"/><path d="M46.6 25.6c-.6-8.7-7.9-15.6-16.8-15.6-7.3 0-13.5 4.6-15.9 11.1-4.8.8-8.5 4.9-8.5 9.9 0 5.5 4.5 10 10 10h30.1c6 0 10.9-4.9 10.9-10.9 0-5.7-4.4-10.4-10-10.8z" fill-opacity="0" stroke="#d1d5db" stroke-width="0"/></svg>`
    };
    if (code >= 200 && code < 300) return icons.thunder;
    if (code >= 300 && code < 600) return icons.rain;
    if (code >= 600 && code < 700) return icons.snow;
    if (code === 800) return icons.clear;
    return icons.cloudy;
}

// A helper function to show or hide the loading state.
function setLoadingState(isLoading) {
    loadingDiv.classList.toggle('hidden', !isLoading);
    weatherContentDiv.classList.toggle('hidden', isLoading);
    // Always hide the error message when a new search starts.
    if (isLoading) {
        errorDiv.classList.add('hidden');
    }
}

// A helper function to show or hide the error message.
function setErrorState(hasError, message) {
    errorDiv.classList.toggle('hidden', !hasError);
    if (hasError) {
        errorMessageEl.textContent = message;
        weatherContentDiv.classList.add('hidden');
    }
}


// --- Event Listeners ---

// This starts a search when the user submits the form.
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
    cityInput.value = '';
});

// This loads the weather for a default city when the page first opens.
window.addEventListener('load', () => {
    getWeatherData('Hyderabad');
});

