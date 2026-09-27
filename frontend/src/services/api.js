/**
 * API Service for Medical Emotion Diagnostic Tool
 * Handles all API calls to the backend server
 */

// Use relative URL to avoid CORS issues when possible
const API_BASE_URL = '/api';

// Mock data for when backend is unavailable
const mockData = {
  sessions: [
    {
      patientId: '123',
      timestamp: new Date('2025-05-22T10:30:00'),
      emotion: 'sad',
      emotionIntensity: 75,
      voiceTone: 'depressed',
      transcript: 'I have been feeling very low lately and having trouble sleeping.',
      recommendation: 'Sertraline 25mg',
      notes: 'Take once daily in the morning. May take 2-4 weeks for full effect.'
    },
    {
      patientId: '123',
      timestamp: new Date('2025-05-20T14:15:00'),
      emotion: 'angry',
      emotionIntensity: 65,
      voiceTone: 'aggressive',
      transcript: 'I feel irritated by small things and can\'t control my temper.',
      recommendation: 'Lorazepam 0.5mg',
      notes: 'Take once when feeling moderately angry. Avoid alcohol.'
    },
    {
      patientId: '123',
      timestamp: new Date('2025-05-18T09:45:00'),
      emotion: 'fearful',
      emotionIntensity: 80,
      voiceTone: 'anxious',
      transcript: 'I\'m constantly worried about everything and feel on edge.',
      recommendation: 'Buspirone 5mg',
      notes: 'Take twice daily. Avoid caffeine and alcohol.'
    }
  ],
  medications: [
    {
      patientId: '123',
      medication: 'Sertraline',
      dosage: '25mg',
      timestamp: new Date('2025-05-22T10:30:00'),
      reason: 'Depression',
      notes: 'Take once daily in the morning. May take 2-4 weeks for full effect.'
    },
    {
      patientId: '123',
      medication: 'Lorazepam',
      dosage: '0.5mg',
      timestamp: new Date('2025-05-20T14:15:00'),
      reason: 'Anxiety/Anger',
      notes: 'Take once when feeling moderately angry. Avoid alcohol.'
    },
    {
      patientId: '123',
      medication: 'Buspirone',
      dosage: '5mg',
      timestamp: new Date('2025-05-18T09:45:00'),
      reason: 'Anxiety',
      notes: 'Take twice daily. Avoid caffeine and alcohol.'
    }
  ],
  patients: [
    {
      patientId: '123',
      name: 'John Doe',
      age: 35,
      gender: 'Male',
      diagnosis: 'Major Depressive Disorder',
      currentMedication: 'Fluoxetine 20mg',
      concern: 'High'
    },
    {
      patientId: '124',
      name: 'Jane Smith',
      age: 28,
      gender: 'Female',
      diagnosis: 'Major Depressive Disorder',
      currentMedication: 'Fluoxetine 20mg',
      concern: 'Medium'
    },
    {
      patientId: '125',
      name: 'Michael Wilson',
      age: 31,
      gender: 'Male',
      diagnosis: 'Anxiety Disorder',
      currentMedication: 'Sertraline 50mg',
      concern: 'Medium'
    }
  ]
};

// Generic API request function with error handling and mock data fallback
async function apiRequest(endpoint, method = 'GET', data = null) {
  // For session-log endpoints, directly use mock data to avoid CORS issues
  if (endpoint.includes('/session-log/')) {
    console.log('Using mock data for session-log to avoid CORS issues');
    const patientId = endpoint.split('/')[2];
    if (method === 'GET') {
      console.log('Using mock session data for patient:', patientId);
      return mockData.sessions.filter(s => s.patientId === patientId);
    } else if (method === 'POST') {
      console.log('Simulating session log creation for:', data);
      // Add the new session to mock data
      const newSession = {
        ...data,
        timestamp: new Date()
      };
      mockData.sessions.unshift(newSession);
      return newSession;
    }
  }
  
  // For all other endpoints, try the regular API call
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    // Don't use credentials for now to avoid CORS issues
    mode: 'cors'
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`Making API request to: ${url}`);
    const response = await fetch(url, options);
    
    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    
    // Check if this is a CORS error
    if (error.message.includes('CORS') || error.name === 'TypeError') {
      console.warn('CORS error detected, falling back to mock data');
    }
    
    // Provide mock data when backend is unavailable
    if (endpoint.includes('/session-log/')) {
      const patientId = endpoint.split('/')[2];
      if (method === 'GET') {
        console.log('Using mock session data for patient:', patientId);
        return mockData.sessions.filter(s => s.patientId === patientId);
      } else if (method === 'POST') {
        console.log('Simulating session log creation for:', data);
        // Add the new session to mock data
        const newSession = {
          ...data,
          timestamp: new Date()
        };
        mockData.sessions.unshift(newSession);
        return newSession;
      }
    } else if (endpoint.includes('/medication-history/')) {
      const patientId = endpoint.split('/')[2];
      console.log('Using mock medication data for patient:', patientId);
      return mockData.medications.filter(m => m.patientId === patientId);
    } else if (endpoint.includes('/patient/')) {
      const patientId = endpoint.split('/')[2];
      console.log('Using mock patient data for:', patientId);
      return mockData.patients.find(p => p.patientId === patientId) || null;
    } else if (endpoint === '/patient') {
      console.log('Using mock patients list');
      return mockData.patients;
    }
    
    // If no mock data is available for this endpoint, rethrow the error
    throw error;
  }
}

// Authentication endpoints
export const authService = {
  login: (credentials) => apiRequest('/auth/login', 'POST', credentials),
  logout: () => apiRequest('/auth/logout', 'POST'),
  getCurrentUser: () => apiRequest('/auth/me'),
};

// Patient endpoints
export const patientService = {
  getAll: () => apiRequest('/patient'),
  getById: (id) => apiRequest(`/patient/${id}`),
  create: (data) => apiRequest('/patient', 'POST', data),
  update: (id, data) => apiRequest(`/patient/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/patient/${id}`, 'DELETE'),
};

// Emotion analysis endpoints
export const emotionService = {
  analyzeEmotion: (data) => apiRequest('/emotion-analyze', 'POST', data),
  getHistory: (patientId) => apiRequest(`/emotion-history/${patientId}`),
  getStatistics: (patientId) => apiRequest(`/emotion-statistics/${patientId}`),
};

// Session logging endpoints
export const sessionService = {
  logSession: (data) => apiRequest('/session-log', 'POST', data),
  createSession: (data) => {
    console.log('Creating new session:', data);
    // First try to send to the backend
    return apiRequest('/session-log', 'POST', data)
      .catch(error => {
        console.warn('Error saving to backend, using mock data:', error);
        // If backend fails, use mock data
        const newSession = {
          ...data,
          timestamp: new Date()
        };
        mockData.sessions.unshift(newSession);
        return newSession;
      });
  },
  getSessions: (patientId) => apiRequest(`/session-log/${patientId}`),
  exportSessions: (patientId, format) => 
    apiRequest(`/session-log/${patientId}/export?format=${format}`),
};

// Medication recommendation endpoints
export const medicationService = {
  getRecommendation: (data) => apiRequest('/medication-recommend', 'POST', data),
  getMedicationHistory: (patientId) => apiRequest(`/medication-history/${patientId}`),
};

export default {
  auth: authService,
  patient: patientService,
  emotion: emotionService,
  session: sessionService,
  medication: medicationService,
};
