// Check for SpeechRecognition support
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const startBtn = document.getElementById('start-btn');
const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const textInput = document.getElementById('text-input');
const promptText = document.getElementById('prompt-text');
const sectionTitleEl = document.getElementById('section-title');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackText = document.getElementById('feedback-text');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('time-left');
const assessmentSection = document.getElementById('assessment-section');
const paletteSection = document.getElementById('palette-section');
const paletteContainer = document.getElementById('palette-container');
const loader = document.getElementById('loader');
const summarySection = document.getElementById('summary-section');
const summaryContent = document.getElementById('summary-content');

let recognition;
let currentSectionIndex = 0;
let currentQuestionIndex = 0;
let timerInterval;
const MAX_TIME = 60; // Max time per question in seconds
let assessmentResults = [];

const assessmentSections = [
    {
        title: "Reading Sentences",
        questions: [
            { type: 'voice', prompt: "Please read this paragraph aloud: The rapid advancement of artificial intelligence is transforming industries worldwide, creating new opportunities while also presenting unique challenges." },
            { type: 'voice', prompt: "Please read aloud: The rhythmic sound of the waves crashing on the shore was calming." },
            { type: 'voice', prompt: "Please read aloud: His ability to solve complex problems quickly impressed everyone." },
            { type: 'voice', prompt: "Please read aloud: The museum displayed ancient artifacts from different civilizations." },
            { type: 'voice', prompt: "Please read aloud: Despite the heavy rain, they continued their journey without hesitation." }
        ]
    },
    {
        title: "Speaking",
        questions: [
            { type: 'voice', prompt: "Describe a memorable trip you have taken." },
            { type: 'voice', prompt: "What are the advantages of reading books over watching movies?" },
            { type: 'voice', prompt: "If you could invent something new, what would it be?" },
            { type: 'voice', prompt: "How do you define success in life?" },
            { type: 'voice', prompt: "Tell a short story about an unexpected discovery you made on a trip." }
        ]
    },
    {
        title: "Grammar",
        questions: [
            { type: 'text', prompt: "Unscramble the following words to form a grammatically correct sentence: 'intelligence artificial the of challenges presents transformation'." },
            { type: 'text', prompt: "Fill in the blank with the correct verb form: She ____ (go) to school every day." },
            { type: 'text', prompt: "Fill in the blank with the correct tense: They ____ (play) football when it started raining." },
            { type: 'text', prompt: "Fill in the blank with the correct preposition: She is interested ____ learning new languages." },
            { type: 'text', prompt: "Fill in the blank with the correct tense: By next summer, we ____ (move) to a new house." }
        ]
    },
    {
        title: "Repeat Exactly What You Hear",
        questions: [
            { type: 'voice', prompt: "The quick brown fox jumps over the lazy dog." },
            { type: 'voice', prompt: "She sells seashells by the seashore." },
            { type: 'voice', prompt: "How can I help you today?" },
            { type: 'voice', prompt: "We will meet at the library tomorrow morning." },
            { type: 'voice', prompt: "A journey of a thousand miles begins with a single step." }
        ]
    }
];

startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    paletteSection.style.display = 'flex';
    // Initialize assessmentResults with empty objects for each question
    assessmentSections.forEach(section => {
        section.questions.forEach(q => assessmentResults.push({}));
    });
    startQuestion();
    renderQuestionPalette();
});

nextBtn.addEventListener('click', () => {
    const currentSection = assessmentSections[currentSectionIndex];
    if (currentQuestionIndex < currentSection.questions.length - 1) {
        currentQuestionIndex++;
    } else if (currentSectionIndex < assessmentSections.length - 1) {
        currentSectionIndex++;
        currentQuestionIndex = 0;
    } else {
        endAssessment();
        return;
    }
    startQuestion();
});

function startQuestion() {
    clearInterval(timerInterval);
    const question = assessmentSections[currentSectionIndex].questions[currentQuestionIndex];
    const sectionTitle = assessmentSections[currentSectionIndex].title;
    
    // Set section title
    sectionTitleEl.textContent = `${sectionTitle} - Question ${currentQuestionIndex + 1}`;
    
    feedbackContainer.style.display = 'none';
    feedbackText.textContent = '';
    
    // Hide all action buttons initially
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    textInput.style.display = 'none';
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    promptText.style.display = 'block';

    if (question.type === 'voice') {
        recordBtn.style.display = 'inline-block';
        // Set up and start speech recognition
        if (!('SpeechRecognition' in window)) {
            promptText.textContent = "Your browser does not support Speech Recognition. Please try a modern browser like Chrome or Firefox.";
            return;
        }
        recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        
        // Handle the result
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Transcription:', transcript);
            sendVoiceTranscriptionForAssessment(transcript, question.prompt, sectionTitle);
            stopBtn.style.display = 'none';
        };

        // Handle the end of recognition
        recognition.onend = () => {
            stopBtn.style.display = 'none';
            // Only show loader if a result hasn't been processed yet
            if (loader.style.display !== 'block') {
                showFeedback('Recording stopped. Please wait for feedback...');
                hideLoader();
                nextBtn.style.display = 'inline-block';
            }
        };

        // Handle errors
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showFeedback(`An error occurred with speech recognition: ${event.error}.`);
            stopBtn.style.display = 'none';
        };

        // Logic for "Repeat Exactly What You Hear"
        if (sectionTitle.includes('Repeat Exactly What You Hear')) {
            promptText.textContent = 'Listen carefully...';
            promptText.style.display = 'block';
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(question.prompt);
                window.speechSynthesis.speak(utterance);
                utterance.onend = () => {
                    promptText.textContent = 'Now, repeat what you heard.';
                };
            }, 1000); // Give a moment before speaking
        } else {
            promptText.textContent = question.prompt;
        }
    } else {
        promptText.textContent = question.prompt;
        textInput.style.display = 'inline-block';
        submitBtn.style.display = 'inline-block';
        textInput.value = '';
    }
    
    startTimer(MAX_TIME);
    renderQuestionPalette();
}

function startTimer(duration) {
    let timeLeft = duration;
    timerEl.style.display = 'block';
    timeLeftEl.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeUp();
        }
    }, 1000);
}

function handleTimeUp() {
    const question = assessmentSections[currentSectionIndex].questions[currentQuestionIndex];
    if (question.type === 'voice' && recognition) {
        recognition.stop();
    } else if (question.type === 'text') {
        submitBtn.click();
    }
}

recordBtn.addEventListener('click', () => {
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    
    if (recognition) {
        recognition.start();
        console.log('Speech recognition started...');
    }
});

stopBtn.addEventListener('click', () => {
    if (recognition) {
        recognition.stop();
    }
});

submitBtn.addEventListener('click', () => {
    const userResponse = textInput.value;
    if (userResponse.trim() === '') {
        // Use a custom message box instead of alert()
        alert('Please provide a response.');
        return;
    }
    sendTextForAssessment(userResponse, assessmentSections[currentSectionIndex].questions[currentQuestionIndex].prompt);
});

async function sendVoiceTranscriptionForAssessment(userResponse, prompt, sectionTitle) {
    clearInterval(timerInterval);
    showLoader();
    try {
        const response = await fetch('/api/assess/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, userResponse, sectionTitle }),
        });
        const data = await response.json();
        saveResult(prompt, userResponse, data.feedback);
        showFeedback(data.feedback);
    } catch (error) {
        console.error('Error sending transcription to backend:', error);
        showFeedback('An error occurred. Please try again.');
    } finally {
        hideLoader();
    }
}

async function sendTextForAssessment(userResponse, prompt) {
    clearInterval(timerInterval);
    showLoader();
    try {
        const response = await fetch('/api/assess/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, userResponse }),
        });
        const data = await response.json();
        saveResult(prompt, userResponse, data.feedback);
        showFeedback(data.feedback);
    } catch (error) {
        console.error('Error sending text to backend:', error);
        showFeedback('An error occurred. Please try again.');
    } finally {
        hideLoader();
    }
}

function saveResult(prompt, userResponse, feedback) {
    const globalIndex = assessmentSections.slice(0, currentSectionIndex).reduce((acc, sec) => acc + sec.questions.length, 0) + currentQuestionIndex;
    assessmentResults[globalIndex] = {
        prompt: prompt,
        userResponse: userResponse,
        feedback: feedback,
        completed: true
    };
}

function showFeedback(text) {
    feedbackContainer.style.display = 'block';
    feedbackText.textContent = text;
    nextBtn.style.display = 'inline-block';
}

function showLoader() {
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    submitBtn.style.display = 'none';
    loader.style.display = 'block';
}

function hideLoader() {
    loader.style.display = 'none';
}

function renderQuestionPalette() {
    paletteContainer.innerHTML = '';
    let questionCounter = 0;
    assessmentSections.forEach((section, sectionIndex) => {
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = section.title;
        paletteContainer.appendChild(sectionTitle);

        const sectionPalette = document.createElement('div');
        sectionPalette.className = 'section-palette';

        section.questions.forEach((q, questionIndex) => {
            const globalIndex = questionCounter;
            const btn = document.createElement('button');
            btn.textContent = `Q${questionIndex + 1}`;
            btn.classList.add('palette-btn');

            if (sectionIndex === currentSectionIndex && questionIndex === currentQuestionIndex) {
                btn.classList.add('current');
            } else if (assessmentResults[globalIndex].completed) {
                btn.classList.add('completed');
            }

            btn.addEventListener('click', () => {
                currentSectionIndex = sectionIndex;
                currentQuestionIndex = questionIndex;
                startQuestion();
            });

            sectionPalette.appendChild(btn);
            questionCounter++;
        });
        paletteContainer.appendChild(sectionPalette);
    });
}

function endAssessment() {
    assessmentSection.style.display = 'none';
    paletteSection.style.display = 'none';
    summarySection.style.display = 'block';
    displaySummary();
}

function displaySummary() {
    summaryContent.innerHTML = '';
    let questionCounter = 0;
    assessmentSections.forEach((section, sectionIndex) => {
        const sectionSummaryTitle = document.createElement('h2');
        sectionSummaryTitle.textContent = section.title;
        summaryContent.appendChild(sectionSummaryTitle);
        
        section.questions.forEach((question, questionIndex) => {
            const result = assessmentResults[questionCounter];
            const resultDiv = document.createElement('div');
            resultDiv.className = 'summary-item';
            resultDiv.innerHTML = `
                <h3>Question ${questionIndex + 1}</h3>
                <p><strong>Question:</strong> ${result.prompt}</p>
                <p><strong>Your Answer:</strong> ${result.userResponse}</p>
                <p><strong>AI Feedback:</strong></p>
                <pre>${result.feedback}</pre>
                <hr>
            `;
            summaryContent.appendChild(resultDiv);
            questionCounter++;
        });
    });
}