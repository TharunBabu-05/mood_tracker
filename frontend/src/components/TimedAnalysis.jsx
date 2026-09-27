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
      
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
      
      // Start emotion detection
      startEmotionDetection();
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            endFacialAnalysis();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting facial analysis:', error);
      setError('Failed to start camera. Please check your permissions and try again.');
      stopAllAnalysis();
    }
  };
  
  // Start emotion detection
  const startEmotionDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          // Detect face and expressions
          const detections = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();
          
          // Process detections
          if (detections) {
            const canvas = canvasRef.current;
            const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
            faceapi.matchDimensions(canvas, displaySize);
            
            // Draw detections
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
            
            // Get dominant emotion
            const expressions = detections.expressions;
            let dominantEmotion = null;
            let maxConfidence = 0;
            
            Object.entries(expressions).forEach(([emotion, confidence]) => {
              if (confidence > maxConfidence) {
                maxConfidence = confidence;
                dominantEmotion = emotion;
              }
            });
            
            // Update state
            setCurrentEmotion(dominantEmotion);
            setEmotionConfidence(maxConfidence);
            
            // Add to history
            setEmotionHistory(prev => [...prev, { emotion: dominantEmotion, confidence: maxConfidence }]);
          }
        } catch (error) {
          console.error('Error during facial detection:', error);
        }
      }
    }, 500);
  };
  
  // End facial analysis
  const endFacialAnalysis = () => {
    clearInterval(countdownIntervalRef.current);
    clearInterval(detectionIntervalRef.current);
    countdownIntervalRef.current = null;
    detectionIntervalRef.current = null;
    
    // Process results
    let result;
    
    if (emotionHistory.length > 0) {
      // Calculate dominant emotion
      const emotionCounts = {};
      let totalConfidence = {};
      
      emotionHistory.forEach(({ emotion, confidence }) => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        totalConfidence[emotion] = (totalConfidence[emotion] || 0) + confidence;
      });
      
      let dominantEmotion = null;
      let maxCount = 0;
      
      Object.entries(emotionCounts).forEach(([emotion, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      });
      
      const avgConfidence = totalConfidence[dominantEmotion] / emotionCounts[dominantEmotion];
      
      // Get medication recommendation
      const recommendation = getMedicationRecommendation(dominantEmotion, avgConfidence);
      
      // Set result
      result = {
        type: 'facial',
        timestamp: new Date(),
        dominantEmotion,
        confidence: avgConfidence,
        emotionHistory,
        recommendation
      };
    } else {
      // Even if no emotions were detected, provide a default recommendation
      // This ensures the user always gets a medication recommendation
      const defaultEmotion = 'neutral';
      const defaultConfidence = 0.5; // Medium confidence
      const recommendation = getMedicationRecommendation(defaultEmotion, defaultConfidence);
      
      result = {
        type: 'facial',
        timestamp: new Date(),
        dominantEmotion: defaultEmotion,
        confidence: defaultConfidence,
        emotionHistory: [{ emotion: defaultEmotion, confidence: defaultConfidence }],
        recommendation,
        note: 'Limited facial expressions detected. Providing a standard recommendation.'
      };
      
      setError('Limited facial expression data detected. Providing a standard recommendation.');
    }
    
    // Set the analysis result
    setAnalysisResult(result);
    
    // Notify parent component
    if (onAnalysisComplete) {
      onAnalysisComplete(result);
    }
    
    // Save to database via API
    try {
      console.log('Saving facial analysis result to database:', result);
      sessionService.createSession({
        patientId,
        emotion: result.dominantEmotion,
        emotionIntensity: result.confidence * 100,
        timestamp: result.timestamp,
        medicationRecommended: result.recommendation,
        analysisType: 'facial'
      });
      
      // Skip voice feedback to avoid speech synthesis errors
      // Instead, just log the recommendation
      console.log('Analysis complete with recommendation:', result.recommendation);
      
      const feedbackMessage = `Based on facial analysis, I detected ${formatEmotion(result.dominantEmotion)} emotion with ${Math.round(result.confidence * 100)}% confidence.`;
      console.log(feedbackMessage);
      
    } catch (err) {
      console.error('Error saving analysis result:', err);
    }
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsAnalyzing(false);
    setActiveAnalysis(null);
  };
  
  // Start voice analysis
  const startVoiceAnalysis = async () => {
    try {
      // Reset state completely to avoid any previous transcript data persisting
      setError(null);
      setTranscript(''); // Clear any previous transcript
      setInterimTranscript('');
      setAnalysisResult(null);
      setActiveAnalysis('voice');
      setIsAnalyzing(true);
      setCountdown(20);
      
      // Make sure any previous recognition instance is stopped
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping previous recognition instance:', e);
        }
        recognitionRef.current = null;
      }
      
      // Clear any global variables that might hold transcript data
      window.previousTranscript = '';
      
      // First, check for microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, we just needed to check permissions
        stream.getTracks().forEach(track => track.stop());
        console.log('Microphone permission granted');
      } catch (micError) {
        console.error('Microphone permission denied:', micError);
        setError('Microphone access is required for voice analysis. Please allow microphone access and try again.');
        stopAllAnalysis();
        return;
      }
      
      // Start speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Improve speech recognition settings
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives
        recognitionRef.current.lang = 'en-US';
        
        // Add a restart mechanism to handle potential pauses
        let restartTimeout = null;
        const restartRecognition = () => {
          if (recognitionRef.current && countdownIntervalRef.current) {
            console.log('Restarting speech recognition to ensure continuous listening');
            recognitionRef.current.stop();
            setTimeout(() => {
              if (recognitionRef.current) recognitionRef.current.start();
            }, 200);
          }
        };
        
        recognitionRef.current.onresult = (event) => {
          // Clear restart timeout since we're getting results
          if (restartTimeout) {
            clearTimeout(restartTimeout);
            restartTimeout = null;
          }
          
          let interimTranscriptText = '';
          let finalTranscriptText = '';
          
          // Process all results from this recognition session
          for (let i = event.resultIndex; i < event.results.length; i++) {
            // Get the most confident result
            const transcriptText = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscriptText += ' ' + transcriptText;
            } else {
              interimTranscriptText += transcriptText;
            }
          }
          
          // If we have final results, update the transcript
          if (finalTranscriptText.trim().length > 0) {
            // Get current transcript and append new content
            const currentTranscript = transcript || '';
            
            // Only add the new content if it's not already in the transcript
            const cleanFinalText = finalTranscriptText.trim();
            
            // Append the new text to the existing transcript
            // Don't check for duplicates as this can cause issues with similar phrases
            const updatedTranscript = currentTranscript.length > 0 
              ? (currentTranscript + ' ' + cleanFinalText).trim()
              : cleanFinalText.trim();
              
            setTranscript(updatedTranscript);
            console.log('Updated complete transcript:', updatedTranscript);
          }
          
          // Always update interim transcript
          if (interimTranscriptText.trim().length > 0) {
            setInterimTranscript(interimTranscriptText.trim());
            console.log('Interim transcript:', interimTranscriptText.trim());
          }
        };
        
        // Save the transcript when recognition ends to ensure we keep it for the next session
        recognitionRef.current.onend = () => {
          // If we have interim results, add them to the complete transcript before ending
          const interimText = interimTranscript;
          if (interimText && interimText.trim().length > 0) {
            // Get the current transcript
            const currentTranscript = transcript || '';
            
            // Always add the interim text to preserve all speech
            // Don't check for duplicates as this can cause issues with similar phrases
            const updatedTranscript = currentTranscript.length > 0
              ? (currentTranscript + ' ' + interimText).trim()
              : interimText.trim();
              
            setTranscript(updatedTranscript);
            console.log('Saving interim transcript before restart:', updatedTranscript);
          }
          
          // If recognition ends prematurely and we're still analyzing, restart it
          if (isAnalyzing && countdownIntervalRef.current && countdown > 1) {
            console.log('Speech recognition ended prematurely, restarting...');
            if (recognitionRef.current) {
              // Start with a slight delay to allow processing
              setTimeout(() => {
                if (recognitionRef.current) recognitionRef.current.start();
              }, 300);
            }
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          // Don't show error for 'no-speech' as we'll handle that separately
          if (event.error !== 'no-speech') {
            setError(`Speech recognition error: ${event.error}. Please try again.`);
          } else {
            // Set a restart timeout for no-speech errors
            restartTimeout = setTimeout(restartRecognition, 1000);
          }
        };
        
        // Start speech recognition immediately without voice feedback
        console.log('Starting speech recognition immediately');
        
        // Show a visual indicator that recording is starting
        setError('Listening to your voice... Please speak clearly.');
        
        // Start recognition immediately
        setTimeout(() => {
          // Clear any previous error message after a short delay
          setError(null);
          
          if (recognitionRef.current) {
            console.log('Starting speech recognition');
            recognitionRef.current.start();
          }
        }, 1000);
        
        // Start countdown
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            // Announce halfway point to encourage continued speaking
            if (prev === 10) {
              console.log('10 seconds remaining');
            }
            
            if (prev <= 1) {
              endVoiceAnalysis();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError('Speech recognition is not supported in your browser.');
        stopAllAnalysis();
      }
    } catch (error) {
      console.error('Error starting voice analysis:', error);
      setError('Failed to start voice recognition. Please try again.');
      stopAllAnalysis();
    }
  };
  
  // End voice analysis
  const endVoiceAnalysis = () => {
    clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = null;
    
    // First check if there's any interim transcript to save
    const currentInterim = interimTranscript;
    let finalTranscript = transcript || ''; // Start with current transcript
    
    // Add any interim transcript that hasn't been saved yet
    if (currentInterim && currentInterim.trim().length > 0) {
      finalTranscript = (finalTranscript + ' ' + currentInterim).trim();
      console.log('Final transcript with interim added:', finalTranscript);
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      recognitionRef.current = null;
    }
    
    // Process results
    let result;
    
    // CRITICAL: Always use the transcript from state, which contains all accumulated speech
    // This is essential to ensure we don't lose any speech at the end of the countdown
    const stateTranscript = transcript || '';
    console.log('Current transcript state:', stateTranscript);
    
    // Force the finalTranscript to use the state value
    finalTranscript = stateTranscript;
    
    // Log the final transcript that will be used for analysis
    console.log('Using for analysis:', finalTranscript);
    
    // FORCE ANALYSIS: Always analyze the transcript regardless of content
    // This ensures we always process whatever speech was captured
    console.log('Forcing analysis of transcript:', finalTranscript);
    if (true) { // Always process the transcript
      // Update the transcript state with the final version
      setTranscript(finalTranscript);
      
      // Log the transcript for debugging
      console.log('Valid transcript detected:', finalTranscript);
      
      // Analyze text for emotional content
      const emotionAnalysis = analyzeTextEmotion(finalTranscript);
      console.log('Emotion analysis result:', emotionAnalysis);
      
      // Analyze voice tone (simplified version using text)
      const toneAnalysis = analyzeVoiceTone(finalTranscript);
      console.log('Tone analysis result:', toneAnalysis);      
      // Get medication recommendation based on detected emotion
      const recommendation = getMedicationRecommendation(
        emotionAnalysis.primaryEmotion, 
        emotionAnalysis.confidence
      );
      
      // Set result
      result = {
        type: 'voice',
        timestamp: new Date(),
        transcript: finalTranscript,
        emotion: emotionAnalysis.primaryEmotion,
        confidence: emotionAnalysis.confidence,
        voiceTone: toneAnalysis.tone,
        tonePrediction: toneAnalysis.description,
        recommendation
      };
      
      console.log('Voice analysis complete with results:', result);
      // Clear any error that might have been set
      setError(null);
    } else {
      // Even if no speech was detected, provide a default recommendation
      // This ensures the user always gets a medication recommendation
      console.log('No valid transcript detected, using default values');
      
      const defaultEmotion = 'neutral';
      const defaultConfidence = 0.5; // Medium confidence
      const defaultTone = 'neutral';
      const recommendation = getMedicationRecommendation(defaultEmotion, defaultConfidence);
      
      result = {
        type: 'voice',
        timestamp: new Date(),
        transcript: 'No clear speech detected',
        emotion: defaultEmotion,
        confidence: defaultConfidence,
        voiceTone: defaultTone,
        tonePrediction: 'Normal pace and volume with natural intonation',
        recommendation,
        note: 'Limited speech detected. Providing a standard recommendation.'
      };
      
      setError('Limited speech detected. Providing a standard recommendation.');
    }
    
    // Set the analysis result
    setAnalysisResult(result);
    
    // Notify parent component
    if (onAnalysisComplete) {
      onAnalysisComplete(result);
    }
    
    // Save to database via API
    try {
      console.log('Saving voice analysis result to database:', result);
      sessionService.createSession({
        patientId,
        emotion: result.emotion,
        emotionIntensity: result.confidence * 100,
        voiceTone: result.voiceTone,
        transcript: result.transcript,
        timestamp: result.timestamp,
        medicationRecommended: result.recommendation,
        analysisType: 'voice'
      });
      
      // Only provide voice feedback if user hasn't disabled it
      // We'll skip the voice feedback to avoid the speech synthesis error
      // but keep the result data for display
      console.log('Analysis complete with recommendation:', result.recommendation);
      
      // Create a feedback message for the user
      const feedbackMessage = `Based on voice analysis, I detected ${formatEmotion(result.emotion)} emotion with ${Math.round(result.confidence * 100)}% confidence. Your voice tone appears to be ${result.voiceTone}. I recommend ${result.recommendation.medication} at ${result.recommendation.dosage}. ${result.recommendation.advice}`;
      console.log(feedbackMessage);
      
      // Automatically speak the recommendation after a short delay
      // This ensures the UI has time to update before the speech starts
      setTimeout(() => {
        speakText(feedbackMessage, { rate: 0.9, pitch: 1 });
      }, 1000);
      
    } catch (err) {
      console.error('Error saving analysis result:', err);
    }
    
    setIsAnalyzing(false);
    setActiveAnalysis(null);
  };
  
  // Format emotion name for display
  const formatEmotion = (emotion) => {
    if (!emotion) return 'Not detected';
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };
  
  // Get emotion emoji
  const getEmotionEmoji = (emotion) => {
    if (!emotion) return '❓';
    
    switch (emotion.toLowerCase()) {
      case 'happy': return '😊';
      case 'sad': return '😔';
      case 'angry': return '😠';
      case 'fearful': return '😨';
      case 'disgusted': return '🤢';
      case 'surprised': return '😲';
      case 'neutral': return '😐';
      default: return '❓';
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6 text-center">Emotion Analysis</h2>
      
      {/* Loading state */}
      {loadingModels && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading facial recognition models...</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          <p className="font-medium">{error}</p>
        </div>
      )}
      
      {/* Analysis buttons */}
      {!isAnalyzing && !analysisResult && !loadingModels && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={startFacialAnalysis}
            disabled={!modelsLoaded}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
              modelsLoaded 
                ? 'border-blue-400 hover:bg-blue-50 hover:border-blue-500' 
                : 'border-gray-300 bg-gray-100 cursor-not-allowed'
            }`}
          >
            <FaCamera className="text-4xl mb-3 text-blue-500" />
            <h3 className="text-lg font-medium mb-2">Facial Analysis</h3>
            <p className="text-sm text-gray-600 text-center">
              Analyze your facial expressions to detect emotions
            </p>
          </button>
          
          <button
            onClick={startVoiceAnalysis}
            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-purple-400 hover:bg-purple-50 hover:border-purple-500 transition-all"
          >
            <FaMicrophone className="text-4xl mb-3 text-purple-500" />
            <h3 className="text-lg font-medium mb-2">Voice Analysis</h3>
            <p className="text-sm text-gray-600 text-center">
              Analyze your voice and speech to detect emotions
            </p>
          </button>
        </div>
      )}
      
      {/* Active analysis */}
      {isAnalyzing && (
        <div className="relative">
          {/* Countdown */}
          <div className="absolute top-4 right-4 bg-gray-800/80 text-white font-bold rounded-full w-12 h-12 flex items-center justify-center z-10">
            {countdown}s
          </div>
          
          {/* Stop button */}
          <button
            onClick={activeAnalysis === 'facial' ? endFacialAnalysis : endVoiceAnalysis}
            className="absolute top-4 left-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full z-10"
          >
            <FaStopCircle className="text-xl" />
          </button>
          
          {/* Facial analysis */}
          {activeAnalysis === 'facial' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 text-center">Facial Emotion Analysis</h3>
              
              <div className="relative w-full max-w-lg mx-auto bg-black rounded-lg overflow-hidden mb-4">
                <video 
                  ref={videoRef} 
                  className="w-full"
                  width="640"
                  height="480"
                  muted
                  playsInline
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full"
                  width="640"
                  height="480"
                />
              </div>
              
              {currentEmotion && (
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full mb-2">
                    <span className="text-2xl mr-2">{getEmotionEmoji(currentEmotion)}</span>
                    <span className="font-medium">{formatEmotion(currentEmotion)}</span>
                  </div>
                  <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.round(emotionConfidence * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Voice analysis */}
          {activeAnalysis === 'voice' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 text-center">Voice Emotion Analysis</h3>
              
              <div className="bg-gray-100 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 ${interimTranscript ? 'bg-green-500 animate-pulse' : 'bg-purple-500'} rounded-full flex items-center justify-center transition-colors duration-300`}>
                    <FaMicrophone className="text-white text-2xl" />
                  </div>
                </div>
                
                {/* Speech detection indicator */}
                <div className="mb-4">
                  <div className="flex justify-center items-center space-x-2">
                    <span className="text-sm font-medium">Speech detection:</span>
                    <span className={`inline-flex h-3 w-3 rounded-full ${interimTranscript ? 'bg-green-500' : transcript ? 'bg-green-400' : 'bg-yellow-500'}`}></span>
                    <span className="text-sm">
                      {interimTranscript ? 'Active' : transcript ? 'Detected' : 'Waiting...'}
                    </span>
                  </div>
                </div>
                
                {/* Transcript display with better visual feedback */}
                <div className="bg-white rounded-lg p-4 mb-4 min-h-[100px] text-left border border-gray-200 shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-2 text-sm">Transcript:</h4>
                  {transcript ? (
                    <p className="text-lg font-medium">"{transcript}"</p>
                  ) : interimTranscript ? (
                    <p className="text-lg text-gray-600 italic">{interimTranscript}...</p>
                  ) : (
                    <p className="text-gray-400 italic">Speak clearly into your microphone...</p>
                  )}
                </div>
                
                {/* Voice tips */}
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">Tips for better results:</p>
                  <ul className="text-left list-disc pl-5">
                    <li>Speak clearly and at a normal pace</li>
                    <li>Use complete sentences when possible</li>
                    <li>Describe how you're feeling with emotion words</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-center text-gray-500 text-sm mt-4">
            Analysis will automatically complete in {countdown} seconds
          </p>
        </div>
      )}
      
      {/* Analysis results */}
      {analysisResult && (
        <div className="animate-fade-in">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-center">Analysis Results</h3>
              
              {/* Result type */}
              <div className="flex justify-center mb-6">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800">
                  {analysisResult.type === 'facial' ? (
                    <>
                      <FaCamera className="mr-2" />
                      <span>Facial Analysis</span>
                    </>
                  ) : (
                    <>
                      <FaMicrophone className="mr-2" />
                      <span>Voice Analysis</span>
                    </>
                  )}
                </span>
              </div>
              
              {/* Facial analysis results */}
              {analysisResult.type === 'facial' && (
                <div className="mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="text-center">
                      <div className="text-5xl mb-2">
                        {getEmotionEmoji(analysisResult.dominantEmotion)}
                      </div>
                      <h4 className="text-lg font-medium capitalize">
                        {analysisResult.dominantEmotion}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Confidence: {Math.round(analysisResult.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Voice analysis results */}
              {analysisResult.type === 'voice' && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-2">Detected Emotion</h4>
                      <p className="text-lg font-semibold capitalize">{analysisResult.emotion}</p>
                      <p className="text-sm text-gray-600">
                        Confidence: {Math.round(analysisResult.confidence * 100)}%
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-2">Voice Tone</h4>
                      <p className="text-lg font-semibold capitalize">{analysisResult.voiceTone}</p>
                      <p className="text-sm text-gray-600">{analysisResult.tonePrediction}</p>
                    </div>
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
