
import React, { useEffect, useRef, useState } from 'react';
import { Notebook } from '../types';
import { getLiveClient, LIVE_MODEL_NAME, getDebateSystemInstruction, getInterviewSystemInstruction } from '../services/ai';
import { Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, Activity, Swords, Users, Shield, Info } from 'lucide-react';
import { base64ToUint8Array, arrayBufferToBase64, convertFloat32ToInt16 } from '../services/audioUtils';
import { useTheme } from '../contexts';

interface Props {
  notebook: Notebook;
}

// Simple linear downsampling to ensure 24kHz output
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number) {
    if (outputRate === inputRate) {
        return buffer;
    }
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

const getThemeColorHex = (colorName: string): string => {
    // ... (same as before)
    const colors: Record<string, string> = {
        blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef',
        pink: '#ec4899', rose: '#f43f5e', red: '#ef4444', orange: '#f97316', amber: '#f59e0b',
        yellow: '#eab308', lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6',
        cyan: '#06b6d4', sky: '#0ea5e9', slate: '#64748b', gray: '#6b7280', zinc: '#71717a',
        neutral: '#737373', stone: '#78716c',
    };
    return colors[colorName] || '#3b82f6';
};

const LiveSession: React.FC<Props> = ({ notebook }) => {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [status, setStatus] = useState<'setup' | 'connecting' | 'live' | 'error'>('setup');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Arena Configuration
  const [sessionMode, setSessionMode] = useState<'Standard' | 'Arena'>('Standard');
  const [debateRole, setDebateRole] = useState<'Moderator' | 'Pro' | 'Con'>('Pro');
  const [userName, setUserName] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<'guest' | 'arena' | null>(null);

  const { theme } = useTheme();

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSessionRef = useRef<any>(null); 
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const connect = async () => {
    setStatus('connecting');
    setErrorMsg('');

    try {
        const client = getLiveClient();
        
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx(); 
        if (ctx.state === 'suspended') await ctx.resume();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const sourceContext = (notebook.sources || []).map(s => `Title: ${s.title}\nContent: ${s.content.substring(0, 1000)}...`).join('\n\n');
        const TARGET_RATE = 24000; 
        
        let sysInstruction = "";
        let voiceName = 'Aoede'; // Default to Nova (Calm) for standard chat

        const finalUserName = userName.trim() || "Guest";

        if (sessionMode === 'Arena') {
            // Debate Mode -> Use Atlas (Puck)
            voiceName = 'Puck'; 
            sysInstruction = getDebateSystemInstruction(sourceContext, debateRole, debateRole === 'Pro' ? 'Supporting the Topic' : debateRole === 'Con' ? 'Opposing the Topic' : 'Neutral', finalUserName);
        } else {
            // Standard Chat -> Use Nova (Aoede)
            voiceName = 'Aoede';
            sysInstruction = getInterviewSystemInstruction(sourceContext, finalUserName);
        }

        const sessionPromise = client.connect({
            model: LIVE_MODEL_NAME,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } 
                },
                systemInstruction: sysInstruction
            },
            callbacks: {
                onopen: () => {
                    console.log("Live Session Connected");
                    setStatus('live');
                    setConnected(true);
                    sessionPromise.then(sess => { activeSessionRef.current = sess; });
                    
                    if (!audioContextRef.current) return;
                    const ctx = audioContextRef.current;
                    const source = ctx.createMediaStreamSource(stream);
                    const processor = ctx.createScriptProcessor(4096, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        if (mutedRef.current) return;
                        const inputData = e.inputBuffer.getChannelData(0);
                        const resampledData = downsampleBuffer(inputData, ctx.sampleRate, TARGET_RATE);
                        const pcmInt16 = convertFloat32ToInt16(resampledData);
                        const base64 = arrayBufferToBase64(pcmInt16.buffer);
                        sessionPromise.then((session) => {
                            try {
                                session.sendRealtimeInput({ media: { mimeType: `audio/pcm;rate=${TARGET_RATE}`, data: base64 } });
                            } catch (err) { console.error("Audio Send Error", err); }
                        });
                    };
                    source.connect(processor);
                    processor.connect(ctx.destination);
                    inputSourceRef.current = source;
                    processorRef.current = processor;
                },
                onmessage: async (msg) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                        const ctx = audioContextRef.current;
                        const rawBytes = base64ToUint8Array(audioData);
                        const buffer = ctx.createBuffer(1, Math.floor(rawBytes.length / 2), 24000);
                        const channelData = buffer.getChannelData(0);
                        const view = new DataView(rawBytes.buffer);
                        for(let i=0; i<channelData.length; i++) { channelData[i] = view.getInt16(i * 2, true) / 32768.0; }

                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        source.playbackRate.value = 1.0; 
                        if (analyserRef.current) source.connect(analyserRef.current);
                        source.connect(ctx.destination);
                        
                        const now = ctx.currentTime;
                        const startTime = Math.max(now, nextStartTimeRef.current);
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + buffer.duration;
                        sourcesRef.current.add(source);
                        source.onended = () => sourcesRef.current.delete(source);
                    }
                    if (msg.serverContent?.interrupted) {
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                    }
                },
                onclose: () => {
                    console.log("Session Closed");
                    setStatus('setup');
                    setConnected(false);
                    activeSessionRef.current = null;
                },
                onerror: (err) => {
                    console.error("Session Error", err);
                    setErrorMsg("Connection error. Please try again.");
                    if (!navigator.onLine) setErrorMsg("No internet connection.");
                }
            }
        });

    } catch (e) {
        console.error(e);
        setErrorMsg("Failed to access microphone or API.");
        setStatus('error');
    }
  };

  const disconnect = () => {
    if (activeSessionRef.current) { activeSessionRef.current.close(); activeSessionRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
    setStatus('setup');
    setConnected(false);
  };

  useEffect(() => { return () => { disconnect(); }; }, []);

  // Visualizer Logic
  useEffect(() => {
    let animationFrameId: number;
    let rotation = 0;
    const draw = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) { animationFrameId = requestAnimationFrame(draw); return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.45; 
        const bars = 64;
        const step = (Math.PI * 2) / bars;
        rotation += 0.005;
        const primaryHex = getThemeColorHex(theme.colors.primary);
        const secondaryHex = getThemeColorHex(theme.colors.secondary);
        const accentHex = getThemeColorHex(theme.colors.accent);

        if (status === 'live') {
            for (let i = 0; i < bars; i++) {
                const value = dataArray[i * 2] || 0;
                const barHeight = (value / 255) * (radius * 1.2) + 5; 
                const angle = i * step + rotation;
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                const y2 = centerY + Math.sin(angle) * (radius + barHeight);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                gradient.addColorStop(0, accentHex); 
                gradient.addColorStop(0.5, primaryHex);
                gradient.addColorStop(1, secondaryHex); 
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            const avg = dataArray.reduce((a, b) => a + b) / bufferLength;
            if (avg > 10) {
                 ctx.beginPath();
                 ctx.arc(centerX, centerY, radius + (avg / 2), 0, Math.PI * 2);
                 ctx.strokeStyle = `${primaryHex}4D`; 
                 ctx.lineWidth = 1;
                 ctx.stroke();
            }
        } else {
             ctx.beginPath();
             ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
             ctx.strokeStyle = '#334155';
             ctx.lineWidth = 2;
             ctx.setLineDash([5, 5]);
             ctx.stroke();
             ctx.setLineDash([]);
        }
        animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, theme]);

  if (status === 'setup') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[500px] h-full glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden bg-slate-950 mx-4 md:mx-0">
                <div className="relative z-10 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Configure Live Session</h2>
                    
                    <div className="space-y-4">
                        <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Your Name</label>
                            <input 
                                type="text" 
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter your name (Optional)"
                                className={`w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-${theme.colors.primary}-500 focus:ring-1 focus:ring-${theme.colors.primary}-500/50 outline-none transition-all placeholder-slate-600`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setSessionMode('Standard')}
                                className={`group p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative overflow-visible ${sessionMode === 'Standard' ? `bg-${theme.colors.primary}-600/20 border-${theme.colors.primary}-500 text-white` : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                            >
                                <div 
                                    className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors z-20 cursor-help"
                                    onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'guest' ? null : 'guest'); }}
                                >
                                    <Info size={14} />
                                </div>
                                {activeTooltip === 'guest' && (
                                    <div className="absolute bottom-[110%] right-0 w-48 p-3 bg-slate-950 border border-white/10 rounded-xl text-[11px] leading-relaxed text-slate-300 shadow-2xl z-50 text-left animate-in fade-in slide-in-from-bottom-2">
                                        Join a calm, podcast-style chat with Nova. She will guide you through the material.
                                    </div>
                                )}
                                <Users size={24} />
                                <span className="font-bold text-sm">Guest Chat</span>
                            </button>
                            <button 
                                onClick={() => setSessionMode('Arena')}
                                className={`group p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative overflow-visible ${sessionMode === 'Arena' ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                            >
                                <div 
                                    className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors z-20 cursor-help"
                                    onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'arena' ? null : 'arena'); }}
                                >
                                    <Info size={14} />
                                </div>
                                {activeTooltip === 'arena' && (
                                    <div className="absolute bottom-[110%] right-0 w-48 p-3 bg-slate-950 border border-white/10 rounded-xl text-[11px] leading-relaxed text-slate-300 shadow-2xl z-50 text-left animate-in fade-in slide-in-from-bottom-2">
                                        Face off against Atlas in a high-energy debate. Defend your stance.
                                    </div>
                                )}
                                <Swords size={24} />
                                <span className="font-bold text-sm">Debate Arena</span>
                            </button>
                        </div>

                        {sessionMode === 'Arena' && (
                            <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-slate-900 rounded-xl border border-white/10">
                                <label className="text-xs text-slate-500 uppercase font-bold mb-3 block">Choose Your Role</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setDebateRole('Pro')} className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${debateRole === 'Pro' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-800 border-transparent text-slate-400'}`}>Pro</button>
                                    <button onClick={() => setDebateRole('Con')} className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${debateRole === 'Con' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-transparent text-slate-400'}`}>Con</button>
                                    <button onClick={() => setDebateRole('Moderator')} className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${debateRole === 'Moderator' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-transparent text-slate-400'}`}>Mod</button>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={connect}
                            className={`w-full py-4 mt-4 bg-gradient-to-r ${sessionMode === 'Arena' ? 'from-rose-600 to-orange-600' : `from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600`} text-white rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform`}
                        >
                            Start Session
                        </button>
                    </div>
                </div>
          </div>
      );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-[500px] max-h-[600px] h-full w-full glass-panel rounded-2xl relative overflow-hidden bg-slate-950 mx-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 ${sessionMode === 'Arena' ? 'bg-rose-900/20' : `bg-${theme.colors.primary}-900/20`} blur-[80px] rounded-full animate-pulse`}></div>
        
        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-8 w-full p-4">
            <div className="relative w-full h-[280px] md:h-[320px] flex items-center justify-center">
                 <canvas ref={canvasRef} width={800} height={600} className="z-10 w-full h-full object-contain max-h-[300px] md:max-h-none" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                      <div className={`p-4 rounded-full transition-all duration-500 ${status === 'live' ? `bg-slate-900/80 shadow-[0_0_30px_rgba(var(--color-${theme.colors.primary}),0.3)] backdrop-blur-md border border-${theme.colors.primary}-500/30` : 'bg-slate-800'}`}>
                          {status === 'live' ? <Activity className={sessionMode === 'Arena' ? "text-rose-400 w-8 h-8 animate-pulse" : `text-${theme.colors.primary}-400 w-8 h-8 animate-pulse`} /> : <MicOff className="text-slate-500 w-8 h-8" />}
                      </div>
                 </div>
            </div>

            <div className="text-center -mt-4 md:-mt-8 z-20 px-4">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-[0_0_10px_rgba(var(--color-${theme.colors.primary}),0.5)]">
                    {status === 'connecting' ? 'Establishing Uplink...' : sessionMode === 'Arena' ? 'DEBATE ARENA LIVE' : 'Live on Air'}
                </h2>
                <p className="text-slate-400 max-w-sm mx-auto text-sm font-medium">
                    {status === 'live' ? (sessionMode === 'Arena' ? `Debating with Atlas...` : `Chatting with Nova...`) : errorMsg || 'Calibrating neural audio stream...'}
                </p>
            </div>

            <div className="flex gap-4 z-20 pb-4 md:pb-0">
                {status === 'error' ? (
                    <button onClick={() => setStatus('setup')} className="px-6 md:px-8 py-3 bg-slate-800 text-white rounded-full font-bold border border-white/10">Retry Setup</button>
                ) : (
                    <>
                        <button 
                            onClick={() => setMuted(!muted)}
                            className={`p-4 rounded-full transition-colors border border-white/10 shadow-lg ${muted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                        >
                            {muted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button 
                            onClick={disconnect}
                            className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all border border-red-500/50 shadow-lg"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default LiveSession;
