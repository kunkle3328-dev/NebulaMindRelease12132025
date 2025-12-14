
import React, { useState } from 'react';
import { Notebook, Artifact, AudioOverviewDialogue } from '../types';
import { generateAudioOverviewDialogue } from '../services/audioOverview';
import { RefreshCw, Save, Copy, CheckCircle, AlertCircle, Sparkles, Mic2, Clock } from 'lucide-react';
import { useTheme } from '../contexts';

interface Props {
  notebook: Notebook;
  onSaveArtifact: (artifact: Artifact) => void;
}

const AudioOverviewPanel: React.FC<Props> = ({ notebook, onSaveArtifact }) => {
  const { theme } = useTheme();
  
  // Config State
  const [topic, setTopic] = useState(notebook.title);
  const [duration, setDuration] = useState<"short" | "medium" | "long">("medium");
  
  // Generation State
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AudioOverviewDialogue | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setStatus('generating');
    setError('');
    setProgressStep('Initializing...');

    try {
      const dialogue = await generateAudioOverviewDialogue(
        notebook, 
        topic, 
        duration, 
        (step) => setProgressStep(step)
      );
      setResult(dialogue);
      setStatus('completed');
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate dialogue.");
      setStatus('error');
    }
  };

  const handleSave = () => {
    if (!result) return;
    const artifact: Artifact = {
      id: crypto.randomUUID(),
      type: 'audioOverview',
      title: result.title,
      content: result,
      createdAt: Date.now(),
      status: 'completed'
    };
    onSaveArtifact(artifact);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    alert("Script JSON copied.");
  };

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* 1. Configuration Section */}
      {status === 'idle' || status === 'generating' || status === 'error' ? (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in">
           <div className="w-full max-w-lg space-y-8">
              <div className="text-center space-y-2">
                 <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-${theme.colors.primary}-500 to-${theme.colors.secondary}-600 flex items-center justify-center shadow-lg shadow-${theme.colors.primary}-500/20 mb-6`}>
                    <Mic2 size={32} className="text-white" />
                 </div>
                 <h2 className="text-3xl font-bold text-white">Audio Overview Director</h2>
                 <p className="text-slate-400">Generate a NotebookLM-quality conversation script between two AI hosts based on your sources.</p>
              </div>

              <div className="glass-panel p-6 rounded-2xl space-y-6 border border-white/10">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Episode Topic</label>
                    <input 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      placeholder="e.g. Key takeaways from the Q3 report"
                      disabled={status === 'generating'}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</label>
                    <div className="grid grid-cols-3 gap-2">
                       {(['short', 'medium', 'long'] as const).map(d => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            disabled={status === 'generating'}
                            className={`py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${duration === d ? `bg-${theme.colors.primary}-600 text-white shadow` : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                          >
                            {d}
                          </button>
                       ))}
                    </div>
                 </div>

                 {status === 'error' && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg flex items-center gap-2">
                       <AlertCircle size={16} />
                       {error}
                    </div>
                 )}

                 <button
                    onClick={handleGenerate}
                    disabled={status === 'generating' || !topic.trim()}
                    className={`w-full py-4 bg-gradient-to-r from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600 text-white rounded-xl font-bold shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                 >
                    {status === 'generating' ? (
                       <>
                         <RefreshCw className="animate-spin" size={20} />
                         <span>{progressStep}</span>
                       </>
                    ) : (
                       <>
                         <Sparkles size={20} />
                         <span>Generate Script</span>
                       </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      ) : (
        /* 2. Results Section */
        <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom-4">
           {/* Header */}
           <div className="flex items-center justify-between p-1 pb-4 border-b border-white/5 shrink-0">
              <div>
                 <h2 className="text-xl font-bold text-white">{result?.title}</h2>
                 <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-green-500`}></span>
                    Script Generated • {result?.turns.length} Turns
                 </p>
              </div>
              <div className="flex gap-2">
                 <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Copy JSON">
                    <Copy size={18} />
                 </button>
                 <button onClick={handleSave} className={`px-4 py-2 bg-${theme.colors.primary}-600 hover:bg-${theme.colors.primary}-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors`}>
                    <Save size={16} /> Save to Notebook
                 </button>
                 <button onClick={() => setStatus('idle')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition-colors">
                    New
                 </button>
              </div>
           </div>

           {/* Script Viewer */}
           <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Cold Open */}
              <div className="glass-panel p-6 rounded-xl border-l-4 border-purple-500 bg-purple-900/10">
                 <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 block">Cold Open</span>
                 <p className="text-slate-200 italic font-medium leading-relaxed">"{result?.coldOpen}"</p>
              </div>

              {/* Turns */}
              <div className="space-y-4">
                 {result?.turns.map((turn, idx) => (
                    <div key={idx} className={`flex gap-4 ${turn.speaker === 'Atlas' ? 'flex-row-reverse' : ''}`}>
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow-lg ${turn.speaker === 'Nova' ? 'bg-indigo-600 border-indigo-400' : 'bg-teal-600 border-teal-400'}`}>
                          <span className="text-white font-bold text-xs">{turn.speaker[0]}</span>
                       </div>
                       <div className={`flex-1 max-w-[80%] ${turn.speaker === 'Atlas' ? 'items-end text-right' : 'items-start'}`}>
                          <div className={`p-4 rounded-2xl border ${turn.speaker === 'Atlas' ? 'bg-teal-900/20 border-teal-500/20 rounded-tr-sm' : 'bg-indigo-900/20 border-indigo-500/20 rounded-tl-sm'}`}>
                             <p className="text-slate-200 leading-relaxed">{turn.text}</p>
                          </div>
                          
                          {/* Metadata line */}
                          <div className={`flex items-center gap-3 mt-2 text-[10px] text-slate-500 ${turn.speaker === 'Atlas' ? 'justify-end' : 'justify-start'}`}>
                             <span className="flex items-center gap-1"><Clock size={10} /> Pause: {turn.pauseMsAfter}ms</span>
                             {turn.citations.length > 0 && (
                                <div className="flex gap-1">
                                   {turn.citations.map((c, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 border border-slate-700">
                                         Src: {notebook.sources.find(s => s.id === c.sourceId)?.title.slice(0, 10)}...
                                      </span>
                                   ))}
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AudioOverviewPanel;
