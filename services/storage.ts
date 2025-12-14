
import { Notebook, Source, Artifact } from '../types';

const STORAGE_KEY = 'neon_notebook_data_v1';

export const getNotebooks = (): Notebook[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveNotebook = (notebook: Notebook): void => {
  const notebooks = getNotebooks();
  const index = notebooks.findIndex((n) => n.id === notebook.id);
  if (index >= 0) {
    notebooks[index] = notebook;
  } else {
    notebooks.push(notebook);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
};

export const updateNotebook = (notebook: Notebook): void => {
    saveNotebook(notebook);
};

export const createNotebook = (title: string): Notebook => {
  const newNotebook: Notebook = {
    id: crypto.randomUUID(),
    title,
    description: 'New research project',
    sources: [],
    artifacts: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveNotebook(newNotebook);
  return newNotebook;
};

export const deleteNotebook = (id: string): void => {
  const notebooks = getNotebooks().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
};

export const getNotebookById = (id: string): Notebook | undefined => {
  return getNotebooks().find((n) => n.id === id);
};
