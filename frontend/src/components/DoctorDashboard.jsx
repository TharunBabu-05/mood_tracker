import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PatientList from './PatientList';
import MedicalPrescription from './MedicalPrescription';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [emotionData, setEmotionData] = useState([]);
  const [medicationHistory, setMedicationHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch patients data
  useEffect(() => {
    // This would normally fetch from an API
    const mockPatients = [
      { patientId: '1', name: 'Michael Wilson', age: 31, gender: 'Male', concern: 'High' },
      { patientId: '2', name: 'John Doe', age: 35, gender: 'Male', concern: 'Medium' },
      { patientId: '3', name: 'Sarah Johnson', age: 28, gender: 'Female', concern: 'Low' },
      { patientId: '4', name: 'Emma Thompson', age: 42, gender: 'Female', concern: 'High' },
      { patientId: '5', name: 'David Brown', age: 39, gender: 'Male', concern: 'Medium' }
    ];
    setPatients(mockPatients);
  }, []);

  // Handle patient selection
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    fetchPatientData(patient.patientId);
  };

  // Fetch patient emotion and medication data
  const fetchPatientData = (patientId) => {
    // This would normally fetch from an API
    const mockEmotionData = [
      { date: '5/1', depression: 0.2, aggression: 0.5, anxiety: 0.2 },
      { date: '5/3', depression: 0.3, aggression: 0.4, anxiety: 0.4 },
      { date: '5/5', depression: 0.4, aggression: 0.3, anxiety: 0.3 },
      { date: '5/7', depression: 0.3, aggression: 0.3, anxiety: 0.2 },
      { date: '5/9', depression: 0.5, aggression: 0.4, anxiety: 0.3 },
      { date: '5/11', depression: 0.6, aggression: 0.2, anxiety: 0.4 },
      { date: '5/13', depression: 0.4, aggression: 0.1, anxiety: 0.3 },
      { date: '5/15', depression: 0.3, aggression: 0.3, anxiety: 0.5 },
      { date: '5/17', depression: 0.2, aggression: 0.4, anxiety: 0.4 },
      { date: '5/19', depression: 0.3, aggression: 0.5, anxiety: 0.6 },
      { date: '5/21', depression: 0.4, aggression: 0.7, anxiety: 0.5 }
    ];
    
    const mockMedicationHistory = [
      { date: '01/05/2025', medication: 'Fluoxetine', dosage: '20mg', prescribedFor: 'Depression' },
      { date: '07/05/2025', medication: 'Fluoxetine', dosage: '40mg', prescribedFor: 'Depression (Increased)' },
      { date: '15/05/2025', medication: 'Fluoxetine + Lorazepam', dosage: '40mg + 0.5mg', prescribedFor: 'Depression + Anxiety' },
      { date: '19/05/2025', medication: 'Olanzapine', dosage: '5mg', prescribedFor: 'Aggression' }
    ];
    
    setEmotionData(mockEmotionData);
    setMedicationHistory(mockMedicationHistory);
  };

  // Handle search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate patient statistics
  const calculatePatientStats = () => {
    if (!selectedPatient || !emotionData.length) return null;
    
    const totalSessions = emotionData.length;
    
    // Calculate average values
    const avgDepression = emotionData.reduce((sum, data) => sum + data.depression, 0) / totalSessions;
    const avgAggression = emotionData.reduce((sum, data) => sum + data.aggression, 0) / totalSessions;
    const avgAnxiety = emotionData.reduce((sum, data) => sum + data.anxiety, 0) / totalSessions;
    
    // Determine dominant emotion
    const emotionValues = { depression: avgDepression, aggression: avgAggression, anxiety: avgAnxiety };
    const dominantEmotion = Object.keys(emotionValues).reduce((a, b) => emotionValues[a] > emotionValues[b] ? a : b);
    
    return {
      totalSessions,
      dominantEmotion,
      avgDepression,
      avgAggression,
      avgAnxiety
    };
  };

  const patientStats = calculatePatientStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Doctor Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute right-0 top-0">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                DS
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">Dr. Smith</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Patient list and profile */}
          <div className="lg:col-span-1 space-y-8">
            {/* Patient list */}
            <PatientList 
              patients={filteredPatients}
              selectedPatient={selectedPatient}
              onSelectPatient={handlePatientSelect}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />
            
            {/* Patient profile card */}
            {selectedPatient && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">{selectedPatient.name}</h2>
                <div className="space-y-6">
                  {/* Patient info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm text-gray-500">Age</h3>
                      <p className="font-medium">{selectedPatient.age} years</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-500">Gender</h3>
                      <p className="font-medium">{selectedPatient.gender}</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-500">Diagnosis</h3>
                      <p className="font-medium">{selectedPatient.diagnosis || 'Anxiety Disorder'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-500">Current Medication</h3>
                      <p className="font-medium">{selectedPatient.currentMedication || 'Lorazepam 0.5mg'}</p>
                    </div>
                  </div>
                  
                  {/* Recent emotional state */}
                  <div>
                    <h3 className="text-sm text-gray-500 mb-3">Recent Emotional State</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">😐</span>
                          <span className="font-medium">Neutral</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500">20/05/2025</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">😔</span>
                          <span className="font-medium">Sad</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '70%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500">19/05/2025</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">😨</span>
                          <span className="font-medium">Fearful</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500">18/05/2025</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">
                      View Full Profile
                    </button>
                    <button className="py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">
                      Schedule Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - Patient details and charts */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="space-y-8">
                {/* Emotional trends chart */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4">Emotional Trends</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={emotionData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="depression" stroke="#f87171" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="aggression" stroke="#60a5fa" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="anxiety" stroke="#c084fc" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center space-x-8">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Depression</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Aggression</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Anxiety</span>
                    </div>
                  </div>
                </div>
                
                {/* Patient summary */}
                {patientStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <h3 className="text-sm font-medium text-gray-500">Total Sessions</h3>
                      <p className="mt-1 text-2xl font-semibold">{patientStats.totalSessions}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <h3 className="text-sm font-medium text-gray-500">Dominant Emotion</h3>
                      <p className="mt-1 text-2xl font-semibold capitalize">{patientStats.dominantEmotion}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <h3 className="text-sm font-medium text-gray-500">Avg. Aggression</h3>
                      <p className="mt-1 text-2xl font-semibold">{patientStats.avgAggression.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <h3 className="text-sm font-medium text-gray-500">Avg. Depression</h3>
                      <p className="mt-1 text-2xl font-semibold">{patientStats.avgDepression.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                
                {/* Medication history */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-semibold mb-4">Medication History</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prescribed For</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {medicationHistory.map((med, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{med.medication}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.dosage}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.prescribedFor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Medical prescription */}
                <MedicalPrescription 
                  patientId={selectedPatient.patientId}
                  emotionData={emotionData}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No patient selected</h3>
                  <p className="mt-1 text-sm text-gray-500">Select a patient from the list to view their details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
