// Check for SpeechRecognition support
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let timerInterval;
let recognition;
let currentSectionIndex = 0;
let currentQuestionIndex = 0;
let assessmentResults = [];
let availableVoices = [];

// DOM Elements
const assessmentSection = document.getElementById('assessment-section');
const paletteSection = document.getElementById('palette-section');
const summarySection = document.getElementById('summary-section');
const sectionTitleEl = document.getElementById('section-title');
const promptText = document.getElementById('prompt-text');
const timerEl = document.getElementById('timer');
const timeLeftEl = document.getElementById('time-left');
const startBtn = document.getElementById('start-btn');
const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const textInput = document.getElementById('text-input');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackText = document.getElementById('feedback-text');
const optionsContainer = document.getElementById('options-container');
const jumbledContainer = document.getElementById('jumbled-container');
const paletteContainer = document.getElementById('palette-container');
const summaryContent = document.getElementById('summary-content');
const loader = document.getElementById('loader');

// Voice Settings Elements
const voiceSelect = document.getElementById('voice-select');
const voiceSpeed = document.getElementById('voice-speed');
const speedVal = document.getElementById('speed-val');
const stopSpeechBtn = document.getElementById('stop-speech-btn');

// Populate voices
function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
    if (voiceSelect) {
        voiceSelect.innerHTML = availableVoices
            .map((voice, index) => `<option value="${index}">${voice.name} (${voice.lang})</option>`)
            .join('');
    }
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

if (voiceSpeed) {
    voiceSpeed.oninput = () => {
        if (speedVal) speedVal.textContent = voiceSpeed.value;
    };
}

if (stopSpeechBtn) {
    stopSpeechBtn.onclick = () => window.speechSynthesis.cancel();
}

function speak(text, callback) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoiceIndex = voiceSelect.value;
    if (availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
    }
    utterance.rate = parseFloat(voiceSpeed.value);
    if (callback) utterance.onend = callback;
    window.speechSynthesis.speak(utterance);
}

function speakStory(content, playBtn, statusEl) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    const selectedVoiceIndex = voiceSelect.value;
    if (availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
    }
    utterance.rate = parseFloat(voiceSpeed.value);

    utterance.onstart = () => { if (statusEl) statusEl.textContent = "Playing..."; playBtn.disabled = true; };
    utterance.onend = () => { if (statusEl) statusEl.textContent = "Finished."; playBtn.disabled = false; };
    window.speechSynthesis.speak(utterance);
}

const MAX_TIME = 60; // Max time per question in seconds

// --- DATA STRUCTURE ---
const assessmentSections = [
    {
        title: "Listening Comprehension",
        questions: [
            {
                type: 'story_intro',
                mode: 'listening',
                title: "Story 1: The Curious Inventor",
                content: "In a world of clockwork and steam, there lived an inventor named Silas. Silas wasn't like other inventors; he didn't care for gold or fame. He wanted to build a machine that could capture the sound of silence. People laughed, saying silence was nothing but the absence of noise. But Silas knew better. He spent years in his attic, tinkering with glass jars and silver wires. One rainy Tuesday, he finally succeeded. When he opened his machine, the room didn't become quiet; it became still. He had invented a way to pause the chaos of the city, allowing everyone a moment of peace."
            },
            { type: 'mcq', prompt: "What was the name of the inventor?", options: ["Silas", "Samuel", "Stephen", "Simon"], correctAnswer: "Silas" },
            { type: 'mcq', prompt: "What did Silas want to capture?", options: ["The sound of rain", "The sound of silence", "The sound of gears", "The sound of laughter"], correctAnswer: "The sound of silence" },
            { type: 'mcq', prompt: "Where did Silas work?", options: ["In a basement", "In a factory", "In an attic", "In a park"], correctAnswer: "In an attic" },
            { type: 'mcq', prompt: "What happened when the machine was used?", options: ["Everything became loud", "Everything became still", "Everything turned to gold", "Nothing happened"], correctAnswer: "Everything became still" },

            {
                type: 'story_intro',
                mode: 'listening',
                title: "Story 2: The Forest Guide",
                content: "Maya had lived on the edge of the Whispering Woods her entire life. She was the only one who could navigate the shifting paths that changed with the moonlight. Travelers from far away would pay her in stories to lead them to the Ancient Oak, a tree said to grant one wish. One traveler, a weary queen, asked Maya why she never made a wish herself. Maya smiled and replied, 'The forest gives me everything I need; I have no more requests for the trees.' The queen realized that Maya was the wealthiest person she had ever met."
            },
            { type: 'mcq', prompt: "Where did Maya live?", options: ["In a desert", "On the edge of Whispering Woods", "In a castle", "By the sea"], correctAnswer: "On the edge of Whispering Woods" },
            { type: 'mcq', prompt: "What changed the forest paths?", options: ["The wind", "The moonlight", "The rain", "Maya's footsteps"], correctAnswer: "The moonlight" },
            { type: 'mcq', prompt: "What was at the center of the woods?", options: ["A hidden cave", "The Ancient Oak", "A lost city", "A magic fountain"], correctAnswer: "The Ancient Oak" },
            { type: 'mcq', prompt: "How did travelers pay Maya?", options: ["In gold shells", "In stories", "In food", "In diamonds"], correctAnswer: "In stories" }
        ]
    },
    {
        title: "Reading Comprehension",
        questions: [
            {
                type: 'story_intro',
                mode: 'reading',
                title: "Passage 1: The Evolution of Communication",
                content: "Communication has evolved from simple gestures and sounds to complex digital networks that span the globe. In ancient times, messengers would travel on foot or horseback for days to deliver a single scroll. The invention of the printing press in the 15th century revolutionized the spread of information, making books accessible to the masses. By the 19th century, the telegraph allowed messages to travel across wires nearly instantaneously. Today, the internet and smartphones have made global communication a matter of seconds. However, as we move faster, the quality of our deep connections is often questioned. While we are more 'connected' than ever, the art of listening and meaningful conversation remains a vital human skill that technology cannot replace."
            },
            { type: 'mcq', prompt: "What was a primary method of message delivery in ancient times?", options: ["Telegraph", "Messengers on horseback", "Email", "Printing press"], correctAnswer: "Messengers on horseback" },
            { type: 'mcq', prompt: "When was the printing press invented?", options: ["12th century", "15th century", "18th century", "20th century"], correctAnswer: "15th century" },
            { type: 'mcq', prompt: "What is the author's concern about modern communication?", options: ["It is too expensive", "Technology is too slow", "Quality of deep connections", "Internet is unreliable"], correctAnswer: "Quality of deep connections" },

            {
                type: 'story_intro',
                mode: 'reading',
                title: "Passage 2: The Great Barrier Reef - A Fragile Wonder",
                content: "Stretching over 2,300 kilometers along the coast of Queensland, Australia, the Great Barrier Reef is the world's largest coral reef system. It is so vast that it can be seen from outer space and is home to thousands of species of marine life, including colorful corals, sharks, turtles, and over 1,500 species of fish. This underwater ecosystem provides a vital habitat and protects coastal areas from the impact of storms and erosion. \n\nHowever, this natural wonder is facing unprecedented threats. Rising ocean temperatures caused by climate change lead to coral bleaching, a process where corals expel the colorful algae living in their tissues and turn white. If the water stays too warm for too long, the corals die. Additionally, pollution from land runoff and overfishing further stress the reef's delicate balance. International efforts are underway to reduce carbon emissions and implement stricter conservation laws, but the window of time to save this UNESCO World Heritage site is narrowing. Protecting the reef is not just about saving a tourist destination; it is about preserving a cornerstone of global biodiversity."
            },
            { type: 'mcq', prompt: "Where is the Great Barrier Reef located?", options: ["Caribbean Sea", "Off the coast of Queensland", "Near Hawaii", "Indian Ocean"], correctAnswer: "Off the coast of Queensland" },
            { type: 'mcq', prompt: "What causes coral bleaching?", options: ["Overfishing", "Rising ocean temperatures", "Storms", "Too much salt"], correctAnswer: "Rising ocean temperatures" },
            { type: 'mcq', prompt: "Why is the reef important for coastal areas?", options: ["It attracts tourists", "It provides minerals", "It protects from erosion/storms", "It creates clouds"], correctAnswer: "It protects from erosion/storms" },

            {
                type: 'story_intro',
                mode: 'reading',
                title: "Passage 3: The Architecture of the Future",
                content: "As the world's population continues to urbanize, architects are reimagining the way we live and interact with our environment. The traditional 'concrete jungle' is being replaced by 'living buildings' that integrate nature into their design. These structures feature vertical forests, where trees and shrubs grow on balconies, providing insulation and filtering urban pollutants. Furthermore, advancements in 3D printing technology allow for the creation of complex, organic shapes that were previously impossible or too expensive to build. \n\nBeyond aesthetics, sustainability is the primary driver of modern architecture. New skyscrapers are being designed to be energy-neutral, utilizing solar windows, wind turbines at the top, and geothermal heating systems below ground. Some even incorporate waste-to-energy systems, turning the building's own trash into electricity. The goal is to create cities that function like a forest - circular, resilient, and self-sustaining. The challenge, however, lies in retrofitting older cities. While creating a new 'smart city' from scratch is possible, adapting the historic cores of London, Paris, or New York requires a delicate balance between preserving the past and building a green future. The buildings of tomorrow will not just be shelters; they will be active participants in the planetary ecosystem."
            },
            { type: 'mcq', prompt: "What are 'living buildings' characterized by?", options: ["Only used for housing", "Made entirely of glass", "Integrating nature/vertical forests", "Located underground"], correctAnswer: "Integrating nature/vertical forests" },
            { type: 'mcq', prompt: "What technology allows for complex organic shapes?", options: ["Laser cutting", "3D printing", "Manual carving", "Traditional bricklaying"], correctAnswer: "3D printing" },
            { type: 'mcq', prompt: "What is the primary driver of modern architecture?", options: ["Speed", "Cost reduction", "Sustainability", "Height"], correctAnswer: "Sustainability" },
            { type: 'mcq', prompt: "What is one mentioned challenge for the future?", options: ["Lack of architects", "Retrofitting older cities", "High cost of glass", "Finding builders"], correctAnswer: "Retrofitting older cities" }
        ]
    },
    {
        title: "Situational Conversation",
        context: "Situation: You are visiting Mumbai for the first time. Your name is Sara. You are speaking to a hotel receptionist.",
        questions: [
            { type: 'voice', prompt: "Receptionist: 'Hi, welcome to the Taj Hotel. What is your name?'", context: "You are Sara." },
            { type: 'voice', prompt: "Receptionist: 'Is this your first time in Mumbai?'", context: "Yes, it is." },
            { type: 'voice', prompt: "Receptionist: 'How did you travel here?'", context: "By flight/train..." },
            { type: 'voice', prompt: "Receptionist: 'How long will you be staying with us?'", context: "Answer with a duration." },
            { type: 'voice', prompt: "Receptionist: 'Here is your key. Enjoy your stay!'", context: "Say thank you." }
        ]
    },
    {
        title: "Read Sentences Aloud",
        questions: [
            { type: 'voice', prompt: "Please read: The rapid advancement of artificial intelligence is transforming industries worldwide." },
            { type: 'voice', prompt: "Please read: The rhythmic sound of the waves crashing on the shore was calming." },
            { type: 'voice', prompt: "Please read: His ability to solve complex problems quickly impressed everyone." },
            { type: 'voice', prompt: "Please read: The museum displayed ancient artifacts from different civilizations." },
            { type: 'voice', prompt: "Please read: Despite the heavy rain, they continued their journey without hesitation." },
            { type: 'voice', prompt: "Please read: Good communication is the bridge between confusion and clarity." },
            { type: 'voice', prompt: "Please read: She decided to learn a new language to travel the world." },
            { type: 'voice', prompt: "Please read: Teamwork is essential for achieving great results in any project." },
            { type: 'voice', prompt: "Please read: Innovations in technology are shaping the future of education." },
            { type: 'voice', prompt: "Please read: Maintaining a healthy work-life balance is important for well-being." },
            { type: 'voice', prompt: "Please read: Creativity allows us to see the world from different perspectives." }
        ]
    },
    {
        title: "Listen and Repeat",
        questions: [
            { type: 'voice', prompt: "The quick brown fox jumps over the lazy dog." },
            { type: 'voice', prompt: "She sells seashells by the seashore." },
            { type: 'voice', prompt: "How can I help you today?" },
            { type: 'voice', prompt: "We will meet at the library tomorrow morning." },
            { type: 'voice', prompt: "A journey of a thousand miles begins with a single step." },
            { type: 'voice', prompt: "Please turn off the lights when you leave the room." },
            { type: 'voice', prompt: "I would like to order a cup of coffee, please." },
            { type: 'voice', prompt: "Can you tell me the way to the nearest station?" },
            { type: 'voice', prompt: "It is important to drink plenty of water every day." },
            { type: 'voice', prompt: "Practice makes progress, not perfection." }
        ]
    },
    {
        title: "Fill & Speak",
        instruction: "Fill in the blank mentally, then speak the COMPLETE sentence.",
        questions: [
            { type: 'fill_speak', prompt: "The sun rises in the _____.", answer: "East" },
            { type: 'fill_speak', prompt: "Please _____ the door.", answer: "close" },
            { type: 'fill_speak', prompt: "I am _____ to music.", answer: "listening" },
            { type: 'fill_speak', prompt: "She _____ an apple every day.", answer: "eats" },
            { type: 'fill_speak', prompt: "They are _____ football.", answer: "playing" },
            { type: 'fill_speak', prompt: "He is _____ than his brother.", answer: "taller" },
            { type: 'fill_speak', prompt: "I have _____ finished my homework.", answer: "already" },
            { type: 'fill_speak', prompt: "_____ you like some tea?", answer: "Would" },
            { type: 'fill_speak', prompt: "The cat is sleeping _____ the table.", answer: "under" },
            { type: 'fill_speak', prompt: "We _____ going to the park.", answer: "are" }
        ]
    },
    {
        title: "Grammar & Vocabulary (Extras)",
        questions: [
            { type: 'mcq', prompt: "Choose the correct sentence:", options: ["She don’t like working late.", "She doesn’t like working late."], correctAnswer: "She doesn’t like working late." },
            { type: 'mcq', prompt: "Identify the error in the sentence: “He has completed the task yesterday.”", options: ["He", "has completed", "the task", "yesterday"], correctAnswer: "has completed" },
            { type: 'mcq', prompt: "Choose the synonym of “Efficient”:", options: ["Slow", "Productive", "Careless", "Weak"], correctAnswer: "Productive" },
            { type: 'mcq', prompt: "Choose the antonym of “Accept”:", options: ["Agree", "Take", "Reject", "Allow"], correctAnswer: "Reject" }
        ]
    }
];

// --- EVENT LISTENERS ---

startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    paletteSection.style.display = 'flex';
    assessmentResults = [];
    assessmentSections.forEach(section => {
        section.questions.forEach(() => assessmentResults.push({}));
    });
    startQuestion();
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

// --- CORE FUNCTIONS ---

function startQuestion() {
    clearInterval(timerInterval);
    const section = assessmentSections[currentSectionIndex];
    const question = section.questions[currentQuestionIndex];
    const sectionTitle = section.title;

    sectionTitleEl.textContent = `${sectionTitle} - Question ${currentQuestionIndex + 1}`;
    resetUI();

    // --- REFINED LISTEN AND REPEAT LOGIC ---
    if (sectionTitle.toLowerCase().includes('listen and repeat')) {
        promptText.style.display = 'block';
        promptText.innerHTML = `
            <div class="audio-only-instruction">
                <p>🎧 Listen carefully to the sentence...</p>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
                    <button id="replay-btn" class="btn" style="background:#4A5568; color:white; padding:8px 16px; border:none; border-radius:4px; cursor:pointer;">Replay Audio</button>
                    <button id="stop-inner-btn" class="btn" style="background:#e53e3e; color:white; padding:8px 16px; border:none; border-radius:4px; cursor:pointer;">Stop</button>
                </div>
            </div>
        `;

        setTimeout(() => {
            speak(question.prompt, () => {
                recordBtn.style.display = 'inline-block';
            });
            const replayBtn = document.getElementById('replay-btn');
            if (replayBtn) {
                replayBtn.onclick = () => speak(question.prompt);
            }
            const stopInnerBtn = document.getElementById('stop-inner-btn');
            if (stopInnerBtn) {
                stopInnerBtn.onclick = () => window.speechSynthesis.cancel();
            }
        }, 500);

        startTimer(MAX_TIME);
        renderQuestionPalette();
        return;
    }

    let displayPrompt = question.prompt;

    if (question.type === 'mcq_passage') {
        displayPrompt = `<div style="margin-bottom:1rem; font-style:italic; color:#555;">${question.passage}</div><strong>${question.prompt}</strong>`;
    }

    if (question.context) {
        displayPrompt = `<div style="margin-bottom:0.5rem; font-weight:bold; color:#2d3748;">Context: ${question.context}</div>${question.prompt}`;
    }

    if (question.type === 'fill_speak') {
        displayPrompt = `<strong>${section.instruction || ''}</strong><br><br>${question.prompt}`;
    }

    if (question.type === 'story_intro') {
        sectionTitleEl.textContent = question.title || section.title;
        promptText.style.display = 'block';

        let contentHtml = '';
        if (question.mode === 'listening') {
            contentHtml = `
                <div style="text-align:center; padding: 2rem;">
                    <p style="margin-bottom: 1rem; font-size: 1.1rem;">Listen to the story carefully. Questions will follow.</p>
                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                        <button id="play-story-btn" class="btn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                            🔊 Play Audio
                        </button>
                        <button id="stop-story-btn" class="btn" style="background-color: #e53e3e; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                            🛑 Stop
                        </button>
                    </div>
                    <p id="audio-status" style="margin-top:1rem; font-style:italic; color:#666;"></p>
                </div>
            `;
        } else if (question.mode === 'reading') {
            contentHtml = `
                <div style="padding: 1.5rem; background: rgba(249, 249, 249, 0.9); border-left: 4px solid #3182ce; border-radius: 8px; max-height: 400px; overflow-y: auto; text-align: left;">
                    <h3 style="margin-top:0;">${question.title}</h3>
                    <p style="white-space: pre-wrap; line-height: 1.6;">${question.content}</p>
                </div>
                <p style="text-align:center; margin-top:1rem; font-style:italic;">Read the passage above carefully. Click 'Next' to start questions.</p>
            `;
        }

        promptText.innerHTML = contentHtml;
        nextBtn.style.display = 'inline-block';

        if (question.mode === 'listening') {
            setTimeout(() => {
                const playBtn = document.getElementById('play-story-btn');
                const stopBtnInternal = document.getElementById('stop-story-btn');
                const statusEl = document.getElementById('audio-status');
                if (playBtn) {
                    playBtn.onclick = () => speakStory(question.content, playBtn, statusEl);
                }
                if (stopBtnInternal) {
                    stopBtnInternal.onclick = () => {
                        window.speechSynthesis.cancel();
                        if (statusEl) statusEl.textContent = "Stopped.";
                        if (playBtn) playBtn.disabled = false;
                    };
                }
            }, 100);
        }
        renderQuestionPalette(); // FIX: Ensure palette is rendered
        return;
    }

    if (question.type === 'voice' || question.type === 'fill_speak') {
        promptText.innerHTML = displayPrompt;
        promptText.style.display = 'block';
        recordBtn.style.display = 'inline-block';
        setupVoiceRecognition(question, sectionTitle);
    }
    else if (question.type === 'text') {
        promptText.innerHTML = displayPrompt;
        promptText.style.display = 'block';
        textInput.style.display = 'inline-block';
        submitBtn.style.display = 'inline-block';
        textInput.value = '';
        textInput.focus();
    }
    else if (question.type === 'mcq' || question.type === 'mcq_passage') {
        promptText.innerHTML = displayPrompt;
        promptText.style.display = 'block';
        optionsContainer.style.display = 'flex';
        renderMCQOptions(question.options);
        submitBtn.style.display = 'inline-block';
    }
    else if (question.type === 'jumbled') {
        promptText.innerHTML = displayPrompt;
        promptText.style.display = 'block';
        jumbledContainer.style.display = 'flex';
        renderJumbledWords(question.parts);
        submitBtn.style.display = 'inline-block';
    }

    startTimer(MAX_TIME);
    renderQuestionPalette();
}

function resetUI() {
    feedbackContainer.style.display = 'none';
    feedbackText.textContent = '';
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    textInput.style.display = 'none';
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    promptText.style.display = 'none';
    optionsContainer.style.display = 'none';
    jumbledContainer.style.display = 'none';
    optionsContainer.innerHTML = '';
    jumbledContainer.innerHTML = '';
}

let selectedMCQOption = null;
function renderMCQOptions(options) {
    selectedMCQOption = null;
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.className = 'option-btn';
        btn.onclick = () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedMCQOption = opt;
        };
        optionsContainer.appendChild(btn);
    });
}

let jumbledOrder = [];
function renderJumbledWords(parts) {
    jumbledOrder = [];
    parts.forEach(word => {
        const span = document.createElement('div');
        span.textContent = word;
        span.className = 'jumbled-word';
        span.onclick = () => {
            if (span.classList.contains('selected')) {
                span.classList.remove('selected');
                jumbledOrder = jumbledOrder.filter(w => w !== word);
            } else {
                span.classList.add('selected');
                jumbledOrder.push(word);
            }
        };
        jumbledContainer.appendChild(span);
    });
}

function setupVoiceRecognition(question, sectionTitle) {
    if (!('SpeechRecognition' in window)) {
        promptText.textContent = "Your browser does not support Speech Recognition.";
        return;
    }
    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.continuous = false;
    }

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendVoiceTranscriptionForAssessment(transcript, question.prompt, sectionTitle);
        stopBtn.style.display = 'none';
    };

    recognition.onend = () => {
        stopBtn.style.display = 'none';
        if (loader.style.display !== 'block' && feedbackContainer.style.display === 'none') {
            recordBtn.style.display = 'inline-block';
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopBtn.style.display = 'none';
        recordBtn.style.display = 'inline-block';
    };
}

submitBtn.addEventListener('click', () => {
    const question = assessmentSections[currentSectionIndex].questions[currentQuestionIndex];
    let userResponse = '';
    const correctAnswer = question.correctAnswer || '';

    if (question.type === 'text') {
        userResponse = textInput.value.trim();
        if (!userResponse) return alert('Please type an answer.');
    }
    else if (question.type.includes('mcq')) {
        if (!selectedMCQOption) return alert('Please select an option.');
        userResponse = selectedMCQOption;
    }
    else if (question.type === 'jumbled') {
        if (jumbledOrder.length === 0) return alert('Please select words.');
        userResponse = jumbledOrder.join(' ');
    }

    sendTextForAssessment(userResponse, question.prompt, question.type, correctAnswer);
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
        console.error('Error:', error);
        showFeedback('An error occurred.');
    } finally {
        hideLoader();
    }
}

async function sendTextForAssessment(userResponse, prompt, type, correctAnswer) {
    clearInterval(timerInterval);
    showLoader();
    try {
        const response = await fetch('/api/assess/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, userResponse, type, correctAnswer }),
        });
        const data = await response.json();
        saveResult(prompt, userResponse, data.feedback);
        showFeedback(data.feedback);
    } catch (error) {
        console.error('Error:', error);
        showFeedback('An error occurred.');
    } finally {
        hideLoader();
    }
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
    if (question.type === 'voice' && recognition) recognition.stop();
    else if (question.type === 'text' && textInput.value) submitBtn.click();
    else {
        saveResult(question.prompt, "[No Answer]", "Time expired.");
        showFeedback("Time expired. Moving to next question...");
    }
}

function saveResult(prompt, userResponse, feedback) {
    let pastQuestions = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
        pastQuestions += assessmentSections[i].questions.length;
    }
    const globalIndex = pastQuestions + currentQuestionIndex;
    assessmentResults[globalIndex] = { prompt, userResponse, feedback, completed: true };
}

function showFeedback(text) {
    feedbackContainer.style.display = 'block';
    if (typeof marked !== 'undefined') {
        feedbackText.innerHTML = marked.parse(text);
    } else {
        feedbackText.textContent = text;
    }
    nextBtn.style.display = 'inline-block';
    submitBtn.style.display = 'none';
}

function showLoader() {
    resetUI();
    loader.style.display = 'block';
}

function hideLoader() { loader.style.display = 'none'; }

function renderQuestionPalette() {
    paletteContainer.innerHTML = '';
    let questionCounter = 0;
    assessmentSections.forEach((section, sectionIndex) => {
        const title = document.createElement('h3');
        title.textContent = section.title;
        title.style.fontSize = '0.9rem';
        title.style.margin = '1rem 0 0.5rem 0';
        paletteContainer.appendChild(title);

        const sectionPalette = document.createElement('div');
        sectionPalette.className = 'section-palette';

        section.questions.forEach((q, questionIndex) => {
            const globalIndex = questionCounter;
            const btn = document.createElement('button');
            btn.textContent = `Q${questionIndex + 1}`;
            btn.classList.add('palette-btn');

            if (sectionIndex === currentSectionIndex && questionIndex === currentQuestionIndex) {
                btn.classList.add('current');
            } else if (assessmentResults[globalIndex] && assessmentResults[globalIndex].completed) {
                btn.classList.add('completed');
            }

            btn.onclick = () => {
                currentSectionIndex = sectionIndex;
                currentQuestionIndex = questionIndex;
                startQuestion();
            };

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
    assessmentSections.forEach((section) => {
        section.questions.forEach((question, questionIndex) => {
            const result = assessmentResults[questionCounter];
            if (result) {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'summary-item';
                resultDiv.innerHTML = `
                    <h3>${section.title} - Q${questionIndex + 1}</h3>
                    <p><strong>Question:</strong> ${result.prompt}</p>
                    <p><strong>Your Answer:</strong> ${result.userResponse}</p>
                    <p><strong>Feedback:</strong></p>
                    <div class="summary-feedback">${marked.parse(result.feedback)}</div>
                `;
                summaryContent.appendChild(resultDiv);
            }
            questionCounter++;
        });
    });
}

recordBtn.addEventListener('click', () => {
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    if (recognition) {
        recognition.start();
    }
});

stopBtn.addEventListener('click', () => {
    if (recognition) recognition.stop();
});