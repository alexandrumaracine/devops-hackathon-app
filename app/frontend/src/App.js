import React, { useEffect, useRef, useState } from 'react';
import './styles/App.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const API_BASE =
  window.RUNTIME_CONFIG?.API_BASE_URL || "";

const HEALTH_PING_MS = 5000;

export default function App() {
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const [dbStatus, setDbStatus] = useState('unknown'); // "ok" | "error" | "unknown"
  const [dbRows, setDbRows] = useState([]);

  const [backendUp, setBackendUp] = useState(true);
  const [retryDelay, setRetryDelay] = useState(5);

  const retryTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastRequestedCityRef = useRef(null);

  // --- Helpers ---------------------------------------------------

  const clearRetryTimers = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const pingHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error('Health not OK');
      setBackendUp(true);
      return true;
    } catch (e) {
      console.warn('Health check failed:', e);
      setBackendUp(false);
      return false;
    }
  };

  const scheduleHealthRetry = () => {
    clearRetryTimers();
    retryCountRef.current += 1;

    const delay = Math.min(
      30,
      5 * retryCountRef.current
    ); // simple linear-ish backoff
    setRetryDelay(delay);

    retryTimerRef.current = setTimeout(async () => {
      const ok = await pingHealth();
      if (ok) {
        setError('');
        retryCountRef.current = 0;
        clearRetryTimers();

        if (lastRequestedCityRef.current) {
          fetchWeather(lastRequestedCityRef.current);
        }
      }
    }, delay * 1000);
  };

  const loadHistoryFromBackend = async () => {
    setDbStatus('unknown');
    try {
      const res = await fetch(`${API_BASE}/history?limit=10`);
      if (!res.ok) throw new Error('Backend history not available');

      const data = await res.json(); // [{id, city, created_at}, ...]
      setDbRows(data);

      const cities = data.map((row) => row.city);
      setHistory(cities);
      setDbStatus('ok');

      localStorage.setItem('weatherHistory', JSON.stringify(cities));
    } catch (err) {
      console.warn('History from backend failed, using localStorage:', err);

      const stored = JSON.parse(localStorage.getItem('weatherHistory')) || [];
      setHistory(stored);
      setDbRows([]);
      setDbStatus('error');
    }
  };

  const updateHistory = (newCity) => {
    let updated = [newCity, ...history.filter((c) => c !== newCity)];
    if (updated.length > 10) updated = updated.slice(0, 10);
    setHistory(updated);
    localStorage.setItem('weatherHistory', JSON.stringify(updated));
  };

  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn('No REACT_APP_OPENWEATHER_API_KEY configured for autocomplete');
      return;
    }

    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          query
        )}&limit=5&appid=${apiKey}`
      );
      const data = await res.json();

      if (!Array.isArray(data)) {
        setSuggestions([]);
        return;
      }

      const names = data.map((c) => {
        const statePart = c.state ? `, ${c.state}` : '';
        return `${c.name}${statePart}, ${c.country}`;
      });

      setSuggestions(names);
    } catch (err) {
      console.error('Autocomplete fetch error:', err);
      setSuggestions([]);
    }
  };

  const extractCityOnly = (fullString) => {
    return fullString.split(',')[0].trim();
  };

  const fetchWeather = async (selectedCity) => {
    const cityOnly = extractCityOnly(selectedCity || city).trim();
    if (!cityOnly) return;

    lastRequestedCityRef.current = cityOnly;

    if (!backendUp) {
      setError('Backend unavailable. Trying to reconnect…');
      scheduleHealthRetry();
      return;
    }

    setError('');
    setSuggestions([]);
    setCity(cityOnly);

    try {
      const res = await fetch(
        `${API_BASE}/weather?city=${encodeURIComponent(cityOnly)}`
      );
      if (!res.ok) {
        if (res.status === 503 || res.status === 502) {
          // treat as backend down
          setBackendUp(false);
          setError('Backend temporarily unavailable. Reconnecting…');
          scheduleHealthRetry();
          return;
        }
        throw new Error('City not found');
      }

      const data = await res.json();
      setWeather(data);
      updateHistory(data.city);
    } catch (err) {
      console.error('fetchWeather error:', err);
      setError('Could not fetch weather. Please try again.');
      setWeather(null);
    }
  };

  // --- Effects ---------------------------------------------------

  // Load DB history on first mount
  useEffect(() => {
    loadHistoryFromBackend();
  }, []);

  // Periodic health ping
  useEffect(() => {
    const interval = setInterval(() => {
      pingHealth();
    }, HEALTH_PING_MS);

    return () => {
      clearInterval(interval);
      clearRetryTimers();
    };
  }, []);

  // Try geolocation once on mount (best-effort)
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(
            `${API_BASE}/weather/coords?lat=${lat}&lon=${lon}`
          );
          if (!res.ok) throw new Error('Failed auto-location weather');
          const data = await res.json();
          setWeather(data);
          updateHistory(data.city);
        } catch (err) {
          console.warn('Auto-location weather failed:', err);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      }
    );
  }, []); // one-time

  // --- Render ----------------------------------------------------

  return (
    <div className="container">
      <div className="header">
        <h1>🌤 Weather Dashboard</h1>

        {/* DB status + reload button */}
        <div className="db-status">
          {dbStatus === 'ok' && (
            <span className="badge db-ok">🟢 DB Connected</span>
          )}
          {dbStatus === 'error' && (
            <span className="badge db-error">
              🔴 DB Not Available (using local history)
            </span>
          )}
          {dbStatus === 'unknown' && (
            <span className="badge db-loading">🟡 Checking DB…</span>
          )}

          <button className="reload-db-btn" onClick={loadHistoryFromBackend}>
            🔄 Reload DB History
          </button>
        </div>
      </div>

      {/* DB debug panel – top of the page */}
      {dbStatus === 'ok' && dbRows.length > 0 && (
        <div className="db-panel">
          <div className="db-header">
            <h3>📦 Last 10 Entries</h3>
            <span className="db-subtitle">Stored in MySQL</span>
          </div>

          <div className="db-table-wrapper">
            <table className="db-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>City</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {dbRows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    <td>{index + 1}</td>
                    <td>{row.city}</td>
                    <td>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reconnect banner */}
      {!backendUp && (
        <div className="reconnect-banner">
          <span>Backend is down. Auto-retry in {retryDelay}s…</span>
          <button
            onClick={async () => {
              setError('⏳ Checking server…');
              const ok = await pingHealth();
              if (ok) {
                setBackendUp(true);
                setError('');
                retryCountRef.current = 0;
                clearRetryTimers();
                if (lastRequestedCityRef.current) {
                  fetchWeather(lastRequestedCityRef.current);
                }
              } else {
                setError('❌ Backend still unreachable. Retrying soon…');
              }
            }}
          >
            Reconnect now
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="search">
        <input
          type="text"
          placeholder="Enter city name..."
          value={city}
          onChange={(e) => {
            const val = e.target.value;
            setCity(val);
            fetchSuggestions(val);
          }}
          onKeyDown={(e) => e.key === 'Enter' && fetchWeather(city)}
        />
        <button onClick={() => fetchWeather(city)}>Search</button>

        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s, idx) => (
              <li key={idx} onClick={() => fetchWeather(s)}>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="history">
          <h3>Recent:</h3>
          <div className="tags">
            {history.map((h, i) => (
              <span key={i} className="tag" onClick={() => fetchWeather(h)}>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <div className="error">{error}</div>}

      {/* Weather card */}
      {weather && (
        <div className="weather-card">
          <h2>{weather.city}</h2>
          <p>
            {weather.local_time} ({weather.local_date})
          </p>
          <img
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt={weather.description}
          />
          <h3>{weather.temperature}°C</h3>
          <p>{weather.description}</p>

          <div className="forecast">
            {weather.forecast.map((f, i) => (
              <div className="forecast-item" key={i}>
                <p>{f.time}</p>
                <strong>{f.temp}°</strong>
              </div>
            ))}
          </div>

          <div className="chart-section">
            <h3>Temperature Forecast</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weather.forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis unit="°" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#3498db"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
