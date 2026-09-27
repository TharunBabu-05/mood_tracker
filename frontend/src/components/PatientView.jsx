import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import MoodTracker from './MoodTracker';
import EmotionDetector from './EmotionDetector';
import Chatbot from './Chatbot';
import VoiceBot from './VoiceBot';
import RewardSystem from './RewardSystem';
import CombinedCheckIn from './CombinedCheckIn';

const PatientView = ({ patientId }) => {
  const { currentTheme, themes } = useTheme();
  const theme = themes[currentTheme];
  const [patient, setPatient] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('mood');
  const [recentEmotion, setRecentEmotion] = useState(null);
  const [medicationRecommendation, setMedicationRecommendation] = useState(null);

  // Fetch patient data
  useEffect(() => {
    // This would normally fetch from an API
    const mockPatient = {
      patientId: patientId || '1',
      name: 'Michael Wilson',
      age: 31,
      gender: 'Male',
      diagnosis: 'Anxiety Disorder',
      currentMedication: 'Lorazepam 0.5mg',
      nextAppointment: '2025-05-25T10:00:00',
      doctor: 'Dr. Smith',
      points: 120
    };
    
    const mockEmotionHistory = [
      { date: '2025-05-01', emotion: 'neutral', intensity: 0.4 },
      { date: '2025-05-03', emotion: 'sad', intensity: 0.3 },
      { date: '2025-05-05', emotion: 'happy', intensity: 0.6 },
      { date: '2025-05-07', emotion: 'anxious', intensity: 0.5 },
      { date: '2025-05-09', emotion: 'sad', intensity: 0.4 },
      { date: '2025-05-11', emotion: 'angry', intensity: 0.3 },
      { date: '2025-05-13', emotion: 'neutral', intensity: 0.2 },
      { date: '2025-05-15', emotion: 'happy', intensity: 0.5 },
      { date: '2025-05-17', emotion: 'sad', intensity: 0.3 },
      { date: '2025-05-19', emotion: 'anxious', intensity: 0.6 },
      { date: '2025-05-21', emotion: 'happy', intensity: 0.7 }
    ];
    
    setPatient(mockPatient);
    setEmotionHistory(mockEmotionHistory);
    
    // Set most recent emotion
    if (mockEmotionHistory.length > 0) {
      setRecentEmotion(mockEmotionHistory[mockEmotionHistory.length - 1]);
    }
  }, [patientId]);

  // Handle emotion detection
  const handleEmotionDetected = (emotion) => {
    const newEmotion = {
      date: new Date().toISOString().split('T')[0],
      emotion: emotion.name,
      intensity: emotion.probability
    };
    
    setRecentEmotion(newEmotion);
    setEmotionHistory(prev => [...prev, newEmotion]);
    
    // This would normally send to an API
    console.log('New emotion detected:', newEmotion);
  };

  // Handle combined analysis completion
  const handleCombinedAnalysisComplete = (result) => {
    // Update emotion history with the dominant emotion from facial analysis
    const newEmotion = {
      date: new Date().toISOString().split('T')[0],
      emotion: result.facialAnalysis.dominantEmotion,
      intensity: result.combinedResult.confidence
    };
    
    setRecentEmotion(newEmotion);
    setEmotionHistory(prev => [...prev, newEmotion]);
    
    // Set medication recommendation
    setMedicationRecommendation(result.combinedResult.recommendation);
    
    console.log('Combined analysis complete:', result);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'mood':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MoodTracker 
              emotionHistory={emotionHistory} 
              onMoodUpdate={(mood) => handleEmotionDetected({ name: mood, probability: 0.8 })} 
            />
            <EmotionDetector onEmotionDetected={handleEmotionDetected} />
          </div>
        );
      case 'chat':
        return <Chatbot patientId={patientId} recentEmotion={recentEmotion} />;
      case 'voice':
        return <VoiceBot patientId={patientId} recentEmotion={recentEmotion} />;
      case 'analysis':
        return <CombinedCheckIn patientId={patientId} onAnalysisComplete={handleCombinedAnalysisComplete} />;
      case 'rewards':
        return <RewardSystem points={patient?.points || 0} />;
      default:
        return <div>Select a tab</div>;
    }
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.background}`}>
      {/* Header */}
      <header className={`${theme.cardBg} shadow-md backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <h1 className={`text-2xl font-bold ${theme.text}`}>Hello, {patient.name}</h1>
              <div className="ml-4 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                Active
              </div>
            </div>
            <div className={`mt-2 md:mt-0 ${theme.subtext}`}>
              Next appointment: {new Date(patient.nextAppointment).toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Patient info card */}
        <div className={`mb-8 ${theme.cardBg} rounded-xl shadow-lg backdrop-blur-sm p-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h3 className={`text-sm ${theme.subtext}`}>Current Medication</h3>
              <p className={`font-medium ${theme.text}`}>{patient.currentMedication}</p>
            </div>
            <div>
              <h3 className={`text-sm ${theme.subtext}`}>Diagnosis</h3>
              <p className={`font-medium ${theme.text}`}>{patient.diagnosis}</p>
            </div>
            <div>
              <h3 className={`text-sm ${theme.subtext}`}>Doctor</h3>
              <p className={`font-medium ${theme.text}`}>{patient.doctor}</p>
            </div>
            <div>
              <h3 className={`text-sm ${theme.subtext}`}>Reward Points</h3>
              <p className={`font-medium ${theme.text}`}>{patient.points}</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'mood', name: 'Mood Tracker' },
                { id: 'chat', name: 'Chat Assistant' },
                { id: 'voice', name: 'Voice Assistant' },
                { id: 'analysis', name: 'Combined Analysis' },
                { id: 'rewards', name: 'Rewards' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? `border-blue-500 ${theme.text}`
                      : `border-transparent ${theme.subtext} hover:border-gray-300`
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Tab content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default PatientView;
