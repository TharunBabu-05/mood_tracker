import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserMd, FaUser, FaLock } from 'react-icons/fa';
import { authService } from '../services/api';

const Home = () => {
  const [activeMode, setActiveMode] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    patientId: ''
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (activeMode === 'doctor' && (!credentials.username || !credentials.password)) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (activeMode === 'doctor') {
        // In a real app, authenticate with the backend
        // For now, we'll just navigate to the doctor page
        // await authService.login(credentials);
        navigate('/doctor');
      } else {
        // For patient mode, directly navigate to the patient page with default ID
        navigate('/patient/default');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            AI Emotion & Voice Diagnostic Tool
          </h1>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {!activeMode ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Mode</h2>
                <p className="text-gray-600 mb-8">
                  Choose how you would like to access the system
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveMode('doctor')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-6 flex flex-col items-center shadow-md hover:shadow-lg transition-shadow"
                  >
                    <FaUserMd className="text-5xl mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Doctor Mode</h3>
                    <p className="text-sm text-blue-100">
                      Access patient records, view analytics, and manage treatment plans
                    </p>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveMode('patient')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-6 flex flex-col items-center shadow-md hover:shadow-lg transition-shadow"
                  >
                    <FaUser className="text-5xl mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Patient Mode</h3>
                    <p className="text-sm text-purple-100">
                      Complete daily check-ins, view your history, and get recommendations
                    </p>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-8">
                <button 
                  onClick={() => setActiveMode(null)}
                  className="text-gray-500 hover:text-gray-700 mb-6"
                >
                  ← Back to mode selection
                </button>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  {activeMode === 'doctor' ? 'Doctor Login' : 'Patient Access'}
                </h2>
                
                {error && (
                  <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {activeMode === 'doctor' ? (
                    <>
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                          Username
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="username"
                            name="username"
                            value={credentials.username}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your username"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaUser className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            id="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your password"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaLock className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600">Click Continue to access Patient Mode</p>
                    </div>
                  )}
                  
                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white font-medium ${
                        activeMode === 'doctor'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        activeMode === 'doctor' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'
                      } transition-colors`}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        'Continue'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      
      <footer className="py-6 px-4 text-center text-gray-500 text-sm">
        <p>AI Emotion & Voice Diagnostic Tool for Mental Healthcare © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Home;
