
import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts';
import { NebulaLogo } from './ThemeUI';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Start fade out after 2.5 seconds
    const timer1 = setTimeout(() => {
      setFading(true);
    }, 2500);

    // Complete after fade out (3s total)
    const timer2 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] ${theme.colors.background} flex flex-col items-center justify-center transition-opacity duration-700 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative">
        {/* Animated Glows */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-${theme.colors.primary}-500/20 rounded-full blur-[100px] animate-pulse`}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-${theme.colors.secondary}-600/20 rounded-full blur-[60px] animate-ping`} style={{ animationDuration: '3s' }}></div>
        
        <div className="relative z-10 flex flex-col items-center scale-150 transform transition-transform duration-[3s] ease-out">
            <NebulaLogo size="lg" />
            <p className="text-slate-500 text-[10px] tracking-[0.3em] uppercase font-bold mt-6 animate-pulse">
                Initializing Neural Engine
            </p>
        </div>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-4 w-64">
          <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-${theme.colors.primary}-400 to-${theme.colors.secondary}-500 animate-progress origin-left`}></div>
          </div>
      </div>

      <style>{`
        @keyframes progress {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
        }
        .animate-progress {
            animation: progress 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
