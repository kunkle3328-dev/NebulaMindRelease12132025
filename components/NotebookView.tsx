
import React, { useState, useEffect } from 'react';
import { Notebook, Source } from '../types';
import { ArrowLeft, MessageSquare, Layers, FolderOpen, Palette, ChevronLeft, ChevronRight, Edit2, Check, X, Share2, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import SourcesTab from './SourcesTab';
import ChatTab from './ChatTab';
import StudioTab from './StudioTab';
import { THEMES } from '../constants';
import { useTheme } from '../contexts';
import { NebulaLogo, ThemeSelector } from './ThemeUI';

interface Props {
  notebook: Notebook;
  onUpdate: (nb: Notebook) => void;
}

type Tab = 'sources' | 'chat' | 'studio';

const NotebookView: React.FC<Props> = ({ notebook, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('sources');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme, setThemeId } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(notebook.title);

  useEffect(() => {
      setEditedTitle(notebook.title);
  }, [notebook.title]);

  const saveTitle = () => {
      if (editedTitle.trim() && editedTitle !== notebook.title) {
          onUpdate({ ...notebook, title: editedTitle, updatedAt: Date.now() });
      }
      setIsEditingTitle(false);
  };

  const addSource = (source: Source) => {
    const updated = {
      ...notebook,
      sources: [...notebook.sources, source],
      updatedAt: Date.now()
    };
    onUpdate(updated);
  };

  const deleteSource = (sourceId: string) => {
    const updated = {
        ...notebook,
        sources: notebook.sources.filter(s => s.id !== sourceId),
        updatedAt: Date.now()
    };
    onUpdate(updated);
  };

  const handleShare = () => {
      navigator.clipboard.writeText(`https://nebulamind.ai/notebook/${notebook.id}`);
      alert("Notebook link copied to clipboard!");
      setShowShareModal(false);
  };

  return (
    // Root: Fixed 100dvh to prevent body scroll issues on mobile
    // Changed bg-slate-950 to bg-transparent to let global animations show through
    <div className={`h-[100dvh] w-full bg-transparent flex flex-col md:flex-row overflow-hidden transition-colors duration-700 ${theme.colors.text}`}>
      
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className={`
        fixed bottom-0 left-0 w-full h-16 glass-panel border-t border-white/10 z-[100]
        md:relative md:h-full md:border-t-0 md:border-r md:flex md:flex-col
        transition-all duration-300 bg-black/80 backdrop-blur-xl md:bg-black/20
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
      `}>
        {/* Toggle Collapse Button */}
        <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-slate-800 border border-white/10 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 z-50 shadow-lg"
        >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`hidden md:flex p-6 items-center gap-3 mb-6 ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}>
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                <div className="p-2 hover:bg-white/5 rounded-full"><ArrowLeft size={20} /></div>
            </Link>
            {!isSidebarCollapsed && <NebulaLogo size="sm" />}
        </div>
        
        <div className={`px-6 mb-8 hidden md:block ${isSidebarCollapsed ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}>
            <h2 className={`text-xs font-bold text-${theme.colors.secondary}-400 uppercase tracking-widest mb-3 opacity-80`}>Active Project</h2>
            <div className={`p-4 rounded-xl bg-${theme.colors.primary}-500/5 border border-${theme.colors.primary}-500/10 group`}>
                
                {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                        <input 
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                            autoFocus
                            className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-white w-full outline-none"
                        />
                        <button onClick={saveTitle} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                    </div>
                ) : (
                    <div className="flex items-start justify-between">
                         <div>
                            <h1 className="font-bold text-lg truncate leading-tight w-40" title={notebook.title}>
                                {notebook.title}
                            </h1>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Online
                            </p>
                         </div>
                         <button 
                            onClick={() => setIsEditingTitle(true)}
                            className="text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex flex-row justify-around h-full items-center md:flex-col md:justify-start md:px-4 md:gap-3">
            <button 
                onClick={() => setActiveTab('sources')}
                title="Sources"
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:px-4 md:py-3.5 rounded-xl transition-all w-full group
                ${activeTab === 'sources' ? `text-${theme.colors.primary}-400 bg-white/5 md:bg-${theme.colors.primary}-900/20 border-t-2 md:border-t-0 border-${theme.colors.primary}-500 md:border-${theme.colors.primary}-500/20` : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-t-2 md:border-t-0 border-transparent'}
                ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}
            >
                <FolderOpen size={20} className="md:w-5 md:h-5" />
                <span className="text-[10px] md:text-sm font-medium">Sources</span>
                {!isSidebarCollapsed && (
                     <span className={`hidden md:block ml-auto text-xs ${activeTab === 'sources' ? `bg-${theme.colors.primary}-500/20 text-${theme.colors.primary}-300` : 'bg-slate-800 text-slate-500'} px-2 py-0.5 rounded-full transition-colors`}>{notebook.sources.length}</span>
                )}
            </button>

            <button 
                onClick={() => setActiveTab('chat')}
                title="Chat"
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:px-4 md:py-3.5 rounded-xl transition-all w-full
                ${activeTab === 'chat' ? `text-${theme.colors.primary}-400 bg-white/5 md:bg-${theme.colors.primary}-900/20 border-t-2 md:border-t-0 border-${theme.colors.primary}-500 md:border-${theme.colors.primary}-500/20` : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-t-2 md:border-t-0 border-transparent'}
                ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}
            >
                <MessageSquare size={20} className="md:w-5 md:h-5" />
                <span className="text-[10px] md:text-sm font-medium">Chat</span>
            </button>

            <button 
                onClick={() => setActiveTab('studio')}
                title="Studio"
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:px-4 md:py-3.5 rounded-xl transition-all w-full
                ${activeTab === 'studio' ? `text-${theme.colors.primary}-400 bg-white/5 md:bg-${theme.colors.primary}-900/20 border-t-2 md:border-t-0 border-${theme.colors.primary}-500 md:border-${theme.colors.primary}-500/20` : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-t-2 md:border-t-0 border-transparent'}
                ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}
            >
                <Layers size={20} className="md:w-5 md:h-5" />
                <span className="text-[10px] md:text-sm font-medium">Studio</span>
            </button>
        </div>

        {/* Theme Selector in Sidebar Footer (Desktop) */}
        <div className="mt-auto p-4 hidden md:block border-t border-white/5 relative">
            <button 
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`w-full flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={isSidebarCollapsed ? "Change Theme" : ""}
            >
                <div className={`p-1.5 rounded-lg bg-${theme.colors.primary}-500/20`}>
                    <Palette size={16} className={`text-${theme.colors.primary}-400`} />
                </div>
                {!isSidebarCollapsed && (
                    <div className="text-left">
                        <span className="text-xs text-slate-500 block">Theme</span>
                        <span className="text-sm font-medium">{theme.name}</span>
                    </div>
                )}
            </button>

            {showThemeMenu && (
                <div className={`absolute bottom-full left-4 mb-3 glass-panel bg-slate-950 border border-white/10 rounded-2xl p-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50 ${isSidebarCollapsed ? 'w-56' : 'right-4'}`}>
                     {Object.values(THEMES).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setThemeId(t.id); setShowThemeMenu(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-colors ${theme.id === t.id ? `bg-${t.colors.primary}-500/20 text-${t.colors.primary}-400` : 'text-slate-400 hover:bg-white/5'}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-br from-${t.colors.primary}-400 to-${t.colors.secondary}-500 shadow-[0_0_8px_currentColor]`}></div>
                          {t.name}
                        </button>
                      ))}
                </div>
            )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col relative overflow-hidden bg-transparent transition-colors duration-700`}>
        
        {/* Global App Header */}
        <header className="flex-none px-4 md:px-8 py-3 md:py-4 flex justify-between md:justify-end items-center backdrop-blur-md border-b border-white/5 bg-black/20 h-16 z-30">
            <Link to="/" className="md:hidden flex items-center gap-2">
                 <NebulaLogo size="sm" />
            </Link>
            
            <div className="flex items-center gap-2 md:gap-4">
                 {/* Mobile Theme Selector */}
                 <div className="md:hidden">
                    <ThemeSelector />
                 </div>

                 <button 
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs md:text-sm font-medium text-slate-300 hover:text-white transition-all border border-white/5"
                 >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share Notebook</span>
                 </button>
            </div>
        </header>

        {/* Tab Content Wrapper */}
        <div className="flex-1 relative overflow-hidden">
            
            {/* Sources Tab Container (Scrollable) */}
            {activeTab === 'sources' && (
                <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8">
                    <div className="max-w-6xl mx-auto">
                        <SourcesTab sources={notebook.sources} onAddSource={addSource} onDeleteSource={deleteSource} />
                    </div>
                </div>
            )}

            {/* Chat Tab Container (Internal Scroll) */}
            {activeTab === 'chat' && (
                <div className="absolute inset-0 pb-20 md:pb-0 p-4 md:p-8">
                    <div className="max-w-4xl mx-auto h-full">
                        <ChatTab notebook={notebook} />
                    </div>
                </div>
            )}

            {/* Studio Tab Container (App-like layout for Lab, Scroll for Audio) */}
            {activeTab === 'studio' && (
                <div className="absolute inset-0 pb-20 md:pb-0 p-4 md:p-8 overflow-hidden">
                    <div className="max-w-6xl mx-auto h-full">
                        <StudioTab notebook={notebook} onUpdate={onUpdate} />
                    </div>
                </div>
            )}
        </div>

        {/* Share Modal */}
        {showShareModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Share2 size={20}/> Share Notebook</h3>
                        <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm">Anyone with the link can view this notebook.</p>
                        <div className="flex items-center gap-2 bg-black/50 p-3 rounded-lg border border-white/10">
                            <span className="text-slate-300 text-sm truncate flex-1">https://nebulamind.ai/notebook/{notebook.id}</span>
                            <button onClick={handleShare} className={`text-${theme.colors.primary}-400 hover:text-${theme.colors.primary}-300 p-2 hover:bg-white/5 rounded-lg transition-colors`}>
                                <Copy size={16} />
                            </button>
                        </div>
                        <button onClick={handleShare} className={`w-full py-3 bg-${theme.colors.primary}-600 hover:bg-${theme.colors.primary}-500 text-white rounded-xl font-bold mt-4 shadow-lg shadow-${theme.colors.primary}-900/20`}>
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default NotebookView;
