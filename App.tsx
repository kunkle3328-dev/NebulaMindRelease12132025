
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Notebook, Notification, BackgroundJob, Artifact } from './types';
import { getNotebooks, createNotebook, getNotebookById, saveNotebook } from './services/storage';
import { THEMES, ThemeId } from './constants';
import { Plus, MoreVertical, Check, Zap, X } from 'lucide-react';
import NotebookView from './components/NotebookView';
import SplashScreen from './components/SplashScreen';
import { generateArtifact, generateAudioOverview } from './services/ai';
import { ThemeContext, useTheme, JobContext, useJobs } from './contexts';
import { NebulaLogo, ThemeSelector } from './components/ThemeUI';

// --- ROBUST CSS ANIMATIONS ---
const GlobalBackground: React.FC = () => {
    const { theme, animationsEnabled } = useTheme();

    // Completely memoized particles to prevent re-render flickers/resets
    const particles = useMemo(() => {
        const createParticles = (count: number, durationBase: number, durationVar: number) => {
            return Array.from({ length: count }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                top: Math.random() * 100,
                size: Math.random() * 2 + 1,
                delay: Math.random() * 5,
                duration: durationBase + Math.random() * durationVar,
                opacity: Math.random() * 0.5 + 0.3
            }));
        };

        return {
            snow: createParticles(60, 5, 5),
            stars: createParticles(20, 3, 3), // Shooting stars
            staticStars: createParticles(50, 4, 4), // Twinkling stars
            embers: createParticles(30, 4, 3), // Rising embers
            bubbles: createParticles(40, 6, 4), // Sharp bubbles for Lux
            lasers: createParticles(15, 3, 2), // Lasers for Midnight Azure
        };
    }, []);

    // NOTE: Using z-0 instead of -z-10 ensures the background sits on top of the 
    // body's default background but behind the app content (which is z-10).
    return (
        <div className={`fixed inset-0 z-0 overflow-hidden transition-colors duration-1000 ${theme.colors.background} pointer-events-none`}>
            {/* Theme Layers */}
            {animationsEnabled && (
                <>
                    {/* 1. NEBULA MIND (Galaxy Stars + Blobs) */}
                    {theme.id === 'nebula_mind' && (
                        <>
                            <div className="absolute top-0 left-0 w-[80vw] h-[80vw] bg-purple-900/30 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]"></div>
                            <div className="absolute bottom-0 right-0 w-[60vw] h-[60vw] bg-pink-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8s]"></div>
                            {particles.staticStars.map((s) => (
                                <div 
                                    key={s.id} 
                                    className="star-static" 
                                    style={{ 
                                        top: `${s.top}%`, 
                                        left: `${s.left}%`, 
                                        width: `${s.size}px`, 
                                        height: `${s.size}px`, 
                                        animation: `twinkle ${s.duration}s infinite ease-in-out`,
                                        animationDelay: `${s.delay}s` 
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 2. NEON NEBULA (Cyber Grid + Shooting Stars) */}
                    {theme.id === 'neon' && (
                        <>
                            <div className="grid-background"></div>
                            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
                            {particles.stars.map((s) => (
                                <div 
                                    key={s.id} 
                                    className="shooting-star" 
                                    style={{ 
                                        top: `${s.top}%`, 
                                        left: `${s.left}%`, 
                                        animation: `shooting ${s.duration}s linear infinite`, 
                                        animationDelay: `${s.delay}s` 
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 3. ARCTIC FROST (Snow + Aurora) */}
                    {theme.id === 'arctic' && (
                        <>
                            <div className="absolute top-0 w-full h-[60vh] bg-gradient-to-b from-teal-900/30 via-sky-900/10 to-transparent blur-3xl opacity-50"></div>
                            {particles.snow.map((s) => (
                                <div 
                                    key={s.id} 
                                    className="snow" 
                                    style={{ 
                                        left: `${s.left}%`, 
                                        width: `${s.size}px`, 
                                        height: `${s.size}px`, 
                                        animation: `fall ${s.duration}s linear infinite`, 
                                        animationDelay: `${s.delay}s`
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 4. CYBERPUNK (Scanlines) */}
                    {theme.id === 'cyberpunk' && (
                        <>
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px]"></div>
                            <div className="scanline"></div>
                        </>
                    )}

                    {/* 5. CRIMSON (Embers) */}
                    {theme.id === 'crimson' && (
                        <>
                            <div className="absolute bottom-0 w-full h-[50vh] bg-gradient-to-t from-red-900/30 to-transparent blur-3xl"></div>
                            {particles.embers.map((s) => (
                                <div 
                                    key={s.id} 
                                    className="ember" 
                                    style={{ 
                                        left: `${s.left}%`, 
                                        width: `${s.size + 1}px`, 
                                        height: `${s.size + 1}px`, 
                                        animation: `rise ${s.duration}s linear infinite`, 
                                        animationDelay: `${s.delay}s` 
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 6. QUANTUM (Atom Rings) */}
                    {theme.id === 'quantum' && (
                        <>
                            <div className="atom-ring w-[60vh] h-[60vh]" style={{ animation: 'spin-slow 20s linear infinite' }}></div>
                            <div className="atom-ring w-[40vh] h-[40vh] border-fuchsia-500/30" style={{ animation: 'spin-reverse 15s linear infinite' }}></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[2px] shadow-[0_0_100px_10px_rgba(139,92,246,0.5)]"></div>
                        </>
                    )}
                    
                    {/* 7. OBSIDIAN GOLD (Rising Gold Dust) */}
                    {theme.id === 'obsidian' && (
                        <>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[60vw] h-[60vw] rounded-full blur-[150px] bg-amber-900/10" style={{ animation: 'pulse-glow 8s ease-in-out infinite' }}></div>
                            </div>
                            {particles.embers.map((s) => (
                                <div 
                                    key={s.id} 
                                    className="rounded-full bg-amber-400/50 blur-[1px]" 
                                    style={{ 
                                        position: 'absolute',
                                        left: `${s.left}%`, 
                                        width: `${s.size}px`, 
                                        height: `${s.size}px`, 
                                        opacity: 0, /* Start hidden */
                                        animation: `rise ${s.duration * 1.5}s linear infinite`, 
                                        animationDelay: `${s.delay}s` 
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 8. LUX MIDNIGHT (FIXED: Sharp Champagne Bubbles) */}
                    {theme.id === 'lux' && (
                        <>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[60vw] h-[60vw] rounded-full blur-[150px] bg-violet-900/20" style={{ animation: 'pulse-glow 8s ease-in-out infinite' }}></div>
                            </div>
                            {/* Sharper, small bubbles instead of large blurry bokeh */}
                            {particles.bubbles.map((s, i) => (
                                <div 
                                    key={s.id} 
                                    className={`rounded-full border border-white/20 ${i % 2 === 0 ? 'bg-violet-400/20' : 'bg-amber-300/20'}`}
                                    style={{ 
                                        position: 'absolute',
                                        left: `${s.left}%`, 
                                        width: `${s.size * 2 + 2}px`, 
                                        height: `${s.size * 2 + 2}px`, 
                                        opacity: 0, /* Start hidden */
                                        animation: `bubble-rise ${s.duration * 1.5}s ease-in-out infinite`, 
                                        animationDelay: `${s.delay}s`,
                                        boxShadow: `0 0 5px ${i % 2 === 0 ? 'rgba(167, 139, 250, 0.3)' : 'rgba(252, 211, 77, 0.3)'}`
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 9. MIDNIGHT AZURE (NEW: Vertical Lasers + Plasma Fog) */}
                    {theme.id === 'midnight_azure' && (
                        <>
                            {/* Background Fog */}
                            <div className="plasma-fog w-[50vw] h-[50vw] top-1/4 left-1/4"></div>
                            <div className="plasma-fog w-[40vw] h-[40vw] bottom-1/4 right-1/4" style={{ animationDelay: '2s' }}></div>
                            
                            {/* Falling Blue Lasers */}
                            {particles.lasers.map((s, i) => (
                                <div 
                                    key={s.id} 
                                    className="laser"
                                    style={{ 
                                        left: `${s.left}%`, 
                                        opacity: 0,
                                        animation: `laser-beam ${s.duration}s ease-in infinite`, 
                                        animationDelay: `${s.delay}s` 
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* 10. GILDED (Just Glow) */}
                    {theme.id === 'gilded' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[60vw] h-[60vw] rounded-full blur-[150px] bg-emerald-900/20" style={{ animation: 'pulse-glow 8s ease-in-out infinite' }}></div>
                        </div>
                    )}

                    {/* 11. ONYX ELITE (Stealth Geometry) */}
                    {theme.id === 'onyx_elite' && (
                        <>
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] opacity-20"></div>
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#000000_100%)]"></div>
                             {/* Floating geometric shapes using Tailwind arbitrary values for animation duration */}
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-white/5 rounded-full animate-[spin_60s_linear_infinite]"></div>
                             <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] border border-white/5 rounded-full animate-[spin_80s_linear_infinite_reverse]"></div>
                             {/* Vertical scanners */}
                             <div className="absolute top-0 left-1/3 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent animate-[scan_10s_linear_infinite]"></div>
                             <div className="absolute top-0 right-1/3 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent animate-[scan_15s_linear_infinite]"></div>
                        </>
                    )}

                    {/* 12. CELESTIAL AURORA (Fluid Light) */}
                    {theme.id === 'celestial_aurora' && (
                        <>
                             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900 to-black"></div>
                             <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-teal-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]"></div>
                             <div className="absolute bottom-[10%] right-[10%] w-[60vw] h-[60vw] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[15s]"></div>
                             <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-[12s]"></div>
                             
                             {/* Stardust */}
                             {particles.staticStars.map((s) => (
                                <div 
                                    key={s.id} 
                                    className="star-static" 
                                    style={{ 
                                        top: `${s.top}%`, 
                                        left: `${s.left}%`, 
                                        width: `${s.size}px`, 
                                        height: `${s.size}px`, 
                                        animation: `twinkle ${s.duration}s infinite ease-in-out`,
                                        animationDelay: `${s.delay}s` 
                                    }} 
                                />
                            ))}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// 1. Dashboard Component
const Dashboard: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    setNotebooks(getNotebooks());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const nb = createNotebook(newTitle);
    navigate(`/notebook/${nb.id}`);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 relative z-10`}>
      <header className="flex justify-between items-center mb-10 md:mb-16 relative z-50">
        <NebulaLogo size="lg" />
        <ThemeSelector />
      </header>

      <div className="max-w-6xl mx-auto relative z-10 pb-20">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-xl text-slate-300 font-light tracking-wide">Your Research Space</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* New Notebook Card */}
          <button 
            onClick={() => { setShowCreateModal(true); setNewTitle(''); }}
            className={`group relative h-72 p-6 glass-panel rounded-3xl hover:border-${theme.colors.primary}-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 bg-${theme.colors.primary}-900/5 hover:bg-${theme.colors.primary}-900/10 border-dashed border-white/20`}
            style={theme.id === 'nebula_mind' ? { boxShadow: 'var(--nm-shadow)' } : {}}
          >
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-${theme.colors.primary}-500 to-${theme.colors.secondary}-600 flex items-center justify-center shadow-2xl shadow-${theme.colors.primary}-500/30 group-hover:scale-110 transition-transform duration-500`}>
                <Plus size={32} className="text-white" />
            </div>
            <span className="font-semibold text-lg text-slate-300 group-hover:text-white transition-colors">Create Notebook</span>
          </button>

          {notebooks.map((nb, i) => (
              <Link key={nb.id} to={`/notebook/${nb.id}`}>
                <div className={`group relative h-72 rounded-3xl hover:border-${theme.colors.primary}-500/50 transition-all cursor-pointer flex flex-col justify-between overflow-hidden hover:shadow-2xl hover:shadow-${theme.colors.primary}-900/20 hover:-translate-y-1 duration-300 border border-white/10 bg-slate-900/50`}>
                  
                  {/* Premium "Book Cover" Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-${theme.colors.primary}-900/20 to-slate-900 z-0`}></div>
                  
                  {/* Top Decoration */}
                  <div className="relative z-10 p-6 flex justify-between items-start">
                     <div className={`w-12 h-16 rounded-sm bg-gradient-to-b from-${theme.colors.primary}-500 to-${theme.colors.secondary}-600 shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                     <div className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <MoreVertical size={20} />
                     </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="relative z-10 p-6 pt-0">
                    <h3 className={`text-2xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-${theme.colors.primary}-300 transition-colors`}>{nb.title}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mb-4">
                        <span className={`w-2 h-2 rounded-full bg-${theme.colors.secondary}-500`}></span>
                        {nb.sources.length} sources
                    </p>
                    
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                           {new Date(nb.updatedAt).toLocaleDateString()}
                        </span>
                        {nb.artifacts.length > 0 && (
                            <div className="flex -space-x-2">
                                {nb.artifacts.slice(0,3).map((a, idx) => (
                                    <div key={idx} className={`w-6 h-6 rounded-full bg-${theme.colors.primary}-900 border border-slate-800 flex items-center justify-center text-[8px] text-white`}>
                                        <Zap size={10} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className={`glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95`}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">New Notebook</h3>
                      <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleCreate}>
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Title</label>
                      <input 
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Advanced Physics Research"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-${theme.colors.primary}-500 focus:border-${theme.colors.primary}-500 transition-all mb-6`}
                      />
                      <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-slate-300 text-sm font-medium">Cancel</button>
                          <button 
                            type="submit" 
                            disabled={!newTitle.trim()}
                            className={`px-6 py-2 bg-${theme.colors.primary}-600 hover:bg-${theme.colors.primary}-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-${theme.colors.primary}-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                          >
                              Create Notebook
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

// 2. Notebook Container
const NotebookContainer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [notebook, setNotebook] = useState<Notebook | undefined>(undefined);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { jobs } = useJobs();

  useEffect(() => {
    if (id) {
      const nb = getNotebookById(id);
      if (nb) {
        setNotebook(nb);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate, jobs]);

  const handleUpdate = (updated: Notebook) => {
    setNotebook(updated);
    saveNotebook(updated);
  };

  if (!notebook) return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 relative z-10`}>
          <div className={`w-12 h-12 border-4 border-${theme.colors.primary}-500 border-t-transparent rounded-full animate-spin`}></div>
          <span className={`text-${theme.colors.primary}-500 font-medium animate-pulse`}>Loading Nebula...</span>
      </div>
  );

  return <NotebookView notebook={notebook} onUpdate={handleUpdate} />;
};

const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [jobs, setJobs] = useState<BackgroundJob[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((title: string, message: string, type: 'success' | 'error' | 'info') => {
        const id = crypto.randomUUID();
        setNotifications(prev => [...prev, { id, title, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const startJob = async (notebookId: string, type: Artifact['type'], sources: any[], config?: any) => {
        const jobId = crypto.randomUUID();
        const placeholderId = crypto.randomUUID();
        
        // Notify user that request is received
        addNotification(
            "Generation Started", 
            `Creating your ${type === 'audioOverview' ? 'Audio Overview' : type === 'executiveBrief' ? 'Brief' : type}...`, 
            'info'
        );
        
        const notebook = getNotebookById(notebookId);
        if (notebook) {
            const placeholder: Artifact = {
                id: placeholderId,
                type,
                title: `${type === 'audioOverview' ? 'Podcast' : type === 'executiveBrief' ? 'Executive Brief' : type} (Generating...)`,
                content: {},
                createdAt: Date.now(),
                status: 'generating'
            };
            notebook.artifacts.unshift(placeholder);
            saveNotebook(notebook);
        }

        const newJob: BackgroundJob = {
            id: jobId,
            notebookId,
            type,
            status: 'processing',
            progress: 'Starting...'
        };
        setJobs(prev => [...prev, newJob]);

        setTimeout(async () => {
            try {
                let content;
                if (type === 'audioOverview') {
                    // Pass the config params (length, style, voices) to the service
                    content = await generateAudioOverview(
                        sources, 
                        config?.length, 
                        config?.style, 
                        config?.voices, 
                        (progressMsg) => {
                            // Update job progress state for UI spinners
                            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: progressMsg } : j));
                        },
                        config?.learningIntent
                    );
                } else {
                    content = await generateArtifact(type, sources);
                }

                const nb = getNotebookById(notebookId);
                if (nb) {
                    const idx = nb.artifacts.findIndex(a => a.id === placeholderId);
                    if (idx !== -1) {
                        nb.artifacts[idx] = {
                            ...nb.artifacts[idx],
                            title: `${type === 'audioOverview' ? content.title || 'Podcast' : type === 'executiveBrief' ? 'Executive Brief' : type} - ${new Date().toLocaleTimeString()}`,
                            content,
                            status: 'completed'
                        };
                        saveNotebook(nb);
                    }
                }

                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'completed' } : j));
                addNotification(
                    "Generation Complete", 
                    `Your ${type === 'audioOverview' ? 'Audio Overview' : type} is ready to view.`, 
                    'success'
                );

            } catch (error: any) {
                console.error(error);
                 const nb = getNotebookById(notebookId);
                 if (nb) {
                     const idx = nb.artifacts.findIndex(a => a.id === placeholderId);
                     if (idx !== -1) {
                         nb.artifacts[idx].status = 'failed';
                         saveNotebook(nb);
                     }
                 }
                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed' } : j));
                
                // Enhanced Error Message
                const errorMsg = error.message || "An unexpected error occurred.";
                addNotification("Generation Failed", errorMsg, 'error');
            }
        }, 0);
    };

    return (
        <JobContext.Provider value={{ startJob, jobs, notifications, dismissNotification }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
                {notifications.map(n => (
                    <div key={n.id} className={`glass-panel p-4 rounded-xl border-l-4 shadow-2xl flex items-start gap-3 w-80 animate-in slide-in-from-right-full duration-300 ${n.type === 'success' ? 'border-green-500' : n.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}>
                        <div className={`mt-0.5 ${n.type === 'success' ? 'text-green-400' : n.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                            {n.type === 'success' ? <Check size={18} /> : n.type === 'error' ? <Zap size={18} /> : <Zap size={18} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white">{n.title}</h4>
                            <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                        </div>
                        <button onClick={() => dismissNotification(n.id)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                    </div>
                ))}
            </div>
        </JobContext.Provider>
    );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>('onyx_elite'); // Set new default theme
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  if (showSplash) {
      return (
        <ThemeContext.Provider value={{ theme: THEMES[activeThemeId], setThemeId: setActiveThemeId, animationsEnabled, setAnimationsEnabled }}>
            <SplashScreen onComplete={() => setShowSplash(false)} />
        </ThemeContext.Provider>
      );
  }

  return (
    <ThemeContext.Provider value={{ theme: THEMES[activeThemeId], setThemeId: setActiveThemeId, animationsEnabled, setAnimationsEnabled }}>
      <GlobalBackground />
      <JobProvider>
        <HashRouter>
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notebook/:id" element={<NotebookContainer />} />
            </Routes>
        </HashRouter>
      </JobProvider>
    </ThemeContext.Provider>
  );
};

export default App;
