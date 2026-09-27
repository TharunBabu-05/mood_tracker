/**
 * Utility to create test data for the application
 */
const Patient = require('../models/Patient');
const Session = require('../models/Session');

/**
 * Creates a test patient if it doesn't exist
 */
async function createTestPatient() {
  try {
    const exists = await Patient.findOne({ patientId: '123' });
    if (!exists) {
      const testPatient = new Patient({
        patientId: '123',
        name: 'Test Patient',
        age: 30,
        gender: 'Male',
        concern: 'Medium'
      });
      await testPatient.save();
      console.log('Test patient created');
      return testPatient;
    }
    return exists;
  } catch (err) {
    console.error('Error creating test patient:', err);
    return null;
  }
}

/**
 * Creates test sessions for a patient
 */
async function createTestSessions(patientId) {
  try {
    // Check if sessions already exist
    const existingSessions = await Session.find({ patientId });
    if (existingSessions.length > 0) {
      console.log(`${existingSessions.length} test sessions already exist for patient ${patientId}`);
      return existingSessions;
    }

    // Create sample sessions with different emotions
    const testSessions = [
      {
        patientId,
        emotion: 'sad',
        emotionIntensity: 70,
        voiceTone: 'depressed',
        transcript: "I've been feeling really down lately, nothing seems to help.",
        recommendation: 'Fluoxetine 20mg',
        medicationRecommended: {
          medication: 'Fluoxetine',
          dosage: '20mg',
          notes: 'Take once daily in the morning'
        },
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        patientId,
        emotion: 'angry',
        emotionIntensity: 60,
        voiceTone: 'aggressive',
        transcript: "I get so frustrated with everything. It's hard to control sometimes.",
        recommendation: 'Olanzapine 5mg',
        medicationRecommended: {
          medication: 'Olanzapine',
          dosage: '5mg',
          notes: 'Take as needed for aggression episodes'
        },
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        patientId,
        emotion: 'fearful',
        emotionIntensity: 65,
        voiceTone: 'anxious',
        transcript: "I'm constantly worried about everything. I can't seem to relax.",
        recommendation: 'Lorazepam 0.5mg',
        medicationRecommended: {
          medication: 'Lorazepam',
          dosage: '0.5mg',
          notes: 'Take as needed for anxiety, not more than twice daily'
        },
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        patientId,
        emotion: 'sad',
        emotionIntensity: 50,
        voiceTone: 'depressed',
        transcript: "I'm feeling a bit better today, but still not great.",
        recommendation: 'Fluoxetine 40mg',
        medicationRecommended: {
          medication: 'Fluoxetine',
          dosage: '40mg',
          notes: 'Increased dosage from 20mg'
        },
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];

    // Save all sessions
    const savedSessions = await Session.insertMany(testSessions);
    console.log(`${savedSessions.length} test sessions created for patient ${patientId}`);
    return savedSessions;
  } catch (err) {
    console.error('Error creating test sessions:', err);
    return [];
  }
}

/**
 * Initialize all test data
 */
async function initializeTestData() {
  try {
    const patient = await createTestPatient();
    if (patient) {
      await createTestSessions(patient.patientId);
    }
    console.log('Test data initialization complete');
  } catch (err) {
    console.error('Error initializing test data:', err);
  }
}

module.exports = {
  createTestPatient,
  createTestSessions,
  initializeTestData
};
