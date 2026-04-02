import React, { useState, useEffect } from 'react';

// Custom injected styles for complex animations
const animationStyles = `
  @keyframes walk-across {
    0% { transform: translateX(-10vw); }
    100% { transform: translateX(110vw); }
  }
  @keyframes walk-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  @keyframes swing {
    0% { transform: rotate(-3deg); }
    100% { transform: rotate(3deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
  @keyframes pan-blueprint {
    0% { background-position: 0 0; }
    100% { background-position: 100px 100px; }
  }
  .blueprint-bg {
    background-image: 
      linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: pan-blueprint 20s linear infinite;
  }
`;

// Animated Worker SVG Component
const AnimatedWorker = ({ delay = "0s", duration = "25s", color = "#06b6d4", scale = 1, zIndex = 10 }) => (
  <div 
    className="absolute bottom-[20%] left-0 pointer-events-none" 
    style={{ animation: `walk-across ${duration} linear infinite`, animationDelay: delay, zIndex }}
  >
    <div style={{ animation: `walk-bounce 0.5s ease-in-out infinite`, transform: `scale(${scale})` }}>
      <svg width="40" height="60" viewBox="0 0 24 40" fill="none" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
        {/* Hard Hat */}
        <path d="M5 10c0-4 14-4 14 0h2v2H3v-2h2z" fill={color} stroke="none" opacity="0.9" />
        <path d="M3 12h18" strokeWidth="2" />
        {/* Head */}
        <circle cx="12" cy="15" r="2.5" fill="white" stroke="none" opacity="0.8"/>
        {/* Body */}
        <path d="M12 18v10" strokeWidth="3" stroke={color} />
        <path d="M12 19l-4 6l2 4M12 19l4 6l-2 4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
        {/* Legs */}
        <path d="M12 28l-3 12M12 28l3 12" strokeLinecap="round" strokeWidth="2.5"/>
        {/* Blueprint roll under arm */}
        <rect x="5" y="21" width="4" height="10" rx="1" fill="#fff" opacity="0.8" stroke="none" transform="rotate(-15 7 21)" />
      </svg>
    </div>
  </div>
);

// Swinging Crane SVG Component
const AnimatedCrane = () => (
  <div className="absolute top-0 right-[15%] h-[40vh] w-[200px] pointer-events-none opacity-40 z-0 origin-top" style={{ animation: 'swing 8s ease-in-out infinite alternate' }}>
    <svg width="100%" height="100%" viewBox="0 0 100 300" fill="none">
      {/* Crane Cable */}
      <line x1="50" y1="0" x2="50" y2="250" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
      {/* Crane Hook */}
      <path d="M40 250 h20 v10 a10 10 0 0 1 -20 0 z" fill="#06b6d4" />
      <path d="M50 260 c0 15, -15 15, -15 30 c0 10, 10 10, 15 0" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Glowing load */}
      <rect x="35" y="290" width="30" height="20" fill="#020617" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="50" cy="300" r="4" fill="#22d3ee" className="animate-pulse" />
    </svg>
  </div>
);

export default function LoginPage() {
  const [role, setRole] = useState('engineer'); // 'engineer' | 'user'
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Theme Colors based on Role
  const theme = role === 'engineer' 
    ? { primary: 'cyan-500', glow: 'cyan-500/40', text: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500' }
    : { primary: 'amber-500', glow: 'amber-500/40', text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500' };

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#020617] overflow-hidden font-sans flex items-center justify-center selection:bg-cyan-500/30">
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {/* --- Animated Background Layer --- */}
      <div className="absolute inset-0 blueprint-bg opacity-30 z-0"></div>
      
      {/* Ambient Glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000 ${role === 'engineer' ? 'bg-cyan-600/30' : 'bg-orange-600/20'}`} style={{ animation: 'pulse-glow 6s infinite alternate' }}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60vh] h-[60vh] rounded-full blur-[150px] mix-blend-screen transition-colors duration-1000 ${role === 'engineer' ? 'bg-blue-600/20' : 'bg-amber-600/20'}`} style={{ animation: 'pulse-glow 8s infinite alternate-reverse' }}></div>

      {/* Construction Elements */}
      <AnimatedCrane />
      
      {/* Steel Beam foreground */}
      <div className="absolute bottom-[20%] left-0 w-full h-[12px] bg-gradient-to-b from-slate-700 to-slate-900 border-t border-slate-500 z-10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        {/* Beam Rivets */}
        <div className="w-full h-full flex justify-between px-4 opacity-30">
            {[...Array(20)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-600 mt-0.5"></div>)}
        </div>
      </div>

      {/* Walking Workers */}
      <AnimatedWorker delay="0s" duration="20s" color={role === 'engineer' ? '#22d3ee' : '#94a3b8'} scale={1.2} zIndex={15} />
      <AnimatedWorker delay="10s" duration="28s" color="#64748b" scale={0.9} zIndex={5} />
      <AnimatedWorker delay="15s" duration="22s" color={role === 'engineer' ? '#818cf8' : '#fbbf24'} scale={1.1} zIndex={12} />


      {/* --- Foreground Login Card --- */}
      <div className="relative z-30 w-full max-w-[1000px] flex flex-col md:flex-row items-center gap-10 px-6 mt-[-5%]">
        
        {/* Left Side: Branding / Intro */}
        <div className="flex-1 text-center md:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-3 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_20px_var(--glow-color)] transition-all duration-500 bg-gradient-to-br ${role === 'engineer' ? 'from-cyan-400 to-blue-600 shadow-cyan-500/40' : 'from-amber-400 to-orange-600 shadow-amber-500/40'}`}>
                    {role === 'engineer' ? '📐' : '🏗️'}
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Civis<span className={`transition-colors duration-500 ${theme.text}`}>Metric</span></h1>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-200 mb-4 tracking-wide">
                {role === 'engineer' ? 'Architecting the Future.' : 'Track Your Dream Project.'}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto md:mx-0">
                {role === 'engineer' 
                    ? 'Access your advanced estimation engine, 3D visualizers, and civil engineering workspace.' 
                    : 'Log in to view live construction progress, financial estimates, and project timelines.'}
            </p>
        </div>

        {/* Right Side: The Login Form */}
        <div className="w-full max-w-[420px] shrink-0">
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
                
                {/* Form Top Glow */}
                <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${theme.bg} shadow-[0_0_20px_var(--bg-color)]`}></div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-6 text-center">Secure Authentication</h3>
                    
                    {/* Role Segmented Control */}
                    <div className="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800 relative shadow-inner">
                        <button 
                            onClick={() => setRole('engineer')}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 z-10 ${role === 'engineer' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Civil Engineer
                        </button>
                        <button 
                            onClick={() => setRole('user')}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 z-10 ${role === 'user' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Client / User
                        </button>

                        {/* Animated Slider Pill */}
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${theme.bg}`}
                            style={{ left: role === 'engineer' ? '4px' : 'calc(50%)' }}
                        ></div>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* ID Input */}
                    <div className="space-y-1.5 group">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-slate-300 transition-colors">
                            {role === 'engineer' ? 'Engineering ID / Email' : 'Client Email'}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className={`w-4 h-4 text-slate-500 transition-colors duration-300 group-focus-within:${theme.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <input 
                                type="text" 
                                required
                                className={`w-full bg-slate-950/50 border border-slate-700/80 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all duration-300 focus:border-${theme.primary.split('-')[0]}-500 focus:shadow-[0_0_15px_rgba(var(--glow-color),0.2)]`}
                                placeholder={role === 'engineer' ? 'E.g. CE-9082' : 'Enter your email'}
                                style={{ '--glow-color': role === 'engineer' ? '6,182,212' : '245,158,11' }}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5 group">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider group-focus-within:text-slate-300 transition-colors">
                                Password
                            </label>
                            <a href="#" className={`text-xs ${theme.text} hover:underline`}>Forgot?</a>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className={`w-4 h-4 text-slate-500 transition-colors duration-300 group-focus-within:${theme.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <input 
                                type="password" 
                                required
                                className={`w-full bg-slate-950/50 border border-slate-700/80 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all duration-300 focus:border-${theme.primary.split('-')[0]}-500 focus:shadow-[0_0_15px_rgba(var(--glow-color),0.2)]`}
                                placeholder="••••••••"
                                style={{ '--glow-color': role === 'engineer' ? '6,182,212' : '245,158,11' }}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                        disabled={isLoading}
                        type="submit"
                        className={`w-full mt-2 py-3.5 rounded-xl font-bold text-slate-900 uppercase tracking-widest text-sm transition-all duration-300 relative overflow-hidden group ${theme.bg}`}
                    >
                        <span className={`absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300`}></span>
                        {isLoading ? (
                            <svg className="w-5 h-5 animate-spin mx-auto text-slate-900" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Initialize Session
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </span>
                        )}
                    </button>
                </form>

                {/* Footer Decor */}
                <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center gap-4">
                     <p className="text-xs text-slate-500 font-mono">CivisMetric Engine v4.2.0 • Secured</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
