
import { GoogleGenAI, Modality } from "@google/genai";
import { Notebook, Source, AudioOverviewDialogue } from "../types";
import { base64ToUint8Array, createWavUrl } from "./audioUtils";

const MODEL_LOGIC = 'gemini-2.5-flash'; 
const MODEL_CREATIVE = 'gemini-3-pro-preview'; 
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPER: JSON CLEANING ---
const cleanJson = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  return cleaned.trim();
};

const safeParseJson = async <T>(text: string, retryPrompt?: string): Promise<T> => {
  try {
    return JSON.parse(cleanJson(text));
  } catch (e) {
    if (retryPrompt) {
      console.warn("JSON parse failed, retrying with repair prompt...");
      const response = await ai.models.generateContent({
        model: MODEL_LOGIC,
        contents: `The following text was meant to be JSON but failed to parse. 
        Fix the JSON formatting ONLY. Do not add explanations.
        
        BROKEN TEXT:
        ${text.slice(0, 10000)}` 
      });
      return JSON.parse(cleanJson(response.text || "{}"));
    }
    throw new Error("Failed to parse JSON response.");
  }
};

const packSources = (sources: Source[]) => {
  return sources.map(s => ({
    id: s.id,
    title: s.title,
    contentExcerpt: s.content.slice(0, 8000), 
    type: s.type
  }));
};

// --- STAGE 1: BLUEPRINT GENERATION ---
const generateBlueprint = async (topic: string, sources: any[]) => {
  const prompt = `
  ROLE: Senior Content Strategist for a Podcast.
  TASK: Create a blueprint for a 2-host conversation about: "${topic}".
  
  SOURCES:
  ${JSON.stringify(sources)}
  
  GOAL:
  Identify the core narrative arc, key claims that need evidence, and potential gaps.
  
  OUTPUT JSON ONLY:
  {
    "angle": "The unique angle/hook for this episode",
    "structure": ["Introduction", "Point 1: ...", "Point 2: ...", "Conclusion"],
    "keyClaims": [
      { "claim": "string", "requiresSourceId": "id from sources" }
    ],
    "controversialPoint": "A specific point where hosts can have a friendly disagreement"
  }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_LOGIC,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return safeParseJson<any>(response.text || "{}", "Fix JSON blueprint");
};

// --- STAGE 2: DIALOGUE GENERATION ---
const generateDialogueScript = async (
  topic: string, 
  blueprint: any, 
  sources: any[], 
  duration: "short" | "medium" | "long"
) => {
  const wordCount = duration === 'short' ? 600 : duration === 'medium' ? 1200 : 1800;
  
  const prompt = `
  ROLE: Senior Podcast Dialogue Writer (NotebookLM Style).
  TASK: Write the full dialogue script based on the Blueprint.
  
  TOPIC: ${topic}
  BLUEPRINT: ${JSON.stringify(blueprint)}
  SOURCES: ${JSON.stringify(sources)}
  TARGET LENGTH: Approx ${wordCount} words.
  
  PERSONAS:
  - Nova (Host A): Calm, grounded, slightly slower, clear explainer. The anchor.
  - Atlas (Host B): Energetic, curious, fast-paced, asks sharp questions, pushes for examples. The explorer.
  
  STRICT RULES:
  1. SOUND REAL: Use contractions ("can't"), interjections ("huh", "wow", "wait—"), and natural flow.
  2. NO ROBOTIC TRANSITIONS: Ban "Firstly", "In conclusion". Use natural segues.
  3. INTERACTION: Hosts must react to each other. No alternating monologues.
  4. CURIOSITY: Include 2 moments of "Wait—so what does that imply?"
  5. DISAGREEMENT: Include 1 friendly disagreement resolving with evidence.
  6. GROUNDING: EVERY substantive claim must cite a sourceId. If conversational, citations can be empty.
  7. COLD OPEN: Start with a hook (1-2 lines). No "Welcome to the show".
  
  OUTPUT JSON SCHEMA:
  {
    "coldOpen": "string",
    "turns": [
      { 
        "speaker": "Nova" | "Atlas", 
        "text": "dialogue string", 
        "pauseMsAfter": number (150-900),
        "citations": [ { "sourceId": "string", "note": "optional context" } ]
      }
    ],
    "factChecks": [
      { "claim": "string", "sourceId": "string", "evidenceSnippet": "EXACT substring from source content (max 20 words)" }
    ]
  }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_CREATIVE, 
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return safeParseJson<any>(response.text || "{}", "Fix JSON dialogue");
};

// --- STAGE 3: SYNTHESIS ---
export const synthesizeDialogueAudio = async (dialogue: AudioOverviewDialogue): Promise<string> => {
    let ttsString = "";
    
    // Convert to Gemini TTS Multi-speaker Format (Speaker: Text)
    // We map Nova -> Jane and Atlas -> Joe for the TTS config
    if (dialogue.coldOpen) {
        ttsString += `Jane: ${dialogue.coldOpen}\n\n`;
    }

    dialogue.turns.forEach(turn => {
        const ttsSpeaker = turn.speaker === 'Nova' ? 'Jane' : 'Joe';
        ttsString += `${ttsSpeaker}: ${turn.text}\n`;
    });

    const audioResp = await ai.models.generateContent({
        model: MODEL_TTS,
        contents: `Generate audio for this dialogue:\n\n${ttsString}`,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, // Atlas
                        { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } // Nova
                    ]
                }
            }
        }
    });

    const base64Audio = audioResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to synthesize audio.");

    const pcmBytes = base64ToUint8Array(base64Audio);
    return createWavUrl(pcmBytes, 24000);
};

// --- MAIN GENERATOR FUNCTION ---
export const generateAudioOverviewDialogue = async (
  notebook: Notebook, 
  topic: string, 
  durationHint: "short" | "medium" | "long",
  onProgress?: (step: string) => void
): Promise<AudioOverviewDialogue> => {
  
  if (!notebook.sources || notebook.sources.length === 0) {
    throw new Error("No sources available in notebook.");
  }

  const packedSources = packSources(notebook.sources);

  // 1. Blueprint
  onProgress?.("Designing episode blueprint...");
  const blueprint = await generateBlueprint(topic, packedSources);

  // 2. Dialogue
  onProgress?.("Writing script & performing 2-host simulation...");
  const scriptRaw = await generateDialogueScript(topic, blueprint, packedSources, durationHint);

  // 3. Validation
  onProgress?.("Validating citations and evidence...");
  
  const validatedTurns = scriptRaw.turns.map((turn: any) => {
    const validCitations = (turn.citations || []).filter((c: any) => 
      notebook.sources.find(s => s.id === c.sourceId)
    );
    return { ...turn, citations: validCitations };
  });

  const validatedFactChecks = (scriptRaw.factChecks || []).filter((fc: any) => {
    const source = notebook.sources.find(s => s.id === fc.sourceId);
    return !!source; 
  });

  const dialogue: AudioOverviewDialogue = {
    id: crypto.randomUUID(),
    title: `Audio Overview: ${topic}`,
    topic: topic,
    durationHint,
    createdAt: Date.now(),
    hosts: {
      nova: { name: "Nova", persona: "Calm, grounded, explainer" },
      atlas: { name: "Atlas", persona: "Energetic, curious, explorer" }
    },
    coldOpen: scriptRaw.coldOpen || "Let's dive in.",
    turns: validatedTurns,
    factChecks: validatedFactChecks,
    warnings: validatedTurns.length < 5 ? ["Script generation resulted in very few turns."] : []
  };

  return dialogue;
};
