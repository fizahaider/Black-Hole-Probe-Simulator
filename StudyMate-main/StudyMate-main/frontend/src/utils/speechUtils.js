/**
 * Web Speech API Utility for STT and TTS
 */

// Text-to-Speech (TTS)
export const speakText = (text) => {
    if (!window.speechSynthesis) {
        console.error("Speech Synthesis not supported in this browser.");
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;


    window.speechSynthesis.speak(utterance);
};

// Speech-to-Text (STT)
export const startListening = (onResult, onError, onEnd) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser. Try Chrome or Edge.");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (onError) onError(event.error);
    };

    recognition.onend = () => {
        if (onEnd) onEnd();
    };

    recognition.start();
    return recognition;
};

export const stopListening = (recognition) => {
    if (recognition) {
        recognition.stop();
    }
};

export const cancelSpeech = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};
