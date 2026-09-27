# Mood Tracker Project Structure

This project is organized into two main folders:

## Frontend

The `frontend` directory contains all the UI components and client-side logic.

```
frontend/
├── public/              # Static files
├── src/                 # Source code
│   ├── components/      # Reusable UI components
│   │   ├── ChatBot.jsx
│   │   ├── VoiceBot.jsx
│   │   ├── EmotionDetector.jsx
│   │   ├── DoctorDashboard.jsx
│   │   └── PatientView.jsx
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── DoctorMode.jsx
│   │   └── PatientMode.jsx
│   ├── utils/           # Utility functions
│   │   └── api.js       # API communication
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Entry point
└── package.json         # Frontend dependencies
```

## Backend

The `backend` directory contains all server-side code and API endpoints.

```
backend/
├── server/              # Server code
│   ├── models/          # Database models
│   │   └── Patient.js
│   ├── routes/          # API routes
│   │   ├── authRoutes.js
│   │   ├── emotionRoutes.js
│   │   └── dosageRoutes.js
│   ├── controllers/     # Business logic
│   │   └── emotionController.js
│   ├── middleware/      # Custom middleware
│   └── index.js         # Server entry point
├── ai/                  # AI models
│   ├── face_emotion_model.py
│   └── voice_emotion_model.py
├── app.js               # Express application
├── config.js            # Configuration
└── package.json         # Backend dependencies
```

## Running the Application

### Frontend
```
cd frontend
npm install
npm start
```

### Backend
```
cd backend
npm install
npm start
```
