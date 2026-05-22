import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Google GenAI to handle missing keys gracefully
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ------------------ API ROUTES FIRST ------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    apiConfigured: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// TTS Generation Route
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName, accent, mood, speed } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text content is required' });
      return;
    }

    const cleanedText = text.trim();

    // Set default values if not defined
    const selectedVoice = voiceName || 'Kore';
    const selectedAccent = accent || 'American';
    const selectedMood = mood || 'Standard';
    const selectedSpeed = speed || 'Medium';

    // Build the instruction prompt. We guide Gemini's voice tone & pronunciation by prefixing style commands.
    const prompt = `Read the following text exactly. Use a ${selectedMood.toLowerCase()} tone. Deliver it at a ${selectedSpeed.toLowerCase()} speaking rate with a natural ${selectedAccent.toLowerCase()} accent. Do not introduce yourself or generate any response other than speaking the text.

Text to read:
"${cleanedText}"`;

    const ai = getAIClient();

    // Call Gemini Text to Speech Model
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        // System instructions ensure the model acts strictly as an audio generator and doesn't write conversation text
        systemInstruction: 'You are a highly precise, studio-grade Text-to-Speech (TTS) converter. Read the text provided in the user prompt exactly, applying the requested delivery settings (accent, speed, mood) perfectly. Do not output text conversations or explanations. Speak only the target text.',
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const firstPart = candidate?.content?.parts?.[0];
    const base64Audio = firstPart?.inlineData?.data;

    if (!base64Audio) {
      console.error('Failed to receive base64 audio data from Gemini. Response:', JSON.stringify(response, null, 2));
      res.status(502).json({
        error: 'The TTS model did not return audio. Please try modifying your text or parameters.',
      });
      return;
    }

    res.json({
      audioDataBase64: base64Audio,
      text: cleanedText,
      voice: selectedVoice,
    });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    res.status(500).json({
      error: error.message || 'An unexpected error occurred during TTS audio generation. Please try again.',
    });
  }
});

// ------------------ VITE OR STATIC FRONTEND SERVING ------------------

async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Started under DEVELOPMENT mode with Vite live-reload middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Started under PRODUCTION static build hosting.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS application server successfully listening at http://localhost:${PORT}`);
  });
}

setupFrontend().catch((err) => {
  console.error('Fatal error setting up frontend server:', err);
});
