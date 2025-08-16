document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const recordBtn = document.getElementById('recordBtn');
    const fileInput = document.getElementById('fileInput');
    const typingIndicator = document.getElementById('typingIndicator');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Free Quotable API endpoint (no authentication required)
    const API_ENDPOINT = 'https://api.quotable.io/random';

    // Fallback responses for context
    const fallbackResponses = {
        'hello': 'Greetings! Here’s a thought to ponder:',
        'hi': 'Hi there! Let me share some wisdom:',
        'how are you': 'I’m well, thank you. Here’s something reflective:',
        'what can you do': 'I can offer insights, read text files, and respond to audio with quotes!',
        'bye': 'Farewell! Leave with this:',
        'who are you': 'I’m SomaliGPT, your thoughtful assistant. Here’s a quote:',
        'default': 'Here’s a bit of inspiration for you:'
    };

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
    });

    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addAudioMessage(blob, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'audio-message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(blob);
        messageDiv.appendChild(audio);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function getAIResponse(input) {
        try {
            const response = await fetch(API_ENDPOINT);
            const data = await response.json();
            if (!data.content) throw new Error('API error');
            const quote = `"${data.content}" — ${data.author}`;
            return `${fallbackResponses[input.toLowerCase().trim()] || 'Here’s a thoughtful response:'} ${quote}`;
        } catch (error) {
            console.error('API Error:', error);
            return `${fallbackResponses[input.toLowerCase().trim()] || fallbackResponses['default']} "The only way to do great work is to love what you do." — Steve Jobs`;
        }
    }

    async function transcribeAudio(blob) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        return new Promise((resolve) => {
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                resolve(transcript);
            };
            recognition.onerror = () => resolve('Couldn’t transcribe audio.');
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.onloadeddata = () => {
                recognition.start();
                audio.play();
            };
        });
    }

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        addMessage(userMessage, true);
        userInput.value = '';
        userInput.style.height = 'auto';

        typingIndicator.style.display = 'flex';
        sendBtn.disabled = true;

        const botReply = await getAIResponse(userMessage);
        setTimeout(() => {
            addMessage(botReply);
            typingIndicator.style.display = 'none';
            sendBtn.disabled = false;
        }, 800);
    }

    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'text/plain') {
            addMessage(`Uploaded: ${file.name}`, true);
            typingIndicator.style.display = 'flex';

            const reader = new FileReader();
            reader.onload = async () => {
                const content = reader.result;
                const botReply = await getAIResponse(`User uploaded a text file with this content: "${content.slice(0, 200)}..."`);
                setTimeout(() => {
                    addMessage(botReply);
                    typingIndicator.style.display = 'none';
                }, 800);
            };
            reader.readAsText(file);
        } else {
            addMessage('Please upload a .txt file.', true);
            setTimeout(() => addMessage('I can only process text files. Here’s a quote: "Simplicity is the ultimate sophistication." — Leonardo da Vinci'), 800);
        }
        fileInput.value = '';
    });

    recordBtn.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    addAudioMessage(audioBlob, true);
                    typingIndicator.style.display = 'flex';

                    const transcript = await transcribeAudio(audioBlob);
                    addMessage(`Transcribed: "${transcript}"`, true);
                    const botReply = await getAIResponse(transcript);
                    setTimeout(() => {
                        addMessage(botReply);
                        typingIndicator.style.display = 'none';
                        stream.getTracks().forEach(track => track.stop());
                    }, 1000);
                };

                mediaRecorder.start();
                recordBtn.classList.add('recording');
                addMessage('Recording started...', true);
                isRecording = true;
            } catch (err) {
                addMessage('Error accessing microphone. Please allow permission.');
                console.error(err);
            }
        } else {
            mediaRecorder.stop();
            recordBtn.classList.remove('recording');
            isRecording = false;
        }
    });

    addMessage('Hi, I’m WisdomBot! Ask me anything');
});