# AI-based Emotion Recognition and Treatment Recommendation System

An advanced system for monitoring and treating psychotic and depressed patients in a hospital setting. This application integrates facial emotion recognition, voice sentiment analysis, and AI-based medicine recommendation.

## Features

### Doctor Mode
- Secure login panel
- Access to patient logs and records
- AI-generated medicine recommendations with manual override
- Prescription notes and clinical report management
- Patient status management

### Patient Mode
- Daily mood tracking via facial and voice analysis
- Emotional state questionnaires
- Medication reminders and feedback collection
- Simple and accessible interface

## Technology Stack
- Facial Emotion Analysis: OpenCV, DeepFace
- Voice Sentiment Analysis: SpeechRecognition, Librosa
- Chatbot: Rule-based system with voice integration
- Medicine Recommendation: Custom rule-based engine
- Database: SQLite
- GUI: PyQt5

## Installation
```
pip install -r requirements.txt
python main.py
```

## Project Structure
The project follows a modular architecture with separate components for doctor mode, patient mode, database management, and AI analysis engines.
