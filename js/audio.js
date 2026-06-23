/**
 * Project Lifeline - Audio Module
 * Native Browser APIs (Web Speech API) for zero-backend Voice Interaction
 */

class AudioSystem {
    constructor() {
        this.onSpeechResult = null;
        this.onSilenceTimeout = null;
        this.llm = null; // Will be injected by app.js

        this.elevenLabsVoices = [
            {
                key: "sk_ef0bca2ab208a4fff2a716d1756b5aabdff563d0b50a43d2",
                voiceId: "6Uh5nRLZ7GiaN4UMj68z"
            },
            {
                key: "sk_061e6da93cc8e261eeac6a8e7768ebb06f6f19d2ac043193",
                voiceId: "P1d6FZVycYNYhkk5H2aB"
            },
            {
                key: "sk_89adc046ed0a141ef9668511158a35eebecd2c8e947aff31",
                voiceId: "rVe0QW8mRFFAsCE18jXB"
            }
        ].filter(v => v.key && v.key.trim().length > 0);

        // Streaming Context
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.activeSources = [];
        this.abortController = null;

        this.recognition = null;
        this.isListening = false;
        this.silenceTimer = null;

        this.synth = window.speechSynthesis;
        this.voices = [];
        this._currentUtterance = null; // Prevent garbage collection bug

        // Load voices asynchronously and reliably
        this._loadVoices = () => {
            this.voices = this.synth.getVoices();
        };
        this.synth.onvoiceschanged = this._loadVoices;

        this._initRecognition();
    }

    async unlockAudioContext() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }
    }

    _initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("LỖI: Trình duyệt không hỗ trợ Web Speech API.");
            alert("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói. Vui lòng sử dụng Google Chrome.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'vi-VN';
        this.recognition.continuous = true; // Keep listening even if user pauses
        this.recognition.interimResults = true; // Get real-time updates

        let transcriptBuffer = "";
        let speechDebounceTimer = null;

        this.isMuted = false;
        this.garbagePrefixes = {};
        this.lastEvent = null;

        this.recognition.onstart = () => {
            this.isListening = true;
            transcriptBuffer = "";
            this._resetSilenceTimer();
            // Feedback UI
            const btnIcon = document.querySelector('#start-call-btn i');
            if (btnIcon) btnIcon.className = "lucide-mic animate-pulse";
        };

        this.recognition.onresult = (event) => {
            this.lastEvent = event;
            clearTimeout(this.silenceTimer);
            clearTimeout(speechDebounceTimer);

            if (this.isMuted) {
                // Completely ignore STT results while AI is speaking
                return;
            }

            if (window.updateLogicCanvas) window.updateLogicCanvas('stt', 'active');

            let cleanTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                let text = event.results[i][0].transcript;
                let garbage = this.garbagePrefixes[i] || "";
                
                // If the user's speech appended to the AI's garbage speech, slice the garbage off
                if (text.startsWith(garbage)) {
                    text = text.substring(garbage.length);
                } else if (garbage.startsWith(text)) {
                    // Sometimes STT corrects itself and the string shrinks slightly
                    text = "";
                }
                cleanTranscript += text;
            }
            
            transcriptBuffer = cleanTranscript.trim();

            if (transcriptBuffer.length === 0) {
                // Keep the silence timer alive if the STT update was just garbage/AI echo
                if (this.isListening) this._resetSilenceTimer();
                return;
            }

            // Wait 1.2 seconds after the user stops speaking before submitting (VAD)
            speechDebounceTimer = setTimeout(() => {
                if (transcriptBuffer.length > 0 && this.onSpeechResult) {
                    if (window.updateLogicCanvas) window.updateLogicCanvas('stt', 'completed');
                    const finalMsg = transcriptBuffer;
                    transcriptBuffer = "";
                    this.garbagePrefixes = {}; // clear garbage after successful read
                    this.onSpeechResult(finalMsg);
                } else {
                    this._resetSilenceTimer();
                }
            }, 1200);
        };

        this.recognition.onerror = (event) => {
            console.warn("Speech Recognition Error:", event.error);
            // If we are actively expecting input, any error should resolve to prevent FSM deadlocks
            if (!this.isMuted) {
                clearTimeout(this.silenceTimer);
                if (this.onSilenceTimeout) {
                    console.log("[Audio] Escalating recognition error to silence timeout for recovery.");
                    this.onSilenceTimeout();
                }
            }
        };

        this.recognition.onend = () => {
            const wasActive = this.isListening;
            this.isListening = false;
            clearTimeout(this.silenceTimer);
            
            // Auto-restart if recognition died unexpectedly during user turn
            if (wasActive && !this.isMuted) {
                console.log("[Audio] Speech recognition stopped unexpectedly. Auto-restarting session...");
                try {
                    this.recognition.start();
                    this.isListening = true;
                    this._resetSilenceTimer();
                } catch (e) {
                    console.error("[Audio] Failed to auto-restart speech recognition:", e);
                }
            }
        };
    }

    _resetSilenceTimer(duration = 15000) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
            if (this.isListening) {
                this.stopListening();
                if (this.onSilenceTimeout) {
                    this.onSilenceTimeout();
                }
            }
        }, duration);
    }

    startListening(timeoutMs = 15000) {
        this.unmute();
        if (!this.recognition) {
            if (this.onSilenceTimeout) this.onSilenceTimeout();
            return;
        }
        if (this.isListening) {
            this._resetSilenceTimer(timeoutMs);
            return;
        }
        try {
            this.recognition.start();
            this._resetSilenceTimer(timeoutMs);
        } catch (e) {
            console.log("Recognition already started");
        }
    }

    stopListening(hardStop = false) {
        this.mute();
        
        // Virtual Mute Hack: We DO NOT actually call this.recognition.stop() during the call loop!
        // This keeps the microphone active and completely eliminates the 500ms - 1.5s hardware spin-up latency 
        // that Chrome introduces every time recognition.start() is called.
        if (hardStop) {
            if (!this.recognition) return;
            try {
                this.recognition.stop();
            } catch (e) { }
            this.isListening = false;
        }
        clearTimeout(this.silenceTimer);
    }

    mute() {
        this.isMuted = true;
    }

    unmute() {
        this.isMuted = false;
        this.garbagePrefixes = {};
        
        // Snapshot the current STT buffer so we can subtract it from the user's speech later
        if (this.lastEvent && this.lastEvent.results) {
            for (let i = this.lastEvent.resultIndex; i < this.lastEvent.results.length; i++) {
                this.garbagePrefixes[i] = this.lastEvent.results[i][0].transcript;
            }
        }
    }

    setOpenAIKey(key) {
        this.openaiKey = key;
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    }

    _playPcmChunk(pcmBase64, nextPlayTime) {
        const binaryString = atob(pcmBase64);
        const len = binaryString.length;
        const pcm16 = new Int16Array(len / 2);
        for (let i = 0; i < len / 2; i++) {
            pcm16[i] = binaryString.charCodeAt(i * 2) | (binaryString.charCodeAt(i * 2 + 1) << 8);
        }

        const audioBuffer = this.audioCtx.createBuffer(1, pcm16.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcm16.length; i++) {
            channelData[i] = pcm16[i] / 32768; // Convert Int16 to Float32 [-1, 1]
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioCtx.destination);
        this.activeSources.push(source);

        if (nextPlayTime < this.audioCtx.currentTime) {
            nextPlayTime = this.audioCtx.currentTime + 0.05; // tiny buffer if underrun
        }

        source.start(nextPlayTime);
        return { source, duration: audioBuffer.duration };
    }

    async speak(text) {
        if (window.updateLogicCanvas) window.updateLogicCanvas('tts', 'active');
        this.mute();
        return new Promise(async (resolve) => {
            this.stopSpeaking();
            await this.unlockAudioContext();
            this.abortController = new AbortController();

            // 0. Check Local Cache & Physical Cache Folder
            const hash = this._hashString(text);
            const cacheKey = `tts_${hash}`;
            let cachedData = null;

            // Try fetching from the physical pre-generated cache folder first
            try {
                const res = await fetch(`cached_audio/${hash}.json`);
                if (res.ok) {
                    cachedData = await res.text();
                    console.log("[TTS] Loaded from physical cached_audio folder for:", text);
                }
            } catch (e) { /* Ignore fetch errors */ }

            // Fallback to localStorage if physical file doesn't exist
            if (!cachedData) {
                try {
                    cachedData = localStorage.getItem(cacheKey);
                    if (cachedData) console.log("[TTS] Playing from localStorage cache for:", text);
                } catch (e) { console.warn("[TTS] LocalStorage read error:", e); }
            }

            if (cachedData) {
                try {
                    const chunks = JSON.parse(cachedData);
                    let nextPlayTime = this.audioCtx.currentTime;
                    let lastSource = null;
                    
                    for (const chunk of chunks) {
                        const res = this._playPcmChunk(chunk, nextPlayTime);
                        nextPlayTime += res.duration;
                        lastSource = res.source;
                    }
                    
                    if (lastSource) {
                        if (window.updateLogicCanvas) window.updateLogicCanvas('out', 'active');
                        if (window.updateLogicCanvas) window.updateLogicCanvas('tts', 'completed');
                        lastSource.onended = () => {
                            if (window.updateLogicCanvas) window.updateLogicCanvas('out', 'completed');
                            resolve();
                        }
                        return;
                    }
                } catch (e) {
                    console.warn("[TTS] Error playing cached data:", e);
                }
            }

            // 0. ElevenLabs Ultra-Fast TTS (with priority fallback sequence)
            if (this.elevenLabsVoices && this.elevenLabsVoices.length > 0) {
                for (let i = 0; i < this.elevenLabsVoices.length; i++) {
                    const voiceConfig = this.elevenLabsVoices[i];
                    try {
                        console.log(`[TTS] Trying ElevenLabs Voice ${i+1}: ${voiceConfig.voiceId}`);
                        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}?output_format=mp3_44100_128`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'xi-api-key': voiceConfig.key
                            },
                            body: JSON.stringify({
                                text: text,
                                model_id: "eleven_turbo_v2_5"
                            }),
                            signal: this.abortController.signal
                        });
                        
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                            
                            const source = this.audioCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(this.audioCtx.destination);
                            this.activeSources.push(source);
                            
                            source.start(this.audioCtx.currentTime);
                            
                            await new Promise(r => source.onended = r);
                            resolve();
                            return;
                        } else {
                            const errMsg = await response.text();
                            console.warn(`[TTS] ElevenLabs Voice ${i+1} failed:`, errMsg);
                        }
                    } catch (e) {
                        if (e.name === 'AbortError') {
                            resolve();
                            return;
                        }
                        console.warn(`[TTS] ElevenLabs Voice ${i+1} network error:`, e);
                    }
                }
            }

            // 1. Gemini 2.5 Flash Preview TTS (STREAMING)
            if (this.llm && this.llm.authSignature) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:streamGenerateContent?alt=sse&key=${this.llm.authSignature}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                role: "user",
                                parts: [{ text: text }]
                            }],
                            generationConfig: {
                                responseModalities: ["AUDIO"],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: {
                                            voiceName: "Aoede"
                                        }
                                    }
                                }
                            }
                        }),
                        signal: this.abortController.signal
                    });
                    
                    if (!response.ok) {
                        const err = await response.json();
                        alert(`⚠️ Lỗi Gemini TTS API:\n${err.error?.message || "Unknown error"}`);
                        resolve();
                        return;
                    }

                    // SSE STREAMING LOGIC
                    console.log("[TTS] Starting SSE stream parse. AudioContext state:", this.audioCtx.state);
                    let nextPlayTime = this.audioCtx.currentTime;
                    let lastSource = null;
                    let chunkCount = 0;
                    let cachedChunks = []; // Accumulate chunks for caching

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                    let buffer = '';

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            console.log("[TTS] Stream finished reading.");
                            try {
                                localStorage.setItem(cacheKey, JSON.stringify(cachedChunks));
                                console.log("[TTS] Saved to cache.");
                            } catch (e) {
                                console.warn("[TTS] Failed to save cache (might be full).");
                            }
                            break;
                        }
                        
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // keep incomplete line
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.replace('data: ', '').trim();
                                if (jsonStr === '[DONE]') {
                                    console.log("[TTS] Received [DONE] signal.");
                                    continue;
                                }
                                if (!jsonStr) continue;
                                
                                try {
                                    const data = JSON.parse(jsonStr);
                                    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                                    
                                    if (audioPart && audioPart.inlineData) {
                                        chunkCount++;
                                        const pcmBase64 = audioPart.inlineData.data;
                                        cachedChunks.push(pcmBase64);
                                        
                                        const res = this._playPcmChunk(pcmBase64, nextPlayTime);
                                        nextPlayTime += res.duration;
                                        lastSource = res.source;
                                    } else {
                                        console.log("[TTS] Chunk received but no inlineData found.", JSON.stringify(data).substring(0, 100));
                                    }
                                } catch(e) {
                                    console.error("[TTS] Partial JSON parse error or decode error:", e);
                                }
                            }
                        }
                    }

                    if (lastSource) {
                        console.log("[TTS] Attaching onended to the final chunk.");
                        if (window.updateLogicCanvas) window.updateLogicCanvas('out', 'active');
                        if (window.updateLogicCanvas) window.updateLogicCanvas('tts', 'completed');
                        lastSource.onended = () => {
                            console.log("[TTS] Final chunk playback completed.");
                            if (window.updateLogicCanvas) window.updateLogicCanvas('out', 'completed');
                            resolve();
                        };
                        return; // Ensure we exit the function!
                    } else {
                        console.log("[TTS] No audio chunks were played.");
                        resolve();
                        return;
                    }
                } catch (e) {
                    if (e.name === 'AbortError') {
                        resolve(); // Cancelled
                        return;
                    } else {
                        console.error("Gemini TTS Streaming Error:", e);
                        resolve();
                        return;
                    }
                }
            }

            // 2. OpenAI TTS (State-of-the-art ML Model)
            if (this.openaiKey) {
                try {
                    const response = await fetch('https://api.openai.com/v1/audio/speech', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.openaiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'tts-1',
                            input: text,
                            voice: 'nova'
                        })
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        this.currentAudio = new Audio(url);
                        this.currentAudio.onended = resolve;
                        this.currentAudio.onerror = resolve;
                        await this.currentAudio.play();
                        return;
                    }
                } catch (e) {
                    console.error("OpenAI TTS Failed:", e);
                }
            }

            // 3. ResponsiveVoice Fallback
            if (window.responsiveVoice) {
                // ResponsiveVoice automatically handles chunking, network streams, and OS fallbacks seamlessly
                if (window.updateLogicCanvas) window.updateLogicCanvas('tts', 'completed');
                if (window.updateLogicCanvas) window.updateLogicCanvas('out', 'active');
                window.responsiveVoice.speak(text, "Vietnamese Female", {
                    onend: () => {
                        if (window.updateLogicCanvas) window.updateLogicCanvas('out', 'completed');
                        resolve();
                    },
                    onerror: () => resolve()
                });

                // Absolute failsafe timeout in case onend never fires
                const estimatedDuration = (text.length * 150) + 2000;
                setTimeout(() => {
                    if (window.responsiveVoice.isPlaying()) {
                        window.responsiveVoice.cancel();
                    }
                    resolve();
                }, estimatedDuration);
            } else {
                console.error("ResponsiveVoice library not loaded.");
                resolve();
            }
        });
    }

    stopSpeaking() {
        if (window.responsiveVoice) {
            window.responsiveVoice.cancel();
        }
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        for (const source of this.activeSources) {
            try { source.stop(); } catch(e) {}
            source.disconnect();
        }
        this.activeSources = [];
    }
}
