# Project Lifeline - DispatcherAI

A front-end browser demonstration built to showcase a voice-to-voice emergency dispatcher system. It demonstrates core state machine routing, entity triage, and dispatching logic under strict hackathon portability constraints (runs on a single double-click, zero backend setup, serverless execution).

It connects browser voice inputs directly to the **Google Gemini API** for extraction/NLP, uses **ElevenLabs** to solve latency for voice synthesis, and cascades to Web Speech synthesis APIs for seamless client-side interaction.

## Features

- **VAD & STT:** Captures caller's voice stream.
- **NLP Parse:** Uses Gemini to perform Natural Language Processing to extract slots and intentions.
- **GIS Map:** Real-time location mapping with Leaflet.
- **FSM Loop:** State machine to direct dialogue flow.
- **Severity Triage:** Dynamically triages emergency severity.
- **Report Generation:** Automatically compiles Markdown incident reports.

## Setup Instructions

1. Navigate into the `web_app/js` directory.
2. You will find a file named `config.js`. Open it in any text editor.
3. Replace the placeholder values with your actual API keys:
   - `MAPBOX_TOKEN`: Your Mapbox access token.
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `ELEVENLABS_VOICES`: Your ElevenLabs API keys (you can configure multiple for fallback/variety).

## How to Run

Since this is a fully client-side application, you can simply open `web_app/index.html` in your modern web browser (Google Chrome or Microsoft Edge recommended) to start the application. 

You may need to allow microphone permissions when using the simulated phone call feature.

## Usage

1. Open `index.html`.
2. Locate the smartphone emulator on the right.
3. Click the green **Call Button** and approve microphone permissions.
4. Speak your simulated emergency into the microphone.
5. The AI operator will analyze the voice, update the dashboard, and respond via TTS.
6. Click the red **Hang Up Button** to generate the final incident report.
