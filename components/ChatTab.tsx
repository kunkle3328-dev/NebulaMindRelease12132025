
import React, { useState, useRef, useEffect } from 'react';
import { Notebook, ChatMessage } from '../types';
import { generateAnswer, speakText } from '../services/ai';
import { Send, Sparkles, User, ExternalLink, Volume2, Loader2, StopCircle, Share2, Copy } from 'lucide-react';
import { useTheme } from '../contexts';

interface Props {
  notebook: Notebook;
}

const ChatTab: React.FC<Props> = ({ notebook }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'welcome',
        role: 'model',
        text: `Hi! I'm ready to answer questions based on the ${notebook.sources.length} sources in this notebook. What would you like to know?`,
        citations: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // TTS State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { theme } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: input
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const modelMsgId = crypto.randomUUID();
    const modelMsg: ChatMessage = {
        id: modelMsgId,
        role: 'model',
        text: '',
        isStreaming: true
    };
    setMessages(prev => [...prev, modelMsg]);

    let fullResponse = '';
    let accumulatedGrounding: any = undefined;
    
    await generateAnswer(userMsg.text, notebook.sources, (chunk, grounding) => {
        fullResponse += chunk;
        if (grounding) {
            accumulatedGrounding = grounding;
        }
        setMessages(prev => prev.map(m => 
            m.id === modelMsgId ? { ...m, text: fullResponse, groundingMetadata: accumulatedGrounding } : m
        ));
    });

    setMessages(prev => prev.map(m => 
        m.id === modelMsgId ? { ...m, isStreaming: false } : m
    ));
    setLoading(false);
  };

  const handleSpeak = async (msg: ChatMessage) => {
    if (playingId === msg.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
    }

    if (ttsLoadingId) return; // Prevent multiple requests

    try {
        setTtsLoadingId(msg.id);
        const audioUrl = await speakText(msg.text);
        
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setPlayingId(msg.id);
            
            audioRef.current.onended = () => {
                setPlayingId(null);
            };
        }
    } catch (e) {
        console.error("TTS Error", e);
    } finally {
        setTtsLoadingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <audio ref={audioRef} className="hidden" />
      <div className="flex-1 overflow-y-auto space-y-8 pb-4">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${theme.colors.primary}-500 to-${theme.colors.secondary}-600 flex items-center justify-center shrink-0 shadow-lg shadow-${theme.colors.primary}-500/20`}>
                        <Sparkles size={18} className="text-white" />
                    </div>
                )}
                
                <div className={`max-w-[85%] md:max-w-[75%] flex flex-col gap-2 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                    <div className={`rounded-2xl p-6 relative shadow-lg ${
                        msg.role === 'user' 
                        ? `bg-${theme.colors.primary}-900/40 border border-${theme.colors.primary}-500/20 text-slate-100 rounded-tr-sm` 
                        : 'glass-panel text-slate-200 rounded-tl-sm border-white/5'
                    }`}>
                        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.text}</p>
                        {msg.isStreaming && <span className={`inline-block w-2 h-4 bg-${theme.colors.primary}-400 ml-1 animate-pulse`}/>}

                        {/* Model Message Toolbar (Permanently Visible) */}
                        {msg.role === 'model' && !msg.isStreaming && (
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                <button 
                                    onClick={() => handleSpeak(msg)}
                                    className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${playingId === msg.id ? `bg-${theme.colors.primary}-500/20 text-${theme.colors.primary}-400` : `text-slate-400 hover:text-${theme.colors.primary}-300 hover:bg-white/5`}`}
                                    disabled={!!ttsLoadingId}
                                >
                                    {ttsLoadingId === msg.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : playingId === msg.id ? (
                                        <StopCircle size={14} className={`text-${theme.colors.primary}-400`} />
                                    ) : (
                                        <Volume2 size={14} />
                                    )}
                                    <span>{playingId === msg.id ? 'Stop Reading' : 'Read Aloud'}</span>
                                </button>

                                <button 
                                    className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
                                    onClick={() => navigator.clipboard.writeText(msg.text)}
                                >
                                    <Copy size={14} />
                                    Copy
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Google Search Citations Display */}
                    {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                        <div className={`glass-panel p-4 rounded-xl border border-${theme.colors.primary}-500/20 bg-slate-900/50 w-full animate-in fade-in slide-in-from-top-2`}>
                             <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                                <Sparkles size={10} className={`text-${theme.colors.primary}-500`} />
                                Verified Sources
                             </h4>
                             <div className="flex flex-wrap gap-2">
                                {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => {
                                    if (chunk.web) {
                                        return (
                                            <a 
                                                key={i} 
                                                href={chunk.web.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-${theme.colors.primary}-400 hover:text-${theme.colors.primary}-300 transition-colors border border-white/5 max-w-full truncate shadow-sm`}
                                            >
                                                <ExternalLink size={10} />
                                                <span className="truncate max-w-[200px]">{chunk.web.title}</span>
                                            </a>
                                        );
                                    }
                                    return null;
                                })}
                             </div>
                        </div>
                    )}
                </div>

                {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                        <User size={18} className="text-slate-400" />
                    </div>
                )}
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 relative z-20">
        <div className={`glass-panel p-2 rounded-2xl flex items-center gap-2 focus-within:border-${theme.colors.primary}-500/50 focus-within:ring-1 focus-within:ring-${theme.colors.primary}-500/50 transition-all shadow-xl`}>
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${notebook.sources.length} sources (and the web)...`}
                className="flex-1 bg-transparent p-4 outline-none text-slate-100 placeholder-slate-500 font-medium"
                disabled={loading || notebook.sources.length === 0}
            />
            <button 
                type="submit"
                disabled={loading || !input.trim() || notebook.sources.length === 0}
                className={`p-4 bg-gradient-to-br from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600 hover:from-${theme.colors.primary}-500 hover:to-${theme.colors.secondary}-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-xl text-white transition-all shadow-lg hover:shadow-${theme.colors.primary}-500/25 transform hover:scale-105`}
            >
                <Send size={20} />
            </button>
        </div>
        {notebook.sources.length === 0 && (
            <p className={`text-center text-xs text-${theme.colors.accent}-400 mt-3 font-medium animate-pulse`}>Add sources in the Sources tab to start chatting.</p>
        )}
      </form>
    </div>
  );
};

export default ChatTab;
