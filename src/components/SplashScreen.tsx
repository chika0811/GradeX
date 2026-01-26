import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-gradient-to-br from-primary via-primary to-primary/80 flex flex-col items-center justify-center transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Logo */}
      <div className="relative animate-scale-in">
        <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 shadow-2xl">
          <GraduationCap className="w-14 h-14 text-white animate-float" />
        </div>
        
        {/* Glow Ring */}
        <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-white/30 animate-ping" />
      </div>

      {/* App Name */}
      <h1 className="text-5xl font-bold text-white mb-2 animate-fade-in">
        Gradex
      </h1>
      
      {/* Tagline */}
      <p className="text-white/80 text-lg mb-8 animate-fade-in delay-300">
        Your Academic Companion
      </p>

      {/* Loading Indicator */}
      <div className="flex gap-2 animate-fade-in delay-500">
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-white font-semibold text-lg">Dnovit / NoskyTech</p>
      </div>
    </div>
  );
}
