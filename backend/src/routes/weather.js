const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// In-memory cache: { key: { data, fetchedAt } }
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Weather not configured — add OPENWEATHER_API_KEY to environment' });
    }

    const { city, units = 'imperial' } = req.query;
    if (!city) return res.status(400).json({ error: 'city parameter is required' });

    const cacheKey = `${city}:${units}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Fetch current weather + forecast in parallel
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${units}&cnt=8&appid=${apiKey}`),
    ]);

    if (!currentRes.ok) {
      const err = await currentRes.json();
      return res.status(currentRes.status).json({ error: err.message || 'Weather API error' });
    }

    const current = await currentRes.json();
    const forecast = forecastRes.ok ? await forecastRes.json() : null;

    const data = {
      current: {
        temp: Math.round(current.main.temp),
        feels_like: Math.round(current.main.feels_like),
        description: current.weather[0]?.description,
        icon: current.weather[0]?.icon,
        humidity: current.main.humidity,
        wind_speed: Math.round(current.wind?.speed || 0),
        city: current.name,
      },
      forecast: forecast?.list?.map(f => ({
        dt: f.dt,
        temp: Math.round(f.main.temp),
        icon: f.weather[0]?.icon,
        description: f.weather[0]?.description,
      })) || [],
    };

    cache.set(cacheKey, { data, fetchedAt: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('Weather API error:', err);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

module.exports = router;
