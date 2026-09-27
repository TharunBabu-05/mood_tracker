import React, { useState, useRef, useEffect } from 'react';
import { FaCamera, FaMicrophone, FaStopCircle, FaVolumeUp, FaPlay } from 'react-icons/fa';
import * as faceapi from 'face-api.js';
import { analyzeTextEmotion, analyzeVoiceTone, speakText } from '../utils/voiceProcessing';
import { getMedicationRecommendation } from '../utils/emotionMapping';
import { sessionService } from '../services/api';

const CombinedAnalysis = ({ patientId, onAnalysisComplete }) => {
  // Analysis state
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
  const [voiceEmotion, setVoiceEmotion] = useState(null);
  const [voiceTone, setVoiceTone] = useState(null);
  
  // Combined results state
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
  };
  
  // Start combined analysis
  const startCombinedAnalysis = async () => {
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
      setTranscript('');
      setInterimTranscript('');
      setVoiceEmotion(null);
      setVoiceTone(null);
      setAnalysisResult(null);
      setIsAnalyzing(true);
      setCountdown(20);
      
      // Start camera with audio
      // Request separate streams for better compatibility
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      
      // Set up video stream
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        streamRef.current = videoStream;
        await videoRef.current.play();
        console.log('Video stream started successfully');
      }
      
      // Start emotion detection after video is playing
      setTimeout(() => {
        startEmotionDetection();
        console.log('Emotion detection started');
      }, 500);
      
      // Start voice recognition separately
      setTimeout(() => {
        startVoiceRecognition();
        console.log('Voice recognition started');
      }, 1000);
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            endCombinedAnalysis();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting analysis:', error);
      setError('Failed to access camera or microphone. Please check permissions and try again.');
      setIsAnalyzing(false);
    }
  };
  
  // Start emotion detection
  const startEmotionDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = videoEl.width;
    canvas.height = videoEl.height;
    
    // Start detection interval
    detectionIntervalRef.current = setInterval(async () => {
      if (videoEl.readyState === 4) { // Video is ready
        try {
          // Make sure models are loaded
          if (!modelsLoaded) {
            console.log('Models not loaded yet, waiting...');
            return;
          }
          
          console.log('Detecting face...');
          // Use the same detection approach as in the image
          const detections = await faceapi
            .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceExpressions();
          
          if (detections) {
            // Draw detections
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Get the detected face box and expressions
            const { detection } = detections;
            const expressions = detections.expressions;
            let maxValue = 0;
            let maxEmotion = null;
            
            // Find the dominant emotion
            for (const [emotion, value] of Object.entries(expressions)) {
              if (value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
              }
            }
            
            if (detection) {
              const box = detection.box;
              
              // 1. Draw blue bounding box similar to the image
              context.strokeStyle = 'rgb(0, 0, 255)';
              context.lineWidth = 3;
              context.strokeRect(box.x, box.y, box.width, box.height);
              
              // 2. Draw confidence score in top-left corner
              const scoreText = `${maxValue.toFixed(2)}`;
              context.font = 'bold 16px Arial';
              context.fillStyle = 'rgb(0, 0, 255)';
              context.fillRect(box.x, box.y, 40, 20);
              context.fillStyle = 'white';
              context.fillText(scoreText, box.x + 5, box.y + 15);
              
              // 3. Draw emotion label at bottom of box
              const labelText = `${maxEmotion} (${maxValue.toFixed(2)})`;
              const labelWidth = context.measureText(labelText).width + 10;
              const labelHeight = 20;
              context.fillStyle = 'rgba(0, 0, 0, 0.7)';
              context.fillRect(box.x, box.y + box.height, labelWidth, labelHeight);
              context.fillStyle = 'white';
              context.fillText(labelText, box.x + 5, box.y + box.height + 15);
              
              // 4. Draw facial landmarks with colored points
              try {
                // Access landmarks from the detections object
                const landmarks = detections.landmarks;
                if (landmarks && landmarks.positions) {
                  const positions = landmarks.positions;
                  
                  // Draw all landmarks
                  positions.forEach(point => {
                    context.beginPath();
                    context.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    context.fillStyle = 'rgb(255, 0, 255)';
                    context.fill();
                  });
                  
                  // Draw facial contour (jaw line)
                  const jawLine = positions.slice(0, 17);
                  context.beginPath();
                  context.moveTo(jawLine[0].x, jawLine[0].y);
                  jawLine.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  // Connect landmarks for eyes
                  const leftEyebrow = positions.slice(17, 22);
                  const rightEyebrow = positions.slice(22, 27);
                  const leftEye = positions.slice(36, 42);
                  const rightEye = positions.slice(42, 48);
                  const nose = positions.slice(27, 36);
                  const mouth = positions.slice(48, 68);
                  
                  // Draw eyebrows
                  context.beginPath();
                  context.moveTo(leftEyebrow[0].x, leftEyebrow[0].y);
                  leftEyebrow.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  context.beginPath();
                  context.moveTo(rightEyebrow[0].x, rightEyebrow[0].y);
                  rightEyebrow.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  // Draw left eye
                  context.beginPath();
                  context.moveTo(leftEye[0].x, leftEye[0].y);
                  leftEye.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.closePath();
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  // Draw right eye
                  context.beginPath();
                  context.moveTo(rightEye[0].x, rightEye[0].y);
                  rightEye.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.closePath();
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  // Draw nose
                  context.beginPath();
                  context.moveTo(nose[0].x, nose[0].y);
                  nose.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  // Draw outer mouth
                  context.beginPath();
                  context.moveTo(mouth[0].x, mouth[0].y);
                  const outerMouth = mouth.slice(0, 12);
                  outerMouth.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.closePath();
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                  
                  // Draw inner mouth
                  context.beginPath();
                  context.moveTo(mouth[12].x, mouth[12].y);
                  const innerMouth = mouth.slice(12);
                  innerMouth.forEach(point => {
                    context.lineTo(point.x, point.y);
                  });
                  context.closePath();
                  context.strokeStyle = 'rgb(0, 255, 255)';
                  context.lineWidth = 1;
                  context.stroke();
                } else {
                  console.log('No landmarks found in the detection');
                }
              } catch (error) {
                console.error('Error drawing facial landmarks:', error);
              }
            }
            
            if (maxEmotion) {
              setCurrentEmotion(maxEmotion);
              setEmotionConfidence(maxValue);
              setEmotionHistory(prev => [...prev, { 
                emotion: maxEmotion, 
                confidence: maxValue,
                box: detection ? {
                  x: detection.box.x,
                  y: detection.box.y,
                  width: detection.box.width,
                  height: detection.box.height
                } : null
              }]);
              console.log('Facial emotion detected:', maxEmotion, maxValue);
            }
          } else {
            console.log('No face detected in this frame');
          }
        } catch (error) {
          console.error('Error during face detection:', error);
        }
      } else {
        console.log('Video not ready yet, readyState:', videoEl.readyState);
      }
    }, 300); // Run detection every 300ms for better performance
  };
  
  // Start voice recognition
  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }
    
    // Make sure any previous instance is stopped
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping previous recognition instance:', e);
      }
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    let finalTranscript = '';
    
    recognition.onresult = (event) => {
      let interimTranscriptText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          setTranscript(finalTranscript.trim());
          
          // Analyze text for emotion immediately when we get final results
          const emotionAnalysis = analyzeTextEmotion(finalTranscript.trim());
          setVoiceEmotion(emotionAnalysis.primaryEmotion);
          
          const toneAnalysis = analyzeVoiceTone(finalTranscript.trim());
          setVoiceTone(toneAnalysis.tone);
          
          console.log('Voice analysis:', emotionAnalysis.primaryEmotion, toneAnalysis.tone);
        } else {
          interimTranscriptText += transcript;
          setInterimTranscript(interimTranscriptText);
        }
      }
    };
    
    recognition.onend = () => {
      // Restart recognition if we're still analyzing
      if (isAnalyzing) {
        try {
          console.log('Recognition ended, restarting...');
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
        }
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // No speech detected, just restart
        try {
          recognition.stop();
          setTimeout(() => {
            if (isAnalyzing) recognition.start();
          }, 300);
        } catch (e) {
          console.error('Error restarting recognition after no-speech:', e);
        }
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    
    try {
      recognition.start();
      recognitionRef.current = recognition;
      console.log('Speech recognition started successfully');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition. Please try again.');
    }
  };
  
  // End combined analysis
  const endCombinedAnalysis = () => {
    console.log('Ending combined analysis...');
    
    // Process results before stopping everything
    processCombinedResults();
    
    // Stop all ongoing processes
    setTimeout(() => {
      stopAllAnalysis();
    }, 500); // Small delay to ensure processing completes
  };
  
  // Process combined results
  const processCombinedResults = () => {
    console.log('Processing combined results...');
    console.log('Emotion history:', emotionHistory);
    console.log('Voice emotion:', voiceEmotion);
    console.log('Voice tone:', voiceTone);
    console.log('Transcript:', transcript);
    
    // Calculate dominant facial emotion
    const emotionCounts = {};
    let dominantEmotion = 'neutral';
    let totalConfidence = 0;
    
    if (emotionHistory.length > 0) {
      emotionHistory.forEach(item => {
        emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
        totalConfidence += item.confidence;
      });
      
      let maxCount = 0;
      for (const [emotion, count] of Object.entries(emotionCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      }
    }
    
    // Calculate average confidence
    const avgFacialConfidence = emotionHistory.length > 0 
      ? totalConfidence / emotionHistory.length 
      : 0;
    
    // Get voice analysis results
    const voiceEmotionResult = voiceEmotion || 'neutral';
    const voiceToneResult = voiceTone || 'neutral';
    
    // Determine combined emotion with better weighting
    let combinedEmotion = 'neutral';
    
    // If both analyses detected emotions, use a weighted approach
    if (dominantEmotion !== 'neutral' && voiceEmotionResult !== 'neutral') {
      // If they detected the same emotion, use that with high confidence
      if (dominantEmotion === voiceEmotionResult) {
        combinedEmotion = dominantEmotion;
      } 
      // If they detected different emotions, use a weighted approach
      else {
        // Give more weight to stronger signals
        const facialWeight = avgFacialConfidence > 0.6 ? 0.7 : 0.5;
        const voiceWeight = 1 - facialWeight;
        
        // Simple decision - if facial confidence is higher, use facial emotion
        if (avgFacialConfidence > 0.4) {
          combinedEmotion = dominantEmotion;
        } else {
          combinedEmotion = voiceEmotionResult;
        }
      }
    } 
    // If only one detected an emotion, use that one
    else if (dominantEmotion !== 'neutral') {
      combinedEmotion = dominantEmotion;
    } else if (voiceEmotionResult !== 'neutral') {
      combinedEmotion = voiceEmotionResult;
    }
    
    // Calculate combined confidence - weighted average of both confidences
    let combinedConfidence = 0;
    
    if (emotionHistory.length > 0 && transcript.length > 0) {
      // Both analyses have data
      combinedConfidence = (avgFacialConfidence * 0.6) + (0.4 * 0.7); // Assume voice confidence of 0.7 if we have transcript
    } else if (emotionHistory.length > 0) {
      // Only facial analysis has data
      combinedConfidence = avgFacialConfidence;
    } else if (transcript.length > 0) {
      // Only voice analysis has data
      combinedConfidence = 0.7; // Assume moderate confidence for voice
    } else {
      // No data from either analysis
      combinedConfidence = 0.4; // Default confidence
    }
    
    // Get medication recommendation based on combined emotion
    const recommendation = getMedicationRecommendation(
      combinedEmotion, 
      combinedConfidence
    );
    
    // Create combined analysis result
    const result = {
      type: 'combined',
      timestamp: new Date(),
      facialAnalysis: {
        dominantEmotion: dominantEmotion,
        confidence: avgFacialConfidence,
        emotionCounts: emotionCounts
      },
      voiceAnalysis: {
        emotion: voiceEmotionResult,
        voiceTone: voiceToneResult,
        transcript: transcript
      },
      combinedResult: {
        emotion: combinedEmotion,
        confidence: combinedConfidence
      },
      recommendation: recommendation
    };
    
    console.log('Combined analysis result:', result);
    
    // Set analysis result
    setAnalysisResult(result);
    
    // Pass result to parent component
    if (onAnalysisComplete) {
      onAnalysisComplete(result);
    }
    
    // Provide voice feedback
    const feedbackMessage = `Based on combined analysis, I detected ${formatEmotion(combinedEmotion)} emotion with ${Math.round(combinedConfidence * 100)}% confidence. Your facial expression showed ${formatEmotion(dominantEmotion)} and your voice indicated ${formatEmotion(voiceEmotionResult)} with a ${voiceToneResult} tone. I recommend ${recommendation.medication} at ${recommendation.dosage}. ${recommendation.advice}`;
    
    speakText(feedbackMessage, { rate: 0.9, pitch: 1 });
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
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full p-4">
              <FaCamera className="text-2xl" />
              <span className="mx-2">+</span>
              <FaMicrophone className="text-2xl" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-center mb-4">Combined Analysis</h3>
          <p className="text-gray-600 text-center mb-6">
            This analysis will capture both your facial expressions and voice patterns simultaneously for 20 seconds to provide a comprehensive emotional assessment.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {loadingModels ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-600">Loading facial recognition models...</p>
            </div>
          ) : (
            <button
              onClick={startCombinedAnalysis}
              disabled={!modelsLoaded || loadingModels}
              className={`w-full py-3 px-6 rounded-lg text-white font-medium flex items-center justify-center ${
                !modelsLoaded || loadingModels
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              <FaPlay className="mr-2" />
              Start Combined Analysis
            </button>
          )}
        </div>
      )}
      
      {isAnalyzing && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Recording...</h3>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
              {countdown}s remaining
            </div>
          </div>
          
          <div className="relative mb-6">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover rounded-lg"
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
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Voice Input:</h4>
            <p className="text-gray-800">
              {transcript}
              <span className="text-gray-400 italic">{interimTranscript}</span>
            </p>
            
            {/* Voice emotion overlay */}
            {voiceEmotion && (
              <div className="mt-2 flex items-center">
                <span className="text-sm text-gray-600">Detected emotion:</span>
                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                  <span className="mr-1">{getEmotionEmoji(voiceEmotion)}</span>
                  <span>{formatEmotion(voiceEmotion)}</span>
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={endCombinedAnalysis}
            className="w-full py-3 px-6 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center"
          >
            <FaStopCircle className="mr-2" />
            Stop Analysis
          </button>
        </div>
      )}
      
      {analysisResult && (
        <div className="p-6">
          <h3 className="text-xl font-bold mb-6">Combined Analysis Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Facial Analysis Results */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <FaCamera className="mr-2" /> Facial Analysis
              </h4>
              <div className="bg-white rounded-lg p-3 mb-2 flex items-center">
                <span className="text-2xl mr-2">
                  {getEmotionEmoji(analysisResult.facialAnalysis.dominantEmotion)}
                </span>
                <div>
                  <p className="font-medium">
                    {formatEmotion(analysisResult.facialAnalysis.dominantEmotion)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Confidence: {Math.round(analysisResult.facialAnalysis.confidence * 100)}%
                  </p>
                </div>
              </div>
              
              {/* Facial Structure Visualization */}
              <div className="mt-2 bg-gray-100 p-2 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-1">Facial Structure</h5>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="bg-white px-2 py-1 rounded flex items-center">
                    <span className="w-3 h-3 bg-cyan-400 rounded-full mr-1"></span>
                    <span>Bounding Box</span>
                  </div>
                  <div className="bg-white px-2 py-1 rounded flex items-center">
                    <span className="w-3 h-3 bg-blue-400 rounded-full mr-1"></span>
                    <span>Landmarks</span>
                  </div>
                  <div className="bg-white px-2 py-1 rounded flex items-center">
                    <span className="w-3 h-3 bg-green-400 rounded-full mr-1"></span>
                    <span>Expressions</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Voice Analysis Results */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                <FaMicrophone className="mr-2" /> Voice Analysis
              </h4>
              <div className="bg-white rounded-lg p-3 mb-2 flex items-center">
                <span className="text-2xl mr-2">
                  {getEmotionEmoji(analysisResult.voiceAnalysis.emotion)}
                </span>
                <div>
                  <p className="font-medium">
                    {formatEmotion(analysisResult.voiceAnalysis.emotion)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Voice Tone: {formatEmotion(analysisResult.voiceAnalysis.voiceTone)}
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 mt-2">
                <p className="text-sm text-gray-700 italic">"{analysisResult.voiceAnalysis.transcript}"</p>
              </div>
            </div>
          </div>
          
          {/* Combined Results */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800 mb-2">Combined Assessment</h4>
            <div className="bg-white rounded-lg p-4 flex items-center">
              <span className="text-3xl mr-3">
                {getEmotionEmoji(analysisResult.combinedResult.emotion)}
              </span>
              <div>
                <p className="font-bold text-lg">
                  {formatEmotion(analysisResult.combinedResult.emotion)}
                </p>
                <p className="text-gray-600">
                  Overall Confidence: {Math.round(analysisResult.combinedResult.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>
          
          {/* Medication recommendation */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 shadow-md border-l-4 border-green-500 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xl font-bold text-green-800">Recommended Medication</h4>
              <button 
                onClick={() => {
                  // Create feedback message
                  const feedbackMessage = `Based on combined analysis, I detected ${formatEmotion(analysisResult.combinedResult.emotion)} emotion with ${Math.round(analysisResult.combinedResult.confidence * 100)}% confidence. Your facial expression showed ${formatEmotion(analysisResult.facialAnalysis.dominantEmotion)} and your voice indicated ${formatEmotion(analysisResult.voiceAnalysis.emotion)} with a ${analysisResult.voiceAnalysis.voiceTone} tone. I recommend ${analysisResult.recommendation.medication} at ${analysisResult.recommendation.dosage}. ${analysisResult.recommendation.advice}`;
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
          
          <div className="flex justify-center">
            <button
              onClick={() => {
                // Reset all state
                setAnalysisResult(null);
                setError(null);
                setTranscript('');
                setInterimTranscript('');
                setCurrentEmotion(null);
                setEmotionConfidence(0);
                setEmotionHistory([]);
                setVoiceEmotion(null);
                setVoiceTone(null);
                
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

export default CombinedAnalysis;
