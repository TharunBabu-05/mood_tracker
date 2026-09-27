import React, { useState, useRef, useEffect } from 'react';
import { FaCamera, FaMicrophone, FaStopCircle, FaVolumeUp } from 'react-icons/fa';
import * as faceapi from 'face-api.js';
import { analyzeTextEmotion, analyzeVoiceTone, speakText } from '../utils/voiceProcessing';
import { getMedicationRecommendation } from '../utils/emotionMapping';
import { sessionService } from '../services/api';

const TimedAnalysis = ({ patientId, onAnalysisComplete }) => {
  // Analysis state
  const [activeAnalysis, setActiveAnalysis] = useState(null); // 'facial', 'voice', or null
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // Facial analysis state
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionConfidence, setEmotionConfidence] = useState(0);
  const [emotionHistory, setEmotionHistory] = useState([]);
  
  // Voice analysis state
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Results state
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setLoadingModels(false);
        console.log('Face-api models loaded successfully');
      } catch (error) {
        console.error('Failed to load face-api models:', error);
        setError('Failed to load facial recognition models. Please refresh and try again.');
        setLoadingModels(false);
      }
    };
    
    loadModels();
    
    // Cleanup on unmount
    return () => {
      stopAllAnalysis();
    };
  }, []);
  
  // Cleanup function
  const stopAllAnalysis = () => {
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Clear intervals
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setIsAnalyzing(false);
    setActiveAnalysis(null);
  };
  
  // Start facial analysis
  const startFacialAnalysis = async () => {
    if (!modelsLoaded) {
      setError('Facial recognition models are not loaded yet. Please wait.');
      return;
    }
    
    try {
      // Reset state
      setError(null);
      setCurrentEmotion(null);
      setEmotionConfidence(0);
      setEmotionHistory([]);
      setAnalysisResult(null);
      setActiveAnalysis('facial');
      setIsAnalyzing(true);
      setCountdown(20);
      
      console.log('Requesting camera permissions for facial analysis...');
      // Start camera with improved settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Prefer front camera
        }
      });
      
      console.log('Camera permissions granted, setting up video stream...');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready before starting analysis
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, playing video...');
          videoRef.current.play()
            .then(() => {
              console.log('Video playing, starting emotion detection...');
              // Start emotion detection only after video is playing
              startEmotionDetection();
            })
            .catch(err => {
              console.error('Error playing video:', err);
              setError('Failed to play video stream. Please refresh and try again.');
            });
        };
      }
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            endFacialAnalysis();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting facial analysis:', error);
      setError('Failed to access camera. Please check permissions and try again.');
      setIsAnalyzing(false);
      setActiveAnalysis(null);
    }
  };
  
  // Start emotion detection
  const startEmotionDetection = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      return;
    }
    
    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    
    console.log('Setting up emotion detection...');
    
    // Set canvas dimensions to match video
    const updateCanvasDimensions = () => {
      canvas.width = videoEl.videoWidth || videoEl.clientWidth;
      canvas.height = videoEl.videoHeight || videoEl.clientHeight;
      console.log(`Canvas dimensions set to ${canvas.width}x${canvas.height}`);
    };
    
    // Initial setup
    updateCanvasDimensions();
    
    // Update dimensions if video size changes
    videoEl.addEventListener('resize', updateCanvasDimensions);
    
    // Start detection interval with a slightly longer interval to ensure stability
    console.log('Starting facial detection interval...');
    detectionIntervalRef.current = setInterval(async () => {
      if (videoEl.readyState === 4) { // Video is ready
        try {
          // Detect face and expressions with improved settings
          const detections = await faceapi
            .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
            .withFaceLandmarks()
            .withFaceExpressions();
          
          if (detections) {
            console.log('Face detected:', detections.expressions);
            // Draw detections
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw face detection results
            faceapi.draw.drawDetections(canvas, detections);
            faceapi.draw.drawFaceLandmarks(canvas, detections);
            faceapi.draw.drawFaceExpressions(canvas, detections);
            
            // Get emotion with highest score
            const expressions = detections.expressions;
            let maxValue = 0;
            let maxEmotion = null;
            
            for (const [emotion, value] of Object.entries(expressions)) {
              if (value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
              }
            }
            
            if (maxEmotion) {
              console.log(`Detected emotion: ${maxEmotion} with confidence ${maxValue}`);
              setCurrentEmotion(maxEmotion);
              setEmotionConfidence(maxValue);
              setEmotionHistory(prev => [...prev, { emotion: maxEmotion, confidence: maxValue }]);
            }
          } else {
            console.log('No face detected in this frame');
          }
        } catch (error) {
          console.error('Error during face detection:', error);
        }
      } else {
        console.log(`Video not ready yet, readyState: ${videoEl.readyState}`);
      }
    }, 300); // Run detection every 300ms for better stability
  };
  
  // End facial analysis
  const endFacialAnalysis = () => {
    console.log('Ending facial analysis and processing results...');
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setIsAnalyzing(false);
    
    // Process results
    console.log('Processing facial analysis results...');
    console.log('Emotion history:', emotionHistory);
    
    // Calculate dominant emotion with improved algorithm
    const emotionCounts = {};
    let dominantEmotion = 'neutral';
    let totalConfidence = 0;
    
    if (emotionHistory.length > 0) {
      // Count occurrences of each emotion
      emotionHistory.forEach(item => {
        emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
        totalConfidence += item.confidence;
      });
      
      // Find the most frequent emotion
      let maxCount = 0;
      for (const [emotion, count] of Object.entries(emotionCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      }
      
      console.log(`Dominant facial emotion: ${dominantEmotion} (detected ${maxCount} times out of ${emotionHistory.length} frames)`);
    } else {
      console.log('No facial emotions detected during analysis');
    }
    
    // Calculate average confidence
    const avgConfidence = emotionHistory.length > 0 
      ? totalConfidence / emotionHistory.length 
      : 0;
    
    console.log(`Average facial confidence: ${avgConfidence}`);
    
    // Get medication recommendation based on detected emotion
    const recommendation = getMedicationRecommendation(
      dominantEmotion, 
      avgConfidence
    );
    
    // Create result object with more detailed information
    const result = {
      type: 'facial',
      timestamp: new Date(),
      dominantEmotion,
      confidence: avgConfidence,
      emotionCounts,
      emotionHistory: emotionHistory.slice(-10), // Include last 10 emotion readings
      recommendation
    };
    
    console.log('Final facial analysis result:', result);
    
    // Set analysis result
    setAnalysisResult(result);
    
    // Pass result to parent component
    if (onAnalysisComplete) {
      onAnalysisComplete(result);
    }
    
    // Provide voice feedback
    const feedbackMessage = `Based on facial analysis, I detected ${formatEmotion(dominantEmotion)} emotion with ${Math.round(avgConfidence * 100)}% confidence. I recommend ${recommendation.medication} at ${recommendation.dosage}. ${recommendation.advice}`;
    
    console.log('Providing voice feedback...');
    speakText(feedbackMessage, { rate: 0.9, pitch: 1 });
  };
  
  // Start voice analysis
  const startVoiceAnalysis = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }
    
    try {
      // Reset state
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      setAnalysisResult(null);
      setActiveAnalysis('voice');
      setIsAnalyzing(true);
      setCountdown(20);
      
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      let finalTranscript = '';
      
      const restartRecognition = () => {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
        }
      };
      
      recognition.onresult = (event) => {
        let interimTranscriptText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            setTranscript(finalTranscript.trim());
          } else {
            interimTranscriptText += transcript;
            setInterimTranscript(interimTranscriptText);
          }
        }
      };
      
      // Save the transcript when recognition ends to ensure we keep it for the next session
      recognition.onend = () => {
        // If we're still analyzing, restart recognition
        if (isAnalyzing && activeAnalysis === 'voice') {
          restartRecognition();
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          // No speech detected, just restart
          restartRecognition();
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };
      
      // Start recognition
      recognition.start();
      recognitionRef.current = recognition;
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            endVoiceAnalysis();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting voice analysis:', error);
      setError('Failed to start speech recognition. Please try again.');
      setIsAnalyzing(false);
      setActiveAnalysis(null);
    }
  };
  
  // End voice analysis
  const endVoiceAnalysis = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setIsAnalyzing(false);
    
    // Process results
    if (transcript) {
      // Analyze text for emotional content
      const emotionAnalysis = analyzeTextEmotion(transcript);
      
      // Analyze voice tone (simplified version using text)
      const toneAnalysis = analyzeVoiceTone(transcript);
      
      // Get medication recommendation based on detected emotion
      const recommendation = getMedicationRecommendation(
        emotionAnalysis.primaryEmotion, 
        emotionAnalysis.confidence
      );
      
      // Create result object
      const result = {
        type: 'voice',
        timestamp: new Date(),
        transcript,
        emotion: emotionAnalysis.primaryEmotion,
        confidence: emotionAnalysis.confidence,
        emotions: emotionAnalysis.emotions,
        voiceTone: toneAnalysis.tone,
        voiceToneDescription: toneAnalysis.description,
        recommendation
      };
      
      // Set analysis result
      setAnalysisResult(result);
      
      // Pass result to parent component
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      
      // Provide voice feedback
      const feedbackMessage = `Based on voice analysis, I detected ${formatEmotion(emotionAnalysis.primaryEmotion)} emotion with ${Math.round(emotionAnalysis.confidence * 100)}% confidence. Your voice tone appears to be ${toneAnalysis.tone}. I recommend ${recommendation.medication} at ${recommendation.dosage}. ${recommendation.advice}`;
      
      speakText(feedbackMessage, { rate: 0.9, pitch: 1 });
    } else {
      setError('No speech detected. Please try again and speak clearly.');
    }
  };
  
  // Format emotion name for display
  const formatEmotion = (emotion) => {
    if (!emotion) return 'neutral';
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };
  
  // Get emotion emoji
  const getEmotionEmoji = (emotion) => {
    switch (emotion?.toLowerCase()) {
      case 'happy': return '😊';
      case 'sad': return '😔';
      case 'angry': return '😠';
      case 'fearful': return '😨';
      case 'disgusted': return '🤢';
      case 'surprised': return '😲';
      case 'neutral': return '😐';
      default: return '🤔';
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {!isAnalyzing && !analysisResult && (
        <div className="p-6">
          <h3 className="text-xl font-bold text-center mb-6">Emotion Analysis</h3>
          <p className="text-gray-600 text-center mb-8">
            Our AI system can analyze your emotions through facial expressions and voice patterns to provide personalized medication recommendations.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={startFacialAnalysis}
              disabled={!modelsLoaded || loadingModels || isAnalyzing}
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 ${
                !modelsLoaded || loadingModels
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
              }`}
            >
              <div className="bg-blue-100 p-4 rounded-full mb-4">
                <FaCamera className="text-blue-600 text-2xl" />
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Facial Analysis</h4>
              <p className="text-sm text-gray-600 text-center">
                Analyzes your facial expressions for 20 seconds
              </p>
            </button>
            
            <button
              onClick={startVoiceAnalysis}
              disabled={isAnalyzing}
              className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300"
            >
              <div className="bg-purple-100 p-4 rounded-full mb-4">
                <FaMicrophone className="text-purple-600 text-2xl" />
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Voice Analysis</h4>
              <p className="text-sm text-gray-600 text-center">
                Analyzes your speech and voice tone for 20 seconds
              </p>
            </button>
          </div>
          
          {loadingModels && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-600">Loading facial recognition models...</p>
            </div>
          )}
        </div>
      )}
      
      {isAnalyzing && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">
              {activeAnalysis === 'facial' ? 'Facial Analysis' : 'Voice Analysis'}
            </h3>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
              {countdown}s remaining
            </div>
          </div>
          
          {activeAnalysis === 'facial' && (
            <div className="relative mb-6">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded-lg"
                width="640"
                height="480"
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
              />
              
              {/* Current emotion overlay */}
              {currentEmotion && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center">
                  <span className="mr-1">{getEmotionEmoji(currentEmotion)}</span>
                  <span>{formatEmotion(currentEmotion)}</span>
                  <span className="ml-1 text-xs">
                    ({Math.round(emotionConfidence * 100)}%)
                  </span>
                </div>
              )}
            </div>
          )}
          
          {activeAnalysis === 'voice' && (
            <div className="mb-6">
              <div className="bg-purple-100 rounded-lg p-6 flex flex-col items-center justify-center mb-4">
                <div className="bg-purple-200 p-4 rounded-full mb-4">
                  <FaMicrophone className="text-purple-600 text-3xl animate-pulse" />
                </div>
                <p className="text-purple-800 font-medium mb-2">Listening to your voice...</p>
                <p className="text-sm text-purple-600 text-center">
                  Please speak naturally about how you're feeling today.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-inner min-h-[100px]">
                <h4 className="font-medium text-gray-700 mb-2">Transcript:</h4>
                <p className="text-gray-800">
                  {transcript}
                  <span className="text-gray-400 italic">{interimTranscript}</span>
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              if (activeAnalysis === 'facial') {
                endFacialAnalysis();
              } else {
                endVoiceAnalysis();
              }
            }}
            className="w-full py-3 px-6 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center"
          >
            <FaStopCircle className="mr-2" />
            Stop Analysis
          </button>
          
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mt-4">
              {error}
            </div>
          )}
        </div>
      )}
      
      {analysisResult && (
        <div className="p-6">
          <h3 className="text-xl font-bold mb-6">
            {analysisResult.type === 'facial' ? 'Facial Analysis Results' : 'Voice Analysis Results'}
          </h3>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 shadow-sm mb-6">
            {analysisResult.type === 'facial' ? (
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <span className="text-3xl">{getEmotionEmoji(analysisResult.dominantEmotion)}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Detected Emotion</h4>
                  <p className="text-xl font-bold text-blue-700">
                    {formatEmotion(analysisResult.dominantEmotion)}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({Math.round(analysisResult.confidence * 100)}% confidence)
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 p-3 rounded-full mr-4">
                    <span className="text-3xl">{getEmotionEmoji(analysisResult.emotion)}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">Detected Emotion</h4>
                    <p className="text-xl font-bold text-purple-700">
                      {formatEmotion(analysisResult.emotion)}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({Math.round(analysisResult.confidence * 100)}% confidence)
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Voice Tone</h4>
                  <p className="text-gray-800 capitalize">{analysisResult.voiceTone}</p>
                  <p className="text-sm text-gray-600 mt-1">{analysisResult.voiceToneDescription}</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Transcript</h4>
                  <p className="text-gray-600 italic">"{analysisResult.transcript}"</p>
                </div>
              </div>
            )}
            
            {/* Medication recommendation */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 shadow-md border-l-4 border-green-500 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xl font-bold text-green-800">Recommended Medication</h4>
                <button 
                  onClick={() => {
                    // Create feedback message based on analysis type
                    let feedbackMessage = '';
                    if (analysisResult.type === 'facial') {
                      feedbackMessage = `Based on facial analysis, I detected ${formatEmotion(analysisResult.dominantEmotion)} emotion with ${Math.round(analysisResult.confidence * 100)}% confidence. I recommend ${analysisResult.recommendation.medication} at ${analysisResult.recommendation.dosage}. ${analysisResult.recommendation.advice}`;
                    } else {
                      feedbackMessage = `Based on voice analysis, I detected ${formatEmotion(analysisResult.emotion)} emotion with ${Math.round(analysisResult.confidence * 100)}% confidence. Your voice tone appears to be ${analysisResult.voiceTone}. I recommend ${analysisResult.recommendation.medication} at ${analysisResult.recommendation.dosage}. ${analysisResult.recommendation.advice}`;
                    }
                    speakText(feedbackMessage, { rate: 0.9, pitch: 1 });
                  }}
                  className="flex items-center bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded-full transition-colors"
                >
                  <FaVolumeUp className="mr-1" />
                  <span>Replay</span>
                </button>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm mb-3 border border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-2xl font-bold text-blue-700">{analysisResult.recommendation.medication}</p>
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-full">
                    {analysisResult.recommendation.dosage}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">Medical Advice:</h5>
                <p className="text-gray-700">{analysisResult.recommendation.advice}</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => {
                // Completely reset all state
                setAnalysisResult(null);
                setError(null);
                setTranscript('');
                setInterimTranscript('');
                
                // Make sure any previous recognition instance is stopped
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch (e) {
                    console.log('Error stopping previous recognition instance:', e);
                  }
                  recognitionRef.current = null;
                }
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              Start New Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimedAnalysis;
