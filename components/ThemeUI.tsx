
import React, { useState } from 'react';
import { useTheme } from '../contexts';
import { THEMES } from '../constants';
import { Palette, Check, Sparkles } from 'lucide-react';

export const NebulaLogo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'sm' }) => {
    const { theme } = useTheme();
    const isLg = size === 'lg';
    
    const primary = theme.colors.primary;
    const secondary = theme.colors.secondary;
    
    return (
        <div className="flex items-center gap-3 select-none">
             <div className={`relative ${isLg ? 'w-12 h-12' : 'w-8 h-8'} transition-all duration-500`}>
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg overflow-visible">
                    <defs>
                        <linearGradient id={`grad-${primary}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: `var(--color-${primary}-400)`, stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: `var(--color-${secondary}-600)`, stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    
                    <path d="M50 20 L20 80 L80 80 Z" fill="none" stroke={`url(#grad-${primary})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse-slow" filter="url(#glow)" />
                    <circle cx="50" cy="20" r="8" fill={`var(--color-${primary}-500)`} />
                    <circle cx="20" cy="80" r="8" fill={`var(--color-${secondary}-500)`} />
                    <circle cx="80" cy="80" r="8" fill={`var(--color-${theme.colors.accent}-500)`} />
                    
                    <path d="M50 20 L50 50 L20 80 M50 50 L80 80" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                    <circle cx="50" cy="50" r="4" fill="white" className="animate-ping" style={{ animationDuration: '3s' }} />
                </svg>
             </div>
             <h1 className={`${isLg ? 'text-2xl md:text-3xl' : 'text-xl'} font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`}>
               Nebula<span className={`bg-clip-text text-transparent bg-gradient-to-r from-${primary}-400 to-${secondary}-400 transition-all duration-500`}>Mind</span>
             </h1>
        </div>
    );
};

export const ThemeSelector: React.FC = () => {
  const { theme, setThemeId, animationsEnabled, setAnimationsEnabled } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-[100]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md transition-all ${theme.colors.panel} text-${theme.colors.primary}-400 hover:bg-white/5 shadow-lg shadow-black/20`}
      >
        <Palette size={16} />
        <span className="text-xs font-medium hidden md:inline">Theme</span>
        <div className={`w-2 h-2 rounded-full bg-${theme.colors.primary}-500 animate-pulse`}></div>
      </button>

      {isOpen && (
        <>
            <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 origin-top-right z-[100]">
            
            {/* Animation Toggle */}
            <div className="p-3 mb-2 bg-white/5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                    <Sparkles size={14} className={animationsEnabled ? `text-${theme.colors.accent}-400` : 'text-slate-500'} />
                    <span className="text-xs font-semibold">Moving Backgrounds</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setAnimationsEnabled(!animationsEnabled); }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${animationsEnabled ? `bg-${theme.colors.primary}-600` : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${animationsEnabled ? 'left-6' : 'left-1'}`}></div>
                </button>
            </div>

            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-t border-white/10">Select Theme</div>
            <div className="max-h-[300px] overflow-y-auto">
                {Object.values(THEMES).map((t) => (
                    <button
                    key={t.id}
                    onClick={() => { setThemeId(t.id); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors mb-1 ${theme.id === t.id ? `bg-${t.colors.primary}-500/20 text-${t.colors.primary}-400` : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                    <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br from-${t.colors.primary}-400 to-${t.colors.secondary}-500 shadow-[0_0_8px_currentColor]`}></div>
                        <span className={theme.id === t.id ? 'font-semibold' : ''}>{t.name}</span>
                    </div>
                    {theme.id === t.id && <Check size={14} />}
                    </button>
                ))}
            </div>
            </div>
        </>
      )}
    </div>
  );
};
