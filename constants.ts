
export const APP_NAME = "Nebula Mind";

export const AUDIO_SAMPLE_RATE = 24000; // Gemini Live standard

export const RAG_SYSTEM_INSTRUCTION = `You are a helpful AI research assistant inside a notebook app called Nebula Mind. 
Answer questions based STRICTLY on the provided sources. 
If the answer is not in the sources, state that clearly.
Cite your sources by referring to the title of the document.
Keep answers concise and professional.`;

// --- VOICE CONFIGURATION ---
// Mapped to NotebookLM-style personas
// Joe -> Atlas (Curious, energetic)
// Jane -> Nova (Calm, grounded)
export const VOICES = {
  joe: [
    { id: 'Puck', name: 'Atlas (Energetic, Curious)', gender: 'Male' },
    { id: 'Fenrir', name: 'Fenrir (Deep, Authoritative)', gender: 'Male' },
    { id: 'Charon', name: 'Charon (Raspy, Storyteller)', gender: 'Male' },
    { id: 'Orus', name: 'Orus (Confident, Narrator)', gender: 'Male' }
  ],
  jane: [
    { id: 'Aoede', name: 'Nova (Calm, Grounded)', gender: 'Female' },
    { id: 'Zephyr', name: 'Zephyr (Calm, Insightful)', gender: 'Female' },
    { id: 'Kore', name: 'Kore (Energetic, Bright)', gender: 'Female' },
    { id: 'Leda', name: 'Leda (Soft, Sophisticated)', gender: 'Female' }
  ]
};

// --- PODCAST STYLES ---
export const PODCAST_STYLES = [
  { id: 'Deep Dive', label: 'Deep Dive', desc: 'Analytical, structured, "aha" moments', icon: 'Mic' },
  { id: 'Heated Debate', label: 'Heated Debate', desc: 'Skeptical vs Optimist, intense', icon: 'Flame' },
  { id: 'Casual Chat', label: 'Casual Chat', desc: 'Relaxed, slang, coffee shop vibe', icon: 'Coffee' },
  { id: 'News Brief', label: 'News Brief', desc: 'Fast-paced, formal reporting', icon: 'Newspaper' },
  { id: 'Study Guide', label: 'Study Guide', desc: 'Educational, exam-prep focus', icon: 'GraduationCap' },
];

export const LEARNING_INTENTS = [
  { id: 'Understand Basics', label: 'Mental Model', desc: 'Connect big ideas. Establish the foundation.' },
  { id: 'Exam Prep', label: 'Ace the Exam', desc: 'Definitions, dates, and rapid-fire memory checks.' },
  { id: 'Apply', label: 'Real World', desc: 'Case studies and practical application scenarios.' },
  { id: 'Teach', label: 'Feynman Mode', desc: 'Simplify complex jargon to teach others.' }
];

// --- THEMING SYSTEM ---

export type ThemeId = 'neon' | 'obsidian' | 'arctic' | 'quantum' | 'gilded' | 'crimson' | 'cyberpunk' | 'lux' | 'midnight_azure' | 'nebula_mind' | 'onyx_elite' | 'celestial_aurora';

export interface Theme {
  id: ThemeId;
  name: string;
  colors: {
    primary: string; // Tailwind color name
    secondary: string; // Tailwind color name
    accent: string; // Tailwind color name
    background: string; // Tailwind class
    panel: string; // Tailwind class for glass panels
    text: string; // Tailwind class for primary text
  };
}

export const THEMES: Record<ThemeId, Theme> = {
  onyx_elite: {
    id: 'onyx_elite',
    name: 'Onyx Elite',
    colors: {
      primary: 'slate', // Cool Grey
      secondary: 'zinc',
      accent: 'sky',
      background: 'bg-[#000000]', // True Black
      panel: 'bg-[#0a0a0a]/80 shadow-[0_0_40px_rgba(255,255,255,0.03)] border-white/10 backdrop-blur-3xl', // High-end frosted matte
      text: 'text-slate-200'
    }
  },
  celestial_aurora: {
    id: 'celestial_aurora',
    name: 'Celestial Aurora',
    colors: {
      primary: 'teal',
      secondary: 'indigo',
      accent: 'emerald',
      background: 'bg-[#020617]', // Deep Slate
      panel: 'bg-[#0f172a]/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border-teal-500/20 backdrop-blur-2xl', // Glassy
      text: 'text-teal-50'
    }
  },
  midnight_azure: {
    id: 'midnight_azure',
    name: 'Midnight Azure',
    colors: {
      primary: 'blue', // Royal Blue
      secondary: 'indigo',
      accent: 'cyan',
      background: 'bg-[#000205]', // Deepest Midnight Black
      panel: 'bg-[#0f172a]/40 shadow-[0_0_25px_rgba(29,78,216,0.15)] border-blue-600/30 backdrop-blur-xl', // High-end frosted glass with blue glow
      text: 'text-blue-50'
    }
  },
  nebula_mind: {
    id: 'nebula_mind',
    name: 'Nebula Mind',
    colors: {
      primary: 'purple',
      secondary: 'pink',
      accent: 'cyan',
      background: 'bg-[#090014]', // Very Deep Purple/Black
      panel: 'bg-[#1e1b4b]/40', 
      text: 'text-purple-50'
    }
  },
  neon: {
    id: 'neon',
    name: 'Neon Nebula',
    colors: {
      primary: 'cyan',
      secondary: 'fuchsia', 
      accent: 'violet',
      background: 'bg-black', // Pure Black for high contrast
      panel: 'bg-zinc-900/60',
      text: 'text-cyan-50'
    }
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Frost',
    colors: {
      primary: 'sky',
      secondary: 'teal',
      accent: 'indigo',
      background: 'bg-[#0f172a]', // Slate-900
      panel: 'bg-slate-800/50', 
      text: 'text-sky-50'
    }
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Gold',
    colors: {
      primary: 'amber',
      secondary: 'orange',
      accent: 'red',
      background: 'bg-[#0c0a09]', // Stone-950
      panel: 'bg-stone-900/60',
      text: 'text-amber-50'
    }
  },
  quantum: {
    id: 'quantum',
    name: 'Quantum Pulse',
    colors: {
      primary: 'violet',
      secondary: 'indigo',
      accent: 'fuchsia',
      background: 'bg-[#020617]', 
      panel: 'bg-violet-950/30',
      text: 'text-violet-50'
    }
  },
  gilded: {
    id: 'gilded',
    name: 'Gilded Horizon',
    colors: {
      primary: 'emerald',
      secondary: 'yellow',
      accent: 'lime',
      background: 'bg-[#022c22]', // Deep Emerald
      panel: 'bg-emerald-900/40',
      text: 'text-emerald-50'
    }
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Eclipse',
    colors: {
      primary: 'red',
      secondary: 'rose',
      accent: 'orange',
      background: 'bg-[#1a0505]', 
      panel: 'bg-red-950/30',
      text: 'text-red-50'
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    colors: {
      primary: 'fuchsia',
      secondary: 'cyan',
      accent: 'yellow',
      background: 'bg-[#050505]',
      panel: 'bg-zinc-900/50',
      text: 'text-fuchsia-50'
    }
  },
  lux: {
    id: 'lux',
    name: 'Lux Midnight',
    colors: {
      primary: 'violet',
      secondary: 'amber',
      accent: 'pink',
      background: 'bg-[#0a0a12]', 
      panel: 'bg-[#151520]/60',
      text: 'text-indigo-50'
    }
  }
};
