# 🌦️ Weather Dashboard

A full-stack Weather Dashboard built with FastAPI and React. It shows real-time weather, autocomplete suggestions, recent searches, and visual charts using data from the OpenWeatherMap API. The app is responsive, clean, and great for exploring weather data visually while practicing modern tooling.


## 🔧 Tech Stack

- Frontend: React, Recharts, OpenWeatherMap APIs
- Backend: FastAPI, Requests, Uvicorn
- Database: MySQL 

---

## 📦 Features
- 💾 Persistent Search Storage: Searched locations are saved to the MySQL database.
- 🔍 **Auto-location Weather**: Uses Geolocation API to fetch current weather on page load.
- 🏙️ **City Search**: Type any city to get live weather data.
- 🧠 **Autocomplete Suggestions**: Powered by OpenWeatherMap Geocoding API.
- 🕘 **Recent Search History**: Stored via `localStorage`, clickable for quick access.
- 📊 **Chart Dashboard**: Visual representation of weather data using Recharts.
- 📱 **Mobile Friendly**: Fully responsive UI.
- ⚙️ **.env Configurable**: Clean environment variable usage for both frontend & backend.

---

## 🗄️ DB (MySQL Configuration)

The application is configured to use MySQL as its database.
Make sure the following environment variables are set:

```bash
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=weatherdb
MYSQL_USER=weatheruser
MYSQL_PASSWORD=weatherpass
```

Ensure your MySQL instance is running and accessible to the backend service.

## 🌍 How to Run the Project Locally

## 🖥️ Frontend Setup

```bash
cd frontend
npm install
```

### 📄 Use the `.env` in `frontend/`

### ▶️ Start Frontend

```bash
npm start
```

---

## ⚙️ Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 📄 Use the `.env` in `backend/`


### ▶️ Start Backend

```bash
uvicorn app.main:app --reload
```

---
