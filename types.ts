
export interface Source {
  id: string;
  type: 'pdf' | 'audio' | 'image' | 'website' | 'youtube' | 'copiedText';
  title: string;
  content: string; // The raw text extracted
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

export interface AudioOverviewDialogue {
  id: string;                 // uuid
  title: string;              // “Audio Overview: <topic>”
  topic: string;              // user topic
  durationHint: "short" | "medium" | "long";
  createdAt: number;
  audioUrl?: string;          // WAV/MP3 Url if synthesized
  hosts: {
    nova: { name: "Nova", persona: string };
    atlas: { name: "Atlas", persona: string };
  };
  coldOpen: string;           // 1-2 lines hook
  turns: Array<{
    speaker: "Nova" | "Atlas";
    text: string;             // 1-3 sentences, spoken-style
    pauseMsAfter: number;     // 150-900, varies naturally
    citations: Array<{ sourceId: string; note?: string }>;
  }>;
  factChecks: Array<{
    claim: string;
    sourceId: string;
    evidenceSnippet: string;  // <= 25 words, MUST be exact substring from the source content
  }>;
  warnings?: string[];        // e.g. “Insufficient sources for X”
}

export interface Artifact {
  id: string;
  type: 'flashcards' | 'quiz' | 'infographic' | 'slideDeck' | 'audioOverview' | 'executiveBrief' | 'swotAnalysis' | 'projectRoadmap' | 'faqGuide';
  title: string;
  content: any; // Structured JSON (AudioOverviewDialogue) or text
  createdAt: number;
  status: 'generating' | 'completed' | 'failed';
}

export interface Notebook {
  id: string;
  title: string;
  description: string;
  sources: Source[];
  artifacts: Artifact[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  citations?: string[];
  groundingMetadata?: any; // Google Search Grounding Data
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface BackgroundJob {
  id: string;
  notebookId: string;
  type: Artifact['type'];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: string;
}
