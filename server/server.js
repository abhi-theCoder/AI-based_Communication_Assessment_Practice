const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const fs = require('fs').promises;

// Configure environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Set up the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to handle voice prompts (e.g., Reading, Story Telling)
// The userResponse is now a simple text string from the frontend transcription.
app.post('/api/assess/voice', async (req, res) => {
    const { prompt, sectionTitle, userResponse } = req.body;

    // Determine the prompt for the AI based on the assessment section
    let evaluationPrompt;
    if (sectionTitle.includes('Repeat Exactly What You Hear')) {
        evaluationPrompt = `You are a professional voice assessment tool. The user's task was to repeat the following sentence exactly: "${prompt}". Based on the user's transcription "${userResponse}", provide a score from 1-10 for accuracy and give specific, actionable feedback on how they might improve their pronunciation and clarity. Make the feedback concise and helpful.`;
    } else {
        evaluationPrompt = `You are a professional voice assessment tool. The user was asked to complete the following task: "${prompt}". Based on the user's transcription "${userResponse}", provide a score from 1-10 for fluency and pronunciation, and give specific, actionable feedback on how they might improve, as if you have just heard their response. Make the feedback concise and helpful.`;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(evaluationPrompt);
        const feedback = result.response.text();
        
        return res.json({ feedback });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).send('Error processing the request.');
    }
});

// Helper function to handle text prompts (e.g., Jumbled, Q&A)
app.post('/api/assess/text', async (req, res) => {
    const { prompt, userResponse } = req.body;

    console.log(req.body);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const evaluationPrompt = `You are a professional communication assessment tool. Evaluate the user's response: "${userResponse}" based on the prompt: "${prompt}". Provide a score from 1-10 for correctness and relevance, and give detailed feedback.`;

        const result = await model.generateContent(evaluationPrompt);
        console.log(result.text);
        const feedback = result.response.text();

        res.json({ feedback });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).send('Error processing the request.');
    }
});

// A new endpoint to test the Gemini API connection
app.get('/api/test-gemini', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Write a very short, positive, and friendly message.');
        // FIX: Call the text() function to get the string content
        const text = result.response.text(); 
        console.log(text);
        res.json({ message: 'Gemini API test successful!', response: text });
    } catch (error) {
        console.error('Gemini API Test Error:', error);
        res.status(500).json({ message: 'Gemini API test failed.', error: error.message });
    }
});

// Serve the main HTML file
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
