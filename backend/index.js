/**
 * AI Emotion & Voice Diagnostic Tool - Backend Server
 * Express.js server with MongoDB integration
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;
// Initialize test data for the application
const { initializeTestData } = require('./utils/createTestData');

// This will create a test patient and test sessions if they don't exist
initializeTestData();

// Middleware
// Use our custom CORS middleware first
const corsMiddleware = require('./middleware/cors');
app.use(corsMiddleware);

// Then apply other middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection with fallback to mock data mode
let dbConnected = false;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-diagnostic-tool', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Reduce timeout for faster fallback
  connectTimeoutMS: 5000
})
.then(() => {
  console.log('MongoDB connected');
  dbConnected = true;
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Running in offline mode with mock data');
  // We'll continue without DB connection and use mock data
});

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const emotionRoutes = require('./routes/emotion');
const sessionRoutes = require('./routes/session');
const medicationRoutes = require('./routes/medication');
const aiRoutes = require('./routes/aiRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/emotion-analyze', emotionRoutes);
app.use('/api/session-log', sessionRoutes);
app.use('/api/medication-recommend', medicationRoutes);
app.use('/api/ai', aiRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('AI Emotion & Voice Diagnostic Tool API');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
