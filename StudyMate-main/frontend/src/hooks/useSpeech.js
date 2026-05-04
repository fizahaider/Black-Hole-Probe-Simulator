import * as React from 'react';
import axios from 'axios';

const useSpeech = () => {
    const [isListening, setIsListening] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = React.useState(false);

    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);
    const audioRef = React.useRef(new Audio());

    
    const startListening = React.useCallback(async (onResult) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setIsListening(false);

                stream.getTracks().forEach(track => track.stop());

                try {
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'speech.wav');

                    const accessToken = localStorage.getItem('accessToken');
                    if (!accessToken) {
                        console.error("No access token found for STT request.");
                        return;
                    }

                    const response = await axios.post(
                        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/document/stt/`,
                        formData,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                            }
                        }
                    );
                    if (response.data.transcript && onResult) {
                        onResult(response.data.transcript);
                    }
                } catch (error) {
                    console.error("Deepgram transcription failed:", error);
                }
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone.");
        }
    }, [setIsListening]);

    const stopListening = React.useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    
    const speakNative = React.useCallback((text) => {
        if (!window.speechSynthesis) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Female"));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [setIsSpeaking]);

    
    const speak = React.useCallback(async (text, voiceId = null) => {
        if (!text) return;

        try {
            setIsSpeaking(true);
            const accessToken = localStorage.getItem('accessToken');

            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/document/tts/`,
                { text, voice_id: voiceId },
                {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = url;
                audioRef.current.play();

                audioRef.current.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(url);
                };

                audioRef.current.onerror = () => {
                    console.warn("Audio element failed, falling back to native TTS...");
                    speakNative(text);
                };
            }
        } catch (error) {
            console.error("ElevenLabs TTS failed (quota likely exceeded), falling back to native TTS:", error);
            
            speakNative(text);
        }
    }, [setIsSpeaking, speakNative]);

    const stopSpeaking = React.useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        setIsSpeaking(false);
    }, [setIsSpeaking]);

    
    React.useEffect(() => {
        return () => {
            stopSpeaking();
            stopListening();
            if (audioRef.current) {
                audioRef.current.src = "";
            }
        };
    }, [stopSpeaking, stopListening]);

    return {
        isListening,
        isSpeaking,
        startListening,
        stopListening,
        speak,
        stopSpeaking
    };
};

export default useSpeech;
