/**
 * Project Lifeline - Configuration File
 * 
 * Replace the values below with your actual API keys.
 * DO NOT commit this file with real keys to public repositories.
 */

window.CONFIG = {
    // Mapbox Token for map rendering
    MAPBOX_TOKEN: 'YOUR_MAPBOX_TOKEN_HERE',
    
    // Gemini API Key for LLM interactions
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
    
    // ElevenLabs API Keys for Text-to-Speech voices
    ELEVENLABS_VOICES: [
        {
            key: "YOUR_ELEVENLABS_API_KEY_1_HERE",
            voiceId: "6Uh5nRLZ7GiaN4UMj68z" // Sample voice ID
        },
        {
            key: "YOUR_ELEVENLABS_API_KEY_2_HERE",
            voiceId: "P1d6FZVycYNYhkk5H2aB"
        },
        {
            key: "YOUR_ELEVENLABS_API_KEY_3_HERE",
            voiceId: "rVe0QW8mRFFAsCE18jXB"
        }
    ]
};
