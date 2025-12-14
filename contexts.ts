
import { createContext, useContext } from 'react';
import { Theme, THEMES, ThemeId } from './constants';
import { BackgroundJob, Notification, Artifact } from './types';

// --- THEME CONTEXT ---
interface ThemeContextType {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.midnight_azure,
  setThemeId: () => {},
  animationsEnabled: true,
  setAnimationsEnabled: () => {}
});

export const useTheme = () => useContext(ThemeContext);

// --- JOB & NOTIFICATION CONTEXT ---
interface JobContextType {
  startJob: (notebookId: string, type: Artifact['type'], sources: any[], config?: any) => Promise<void>;
  jobs: BackgroundJob[];
  notifications: Notification[];
  dismissNotification: (id: string) => void;
}

export const JobContext = createContext<JobContextType>({
  startJob: async () => {},
  jobs: [],
  notifications: [],
  dismissNotification: () => {}
});

export const useJobs = () => useContext(JobContext);
