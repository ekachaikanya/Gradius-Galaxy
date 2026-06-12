import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini compiler-agent server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY is not defined in environment secrets. Story AI components will render procedural fallbacks.");
}

// 1. Healthcheck Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Story Generation Endpoint utilizing Gemini-3.5-flash
app.post("/api/story/scenario", async (req, res) => {
  const { chapter, commanderName, playerChoice, stageType } = req.body;

  if (!ai) {
    // Elegant procedural fallback when API key is not configured
    return res.json({
      storyText: `Proceeding to Sector ${chapter}. Defensive grids are active, but deep scans are failing due to a localized stellar storm. All systems nominal, Commander ${commanderName || 'Pilot'}.`,
      alienDialogue: "TRESPASSERS WILL BE CRUSHED. LEAVE ZONE IMMEDIATELY.",
      wingmanAdvice: "Commander, I suggest moving around caves carefully. Ceilings are unstable in this sector.",
      stageBuff: {
        name: "Emergency Battery Probe",
        description: "Local sensors boosted. Starts mission with an extra speed booster.",
        type: "SPEED",
        value: 1
      }
    });
  }

  try {
    const prompt = `Write a deep-space Gradius shooter story briefing and tactical mission log for Chapter ${chapter}: ${stageType || 'Alien Core Sector'}.
The pilot is named Commander ${commanderName || 'Viper-1'}.
The pilot chose the following tactical preparation: "${playerChoice || 'Focus on energy distribution'}".
Design an exciting, tense retro sci-fi narrative, including a threatening alien dialogue, tactical wingman advice, and award them a starting gameplay perk themed exactly after their description.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite arcade game storyteller specializing in classic horizontal 1980s side-scrolling space shooter lore (like Gradius, R-Type, and Salamander). Deliver engaging, brief text and precise gameplay game-mechanic buffs in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["storyText", "alienDialogue", "wingmanAdvice", "stageBuff"],
          properties: {
            storyText: {
              type: Type.STRING,
              description: "Sci-fi retro space briefing narrative. Max 4 short paragraphs."
            },
            alienDialogue: {
              type: Type.STRING,
              description: "Hostile transmission from the sector boss, written in all-caps alien dialect with bleeps or static. Max 2 sentences."
            },
            wingmanAdvice: {
              type: Type.STRING,
              description: "Tactical voice assistant warning about space hazards, ceiling geometry, or enemy types. Max 2 sentences."
            },
            stageBuff: {
              type: Type.OBJECT,
              required: ["name", "description", "type", "value"],
              properties: {
                name: { type: Type.STRING, description: "Name of the sci-fi buff." },
                description: { type: Type.STRING, description: "Description of the starting perk." },
                type: { 
                  type: Type.STRING, 
                  description: "Perk type keyword.",
                  enum: ["SPEED", "OPTION", "MISSILE", "SHIELD", "FIRE_RATE"] 
                },
                value: { type: Type.NUMBER, description: "Intensity factor, e.g., speed levels (1, 2), shield durability (3), or laser fire rate scale." }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini API error during story generation:", err);
    // Graceful fallback on error
    res.json({
      storyText: `System Alert! Stellar interference is blocking communication. Commander ${commanderName || 'Pilot'}, we are breaching Chapter ${chapter} alone. Hold steady!`,
      alienDialogue: "WE WILL CONSUME YOUR METALLIC CORES.",
      wingmanAdvice: "Sensors are offline. Use manual dodging maneuvers!",
      stageBuff: {
        name: "Backup Shields",
        description: "Engaging low-voltage auxiliary cells. Start with front shield.",
        type: "SHIELD",
        value: 1
      }
    });
  }
});

// 3. Full-Stack Vite Integration middleware or production static server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite Development Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in Production Mode. Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ship server ignition successful. Running on http://localhost:${PORT}`);
  });
}

startServer();
