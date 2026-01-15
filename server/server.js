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
    if (sectionTitle.toLowerCase().includes('repeat exactly')) {
        evaluationPrompt = `you are a professional voice assessment tool. the user's task was to repeat the following sentence exactly: "${prompt.toLowerCase()}". based on the user's transcription "${userResponse.toLowerCase()}", provide a score from 1-10 for accuracy and give specific, actionable feedback on how they might improve their pronunciation and clarity. make the feedback concise and helpful.`;
    }
    else if (sectionTitle.toLowerCase().includes('fill')) { // Handling Fill & Speak
        // Check if user spoke the full sentence correctly with the filled word.
        // Since we don't pass the "answer" explicitly here unless we change valid schema, 
        // we can just ask AI to judge if it makes sense contextually given the prompt.
        // Or better, let's rely on the prompt which is "The sun rises in the _____.", answer: "East"
        // The prompt sent from FE is actually the full object or just prompt string?
        // FE sends `prompt` string.
        evaluationPrompt = `You are an English language assessment tool.
         The user was given a generic prompt or a fill-in-the-blank constraint: "${prompt}".
         The user said: "${userResponse}".
         
         Task:
         1. Determine if the user's spoken sentence correctly fills the blank (if applicable) and is grammatically correct.
         2. Check if the pronunciation and sentence structure are correct.
         3. Provide a score from 1-10.
         4. Provide feedback on correctness and pronunciation.`;
    }
    else {
        evaluationPrompt = `you are a professional voice assessment tool. the user was asked to complete the following task: "${prompt.toLowerCase()}". based on the user's transcription "${userResponse.toLowerCase()}", provide a score from 1-10 for fluency and pronunciation, and give specific, actionable feedback on how they might improve, as if you have just heard their response. make the feedback concise and helpful.`;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(evaluationPrompt);
        const feedback = result.response.text();

        return res.json({ feedback });
    } catch (error) {
        console.error('gemini api error:', error);
        return res.status(500).send('error processing the request.');
    }
});

// Helper function to handle text prompts (e.g., Jumbled, Q&A)
// Helper function to handle text prompts (e.g., Jumbled, Q&A)
app.post('/api/assess/text', async (req, res) => {
    const { prompt, userResponse, type, correctAnswer } = req.body;

    console.log(req.body);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        let evaluationPrompt = `You are a professional communication assessment tool. `;

        if (type === 'mcq' || type === 'mcq_passage') {
            evaluationPrompt += `The user answered an MCQ. 
             Question: "${prompt}"
             User Answer: "${userResponse}"
             Correct Answer: "${correctAnswer}"
             
             Task:
             1. Verify if the user's answer matches the correct answer.
             2. If correct, briefly explain WHY it is correct.
             3. If incorrect, explain WHY it is incorrect and explain the correct answer.
             4. Provide a score: 10/10 if correct, 0/10 if incorrect.`;
        } else if (type === 'jumbled') {
            evaluationPrompt += `The user had to rearrange words to form a sentence.
             Prompt: "${prompt}"
             User Answer: "${userResponse}"
             Expected/Correct Answer: "${correctAnswer}"
             
             Task:
             1. Check if the user's sentence is grammatically correct and matches the intended meaning.
             2. It doesn't have to be identical to the expected answer if it is still a valid, natural English sentence using the provided words.
             3. Rate grammar and syntax on 1-10.
             4. Provide correctional feedback.`;
        } else {
            // General text / fill in blank
            evaluationPrompt += `Evaluate the user's response: "${userResponse}" based on the prompt: "${prompt}". 
            If there is a correct answer provided: "${correctAnswer}", use it as a reference.
            Provide a score from 1-10 for correctness and relevance, and give detailed feedback.`;
        }

        const result = await model.generateContent(evaluationPrompt);
        console.log(result.response.text());
        const feedback = result.response.text();

        res.json({ feedback });
    } catch (error) {
        console.error('gemini api error:', error);
        res.status(500).send('error processing the request.');
    }
});

// A new endpoint to test the Gemini API connection
app.get('/api/test-gemini', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('write a very short, positive, and friendly message.');
        // FIX: Call the text() function to get the string content
        const text = result.response.text();
        console.log(text);
        res.json({ message: 'gemini api test successful!', response: text });
    } catch (error) {
        console.error('gemini api test error:', error);
        res.status(500).json({ message: 'gemini api test failed.', error: error.message });
    }
});

// Serve the main HTML file
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`);
});
