
import React, { useState, useRef, useEffect } from 'react';
import { Notebook, Artifact, AudioOverviewDialogue } from '../types';
import { useTheme, useJobs } from '../contexts';
import { Play, Pause, Headphones, Wand2, Mic, FileText, Layout, Zap, Trash2, RefreshCw, Box, FileQuestion, ChevronDown, ChevronUp, Grid2X2, ListOrdered, HelpCircle, RotateCcw, RotateCw, Loader2, PlayCircle } from 'lucide-react';
import LiveSession from './LiveSession';
import AudioOverviewPanel from './AudioOverviewPanel';
import { synthesizeDialogueAudio } from '../services/audioOverview';

interface Props {
  notebook: Notebook;
  onUpdate: (nb: Notebook) => void;
}

const getThemeHex = (colorName: string): string => {
    const colors: Record<string, string> = {
        slate: '#94a3b8', gray: '#9ca3af', zinc: '#a1a1aa', neutral: '#a3a3a3', stone: '#a8a29e',
        red: '#f87171', orange: '#fb923c', amber: '#fbbf24', yellow: '#facc15', lime: '#a3e635',
        green: '#4ade80', emerald: '#34d399', teal: '#2dd4bf', cyan: '#22d3ee', sky: '#38bdf8',
        blue: '#60a5fa', indigo: '#818cf8', violet: '#a78bfa', purple: '#c084fc', fuchsia: '#e879f9',
        pink: '#f472b6', rose: '#fb7185'
    };
    return colors[colorName] || '#60a5fa';
};

const StudioTab: React.FC<Props> = ({ notebook, onUpdate }) => {
  const { theme } = useTheme();
  const { startJob, jobs } = useJobs();
  
  const [activeView, setActiveView] = useState<'audio' | 'live' | 'lab'>('audio');
  
  // Find Audio Overview Artifact
  const audioArtifact = (notebook.artifacts || []).find(a => a.type === 'audioOverview');
  const isGeneratingArtifact = jobs.some(j => j.notebookId === notebook.id && j.type !== 'audioOverview' && j.status === 'processing');

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const [generatingType, setGeneratingType] = useState<Artifact['type'] | null>(null);

  // Parse Audio Artifact Content
  const audioContent = audioArtifact?.content as AudioOverviewDialogue | undefined;
  const audioUrl = audioContent?.audioUrl || (audioArtifact?.content?.audioUrl as string);
  const title = audioArtifact?.title;
  const scriptText = audioContent?.turns 
    ? audioContent.turns.map(t => `${t.speaker}: ${t.text}`).join('\n\n')
    : (audioArtifact?.content?.script as string) || "";
  
  const dims = { canvasSize: 420, artSize: 200 };

  useEffect(() => {
    return () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
  }, []);

  const initAudioContext = () => {
      if (!audioRef.current) return;
      
      if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtx();
      }

      if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 512;
          analyserRef.current.smoothingTimeConstant = 0.8;
      }

      if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
      }
  };

  const drawVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = dims.artSize / 2 + 4; 
      const bars = 100; 
      const step = (Math.PI * 2) / bars;
      const primaryHex = getThemeHex(theme.colors.primary);
      const secondaryHex = getThemeHex(theme.colors.secondary);
      ctx.shadowBlur = 15;
      ctx.shadowColor = primaryHex;

      for (let i = 0; i < bars; i++) {
          const dataIndex = Math.floor(i * (bufferLength / 2) / bars) + 4;
          const value = dataArray[dataIndex] || 0;
          const percent = value / 255;
          const height = Math.pow(percent, 1.5) * 80; 
          const barHeight = Math.max(4, height);
          const angle = i * step - (Math.PI / 2);
          const x1 = centerX + Math.cos(angle) * baseRadius;
          const y1 = centerY + Math.sin(angle) * baseRadius;
          const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
          const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, primaryHex);
          gradient.addColorStop(0.5, secondaryHex);
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3 + (percent * 2);
          ctx.lineCap = 'round';
          ctx.stroke();
      }
      animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  const togglePlay = () => {
      if (!audioRef.current || !audioUrl) return;
      initAudioContext();
      if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
      }
      if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      } else {
          audioRef.current.play();
          setIsPlaying(true);
          drawVisualizer();
      }
  };

  const skip = (seconds: number) => {
      if (audioRef.current) audioRef.current.currentTime += seconds;
  };

  const handleSynthesizeAudio = async () => {
    if (!audioContent || isSynthesizing) return;
    setIsSynthesizing(true);
    try {
        const url = await synthesizeDialogueAudio(audioContent);
        // Update artifact with audioUrl
        const updatedArtifact: Artifact = {
            ...audioArtifact!,
            content: {
                ...audioContent,
                audioUrl: url
            }
        };
        handleSaveArtifact(updatedArtifact);
    } catch (e) {
        console.error("Synthesis failed", e);
        alert("Failed to synthesize audio. Please try again.");
    } finally {
        setIsSynthesizing(false);
    }
  };

  const handleGenerateArtifact = async (type: Artifact['type']) => {
      if ((notebook.sources || []).length === 0) return;
      setGeneratingType(type);
      await startJob(notebook.id, type, notebook.sources);
      setGeneratingType(null);
  };

  const handleDeleteArtifact = (id: string) => {
      const updated = {
          ...notebook,
          artifacts: (notebook.artifacts || []).filter(a => a.id !== id)
      };
      onUpdate(updated);
  };
  
  const handleSaveArtifact = (artifact: Artifact) => {
      const updated = {
          ...notebook,
          artifacts: [artifact, ...(notebook.artifacts || [])].filter((a, i, self) => i === self.findIndex((t) => t.id === a.id)),
          updatedAt: Date.now()
      };
      onUpdate(updated);
  };

  const openArtifactViewer = (artifact: Artifact) => {
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<pre>${JSON.stringify(artifact.content, null, 2)}</pre>`);
  };

  const getArtifactIcon = (type: Artifact['type']) => {
      switch(type) {
          case 'flashcards': return <RefreshCw size={18} />;
          case 'quiz': return <FileQuestion size={18} />;
          case 'infographic': return <Layout size={18} />;
          case 'slideDeck': return <Box size={18} />;
          case 'executiveBrief': return <FileText size={18} />;
          case 'swotAnalysis': return <Grid2X2 size={18} />;
          case 'projectRoadmap': return <ListOrdered size={18} />;
          case 'faqGuide': return <HelpCircle size={18} />;
          default: return <Zap size={18} />;
      }
  };

  const renderScript = () => {
      if (!scriptText) return null;
      return scriptText.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
          const isJoe = line.startsWith('Joe:') || line.startsWith('Atlas:');
          const isJane = line.startsWith('Jane:') || line.startsWith('Nova:');
          const speaker = isJoe ? (line.startsWith('Joe:') ? 'Joe' : 'Atlas') : isJane ? (line.startsWith('Jane:') ? 'Jane' : 'Nova') : '';
          const text = speaker ? line.replace(`${speaker}:`, '').trim() : line;
          
          return (
              <div 
                key={idx} 
                className={`mb-4 p-4 rounded-xl border border-white/5 transition-colors duration-500
                ${isJoe ? `bg-${theme.colors.primary}-900/20 border-${theme.colors.primary}-500/20` : 
                  isJane ? `bg-${theme.colors.secondary}-900/20 border-${theme.colors.secondary}-500/20` : 'bg-white/5'}`}
              >
                  {speaker && (
                      <div className={`text-xs font-bold uppercase mb-1 flex items-center gap-2 ${isJoe ? `text-${theme.colors.primary}-400` : `text-${theme.colors.secondary}-400`}`}>
                          {isJoe ? <Mic size={12} /> : <Headphones size={12} />}
                          {speaker}
                      </div>
                  )}
                  <p className="text-slate-200 text-sm leading-relaxed">{text}</p>
              </div>
          );
      });
  };

  return (
    <div className="flex flex-col h-full gap-6">
        <div className="flex items-center justify-center p-1 bg-white/5 rounded-2xl self-center border border-white/5 shadow-inner">
            <button 
                onClick={() => setActiveView('audio')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'audio' ? `bg-${theme.colors.primary}-600 text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}
            >
                <Headphones size={16} /> Audio Overview
            </button>
            <button 
                onClick={() => setActiveView('live')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'live' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <Mic size={16} /> Live Session
            </button>
            <button 
                onClick={() => setActiveView('lab')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'lab' ? `bg-${theme.colors.secondary}-600 text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}
            >
                <Wand2 size={16} /> Knowledge Lab
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            {activeView === 'live' && (
                <div className="max-w-3xl mx-auto h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4">
                    <LiveSession notebook={notebook} />
                </div>
            )}

            {activeView === 'audio' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 h-full">
                    {audioArtifact ? (
                        <div className="flex flex-col items-center justify-center relative min-h-[450px] p-8 glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            {/* IF AUDIO EXISTS: SHOW PLAYER */}
                            {audioUrl ? (
                                <>
                                    <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-[350px] p-6 overflow-hidden">
                                        <audio 
                                            ref={audioRef} 
                                            src={audioUrl} 
                                            onEnded={() => setIsPlaying(false)} 
                                            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                            crossOrigin="anonymous" 
                                        />
                                        <div className="relative flex items-center justify-center shrink-0 mb-8" style={{ width: dims.canvasSize, height: dims.canvasSize }}>
                                            <canvas ref={canvasRef} width={dims.canvasSize} height={dims.canvasSize} className="absolute inset-0 z-10 pointer-events-none" />
                                            <div className={`relative rounded-full overflow-hidden z-20 shadow-[0_0_50px_rgba(0,0,0,0.6)] border-2 border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ width: dims.artSize, height: dims.artSize }}>
                                                <div className={`w-full h-full bg-gradient-to-br from-${theme.colors.primary}-900 to-slate-900 flex items-center justify-center`}><Headphones size={48} className={`text-${theme.colors.primary}-400 opacity-50`} /></div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-center z-20 px-4 w-full max-w-md mx-auto flex flex-col gap-1.5 mb-8">
                                            <h2 className="text-xl md:text-3xl font-bold text-white leading-snug drop-shadow-xl line-clamp-2 text-balance">{title || "Audio Overview"}</h2>
                                        </div>

                                        <div className="w-full max-w-lg z-30 space-y-6">
                                            <div className="flex items-center justify-center gap-10">
                                                <button onClick={() => skip(-10)} className="group relative p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all hover:scale-110 active:scale-95"><RotateCcw size={20} className="text-slate-300 group-hover:text-white" /></button>
                                                <button onClick={togglePlay} className={`group relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95`}>
                                                    {isPlaying ? <Pause fill="white" size={28} className="text-white relative z-10" /> : <Play fill="white" size={28} className="text-white ml-1 relative z-10" />}
                                                </button>
                                                <button onClick={() => skip(10)} className="group relative p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all hover:scale-110 active:scale-95"><RotateCw size={20} className="text-slate-300 group-hover:text-white" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* NO AUDIO URL - SHOW SYNTHESIZE OPTION */
                                <div className="flex flex-col items-center justify-center text-center p-12 space-y-6">
                                    <div className={`w-20 h-20 rounded-full bg-${theme.colors.primary}-900/30 flex items-center justify-center border border-${theme.colors.primary}-500/30`}>
                                        <FileText size={40} className={`text-${theme.colors.primary}-400`} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Script Ready</h2>
                                        <p className="text-slate-400 max-w-md mt-2">The dialogue script has been generated. Generate the audio to listen to the conversation.</p>
                                    </div>
                                    <button 
                                        onClick={handleSynthesizeAudio}
                                        disabled={isSynthesizing}
                                        className={`px-8 py-4 bg-gradient-to-r from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600 hover:from-${theme.colors.primary}-500 hover:to-${theme.colors.secondary}-500 text-white rounded-xl font-bold shadow-lg flex items-center gap-3 transition-all hover:scale-105 disabled:opacity-50`}
                                    >
                                        {isSynthesizing ? <Loader2 className="animate-spin" /> : <PlayCircle />}
                                        {isSynthesizing ? 'Synthesizing Voices...' : 'Generate Audio Now'}
                                    </button>
                                </div>
                            )}

                            <div className="mt-8 flex flex-col items-center gap-4 relative z-20 w-full border-t border-white/5 pt-6">
                                <div className="flex gap-4">
                                    <button onClick={() => handleDeleteArtifact(audioArtifact.id)} className="px-5 py-2.5 bg-white/5 hover:bg-rose-500/20 rounded-full text-xs font-bold text-rose-400 flex items-center gap-2 border border-white/10 transition-colors">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                                {scriptText && (
                                    <div className="w-full max-w-2xl mt-4">
                                        <button onClick={() => setShowTranscript(!showTranscript)} className="mx-auto flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider mb-2">
                                            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                                            {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        {showTranscript && <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-left max-h-[400px] overflow-y-auto custom-scrollbar">{renderScript()}</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <AudioOverviewPanel notebook={notebook} onSaveArtifact={handleSaveArtifact} />
                    )}
                </div>
            )}

            {activeView === 'lab' && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { id: 'flashcards', label: 'Flashcards', icon: RefreshCw },
                            { id: 'quiz', label: 'Practice Quiz', icon: FileQuestion },
                            { id: 'infographic', label: 'Infographic', icon: Layout },
                            { id: 'slideDeck', label: 'Slide Deck', icon: Box },
                            { id: 'executiveBrief', label: 'Exec Brief', icon: FileText },
                            { id: 'swotAnalysis', label: 'SWOT Analysis', icon: Grid2X2 },
                            { id: 'projectRoadmap', label: 'Project Roadmap', icon: ListOrdered },
                            { id: 'faqGuide', label: 'FAQ Guide', icon: HelpCircle }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleGenerateArtifact(item.id as Artifact['type'])}
                                disabled={isGeneratingArtifact}
                                className={`p-4 glass-panel rounded-xl flex flex-col items-center gap-3 border border-white/5 hover:bg-white/5 transition-all group ${generatingType === item.id ? 'opacity-50' : ''}`}
                            >
                                <div className={`p-3 rounded-full bg-${theme.colors.primary}-500/10 text-${theme.colors.primary}-400 group-hover:scale-110 transition-transform`}>
                                    <item.icon size={24} />
                                </div>
                                <span className="text-sm font-bold text-slate-300">{item.label}</span>
                            </button>
                        ))}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(notebook.artifacts || []).filter(a => a.type !== 'audioOverview').map((artifact) => (
                            <div key={artifact.id} className="glass-panel p-5 rounded-xl border border-white/5 flex items-start gap-4 group">
                                <div className={`p-3 rounded-lg bg-slate-800 text-${theme.colors.primary}-400`}>
                                    {getArtifactIcon(artifact.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-200 truncate">{artifact.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 capitalize">{artifact.status} • {new Date(artifact.createdAt).toLocaleDateString()}</p>
                                    {artifact.status === 'completed' && (
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => openArtifactViewer(artifact)} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white transition-colors">{artifact.type === 'slideDeck' ? 'Present' : 'View'}</button>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => handleDeleteArtifact(artifact.id)} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default StudioTab;
