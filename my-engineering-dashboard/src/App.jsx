import React, { useState, useEffect, useMemo } from 'react';
import BricksCalculator from './components/BricksCalculator';

import FoundationCalculator from './components/FoundationCalculator';

import ExcavationCalculator from './components/ExcavationCalculator'; // IMPORT ADDED
import ColumnCalculator from './components/ColumnCalculator'; 


const SidebarIcon = ({ active, children, isDark }) => {
    const base = "w-10 h-10 lg:w-11 lg:h-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer";
    const darkActive = "bg-cardDark border border-borderDark text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]";
    const darkInactive = "bg-transparent border border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900";
    const lightActive = "bg-white border border-slate-200 text-slate-900 shadow-sm";
    const lightInactive = "bg-transparent border border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100";
    const appliedClass = active ? (isDark ? darkActive : lightActive) : (isDark ? darkInactive : lightInactive);
    return <div className={`${base} ${appliedClass}`}>{children}</div>;
};

const SidebarSection = ({ title, items, activeItem, setActiveView }) => (
  <div className="mb-8 shrink-0">
    <h3 className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] tracking-[0.2em] uppercase mb-3 pl-2">{title}</h3>
    <div className="flex flex-col gap-1">
      {items.map(item => {
        const isActive = activeItem === item;
        return (
            <div 
              key={item} 
              onClick={() => setActiveView && setActiveView(item)}
              className={`text-[13px] px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                isActive ? 'bg-slate-100 dark:bg-zinc-800/50 text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900/50'
              }`}
            >
              {isActive ? (
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-accentStart to-accentEnd shadow-glow-accent shrink-0"></div>
              ) : (
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 shrink-0"></div>
              )}
              <span className="leading-snug">{item}</span>
            </div>
        );
      })}
    </div>
  </div>
);

const Sidebar = ({ isOpen, isMobile, closeMobile, isDark, activeView, setActiveView }) => {
  const sidebarClasses = isMobile 
    ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `relative flex h-full border-r border-slate-200 dark:border-borderDark shrink-0 bg-white dark:bg-dashboard z-20 lg:rounded-l-[2rem] transition-all duration-500 ease-in-out ${isOpen ? 'w-[320px] xl:w-[340px]' : 'w-[88px]'}`;

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={closeMobile}></div>}
      <div className={`${sidebarClasses} flex shadow-2xl lg:shadow-none overflow-hidden bg-slate-50 dark:bg-dashboard`}>
        
        <div className="w-[88px] bg-slate-50 dark:bg-dashboard flex flex-col items-center py-6 gap-2 border-r border-slate-200 dark:border-borderDark shrink-0 z-20 overflow-y-auto no-scrollbars pb-10">
            <div className="w-10 h-10 lg:w-11 lg:h-11 bg-gradient-to-br from-accentStart to-accentEnd rounded-xl flex items-center justify-center text-xl font-black text-white mb-4 shrink-0 shadow-glow-accent cursor-pointer" onClick={() => setActiveView('Overview')}>E</div>
            <SidebarIcon active={activeView === 'Overview'} isDark={isDark}><div onClick={() => setActiveView('Overview')} className="w-full h-full flex items-center justify-center"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/></svg></div></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L7 7m5 5l-2.879 2.879M2 22l5-5"/></svg></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg></SidebarIcon>
            <SidebarIcon isDark={isDark}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg></SidebarIcon>
        </div>

        <div className={`flex-1 bg-white dark:bg-dashboard flex flex-col pt-8 px-4 lg:px-6 overflow-y-auto custom-scroll transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden lg:flex'}`}>
          <div className="flex items-center gap-3 mb-8 shrink-0 px-2 cursor-pointer" onClick={() => setActiveView('Overview')}>
            <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight hover:text-cyan-500 transition-colors">Workspace</h1>
          </div>

          <SidebarSection title="Core Materials" items={['Cement Calculator', 'Sand Calculator', 'Aggregate Calculator', 'Bricks Calculator', 'Concrete Calculator', 'Steel Calculator']} activeItem={activeView} setActiveView={setActiveView} />
          {/* ADDED 'Excavation Calculator' to the Structural items list */}
          <SidebarSection title="Structural" items={['Foundation Calculator', 'Excavation Calculator', 'Slab Calculator', 'Column Calculator', 'Beam Calculator', 'Staircase Calculator']} activeItem={activeView} setActiveView={setActiveView} />
          <SidebarSection title="Measurements" items={['Area Calculator', 'Volume Calculator', 'Land Area Converter']} activeItem={activeView} setActiveView={setActiveView} />
          <SidebarSection title="Finishing" items={['Paint Calculator', 'Plaster Calculator', 'Tile Calculator']} activeItem={activeView} setActiveView={setActiveView} />
          <SidebarSection title="Costing" items={['Material Cost', 'Labour Cost', 'Total Project Estimator']} activeItem={activeView} setActiveView={setActiveView} />
          <SidebarSection title="Advanced" items={['Rebar Weight', 'Mortar Calculator', 'Insulation Estimator', 'Electrical Wiring']} activeItem={activeView} setActiveView={setActiveView} />
          
          <div className="mt-2 mb-8 shrink-0 relative p-[1px] rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-borderDark dark:to-dashboard group cursor-pointer overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <div className="bg-slate-50 dark:bg-cardDark p-4 rounded-[11px] relative z-10 h-full w-full">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-accentStart" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                    <h3 className="text-slate-800 dark:text-white font-bold text-[11px] tracking-widest uppercase">Pro AI Tools</h3>
                </div>
                <div className="flex flex-col gap-2">
                <span className="text-[12px] text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Auto-estimate from plans
                </span>
                <span className="text-[12px] text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Smart cost optimization
                </span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const DashboardHeader = ({ toggleLeft, toggleRight, isDark, toggleTheme, title }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 mb-6 lg:mb-8 shrink-0 z-10 border-b border-slate-200 dark:border-transparent pb-4 dark:pb-0">
    <div className="flex items-center gap-3 lg:gap-4">
      <button onClick={toggleLeft} className="p-2 text-slate-400 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 dark:text-zinc-400 dark:hover:text-white dark:bg-cardDark dark:hover:bg-zinc-800 rounded-lg dark:border-borderDark transition-all shadow-sm z-30 relative">
        <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
    
    <div className="flex items-center gap-3 lg:gap-6">
      <button onClick={toggleTheme} className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors duration-300 focus:outline-none shadow-inner border ${isDark ? 'bg-zinc-800 border-borderDark' : 'bg-slate-200 border-slate-300'}`}>
        <span className={`inline-block w-5 h-5 transform transition-transform duration-300 rounded-full shadow-md flex items-center justify-center bg-white ${isDark ? 'translate-x-8' : 'translate-x-1'}`}>
          {isDark 
            ? <svg className="w-3.5 h-3.5 text-zinc-800" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            : <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
          }
        </span>
      </button>

      <div className="hidden md:flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 lg:gap-3">
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Project Health</p>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-zinc-200">100%</span>
        </div>
        <div className="w-48 lg:w-48 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-accentStart to-accentEnd"></div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-5 md:pl-5 md:border-l border-slate-200 dark:border-borderDark">
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-cardDark border border-slate-200 dark:border-borderDark rounded-lg text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
            <svg className="w-4 h-4 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Export
        </button>

        <div className="relative cursor-pointer text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-white transition-colors p-1">
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-dashboard"></span>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </div>
        
        <img src="https://ui-avatars.com/api/?name=Admin&background=020617&color=fff&bold=true&rounded=true" alt="Avatar" className="w-9 h-9 lg:w-10 lg:h-10 rounded-full border border-slate-200 dark:border-borderDark cursor-pointer shadow-sm" />
        
        <button onClick={toggleRight} className="p-2 ml-1 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 dark:text-zinc-400 dark:hover:text-white dark:bg-cardDark dark:hover:bg-zinc-800 rounded-lg dark:border-borderDark transition-all shadow-sm lg:hidden xl:block">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </button>
      </div>
    </div>
  </div>
);

const CalculatorCard = ({ title, delay, children }) => (
  <div className="bg-white dark:bg-cardDark rounded-2xl p-5 lg:p-6 border border-slate-200 dark:border-borderDark shadow-sm hover:shadow-md dark:shadow-none flex flex-col gap-5 relative group transition-all duration-300 opacity-0 animate-fade-in-up hover:-translate-y-1">
    <div className="flex items-center justify-between z-10">
      <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-100 tracking-tight">{title}</h3>
      <div className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z"/></svg>
      </div>
    </div>
    <div className="flex-1 flex flex-col gap-4 z-10">{children}</div>
  </div>
);

const InputBlock = ({ label, value }) => (
  <div className="space-y-1.5 group/input">
    <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">{label}</p>
    <div className="w-full h-10 bg-slate-50 dark:bg-dashboard rounded-lg flex items-center justify-between px-3 border border-slate-200 dark:border-borderDark cursor-pointer hover:border-slate-300 dark:hover:border-zinc-600 transition-colors shadow-inner">
      <span className="text-slate-700 dark:text-zinc-300 text-sm font-medium tabular-nums">{value}</span>
      <svg className="w-4 h-4 text-slate-400 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
    </div>
  </div>
);

const SliderBlock = ({ label, value, max = 100 }) => (
  <div className="space-y-2 group/slider mt-1">
    <div className="flex items-center justify-between">
      <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">{label}</p>
      <span className="text-slate-700 dark:text-zinc-200 text-xs font-semibold tabular-nums">{value}</span>
    </div>
    <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full relative cursor-pointer">
      <div style={{ width: `${(value / max) * 100}%` }} className="absolute left-0 top-0 h-full bg-gradient-to-r from-accentStart to-accentEnd rounded-full"></div>
      <div style={{ left: `calc(${(value / max) * 100}% - 6px)` }} className="absolute -top-1 w-3.5 h-3.5 bg-white rounded-full shadow-md border border-slate-200 dark:border-zinc-600 hover:scale-110 transition-transform"></div>
    </div>
  </div>
);

const ResultBlock = ({ label, value }) => (
  <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-slate-100 dark:border-borderDark">
    <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">{label}</p>
    <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white tracking-tight"><span className="text-slate-400 dark:text-zinc-500 font-normal mr-0.5">₹</span>{value}</p>
  </div>
);

const DonutChartStatic = ({ color1, color2, color3, isDark }) => (
  <div className="w-20 h-20 relative shrink-0">
    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke={isDark ? "#27272a" : "#f1f5f9"} strokeWidth="12" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color1} strokeWidth="12" strokeDasharray="180, 251.2" strokeDashoffset="0" strokeLinecap="round" className="transition-all duration-500"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke={color2} strokeWidth="12" strokeDasharray="60, 251.2" strokeDashoffset="-190" strokeLinecap="round" className="transition-all duration-500"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke={color3} strokeWidth="12" strokeDasharray="30, 251.2" strokeDashoffset="-260" strokeLinecap="round" className="transition-all duration-500"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Data</span>
    </div>
  </div>
);

const LegendBlock = ({ items }) => (
  <div className="flex flex-col gap-1.5">
    {items.map((item, idx) => (
      <div key={idx} className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${item.colorClass}`}></div>
        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{item.label}</p>
      </div>
    ))}
  </div>
);

const AnimatedLineChartStatic = ({ isDark }) => (
  <div className="w-full h-24 bg-slate-50 dark:bg-dashboard rounded-lg p-2 relative overflow-hidden border border-slate-100 dark:border-borderDark group/line">
    <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={isDark ? "0.3" : "0.15"} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
      <path d="M0,100 C 50,70 100,80 150,50 C 200,30 250,60 300,40 C 350,20 400,30 L400,100 Z" fill="url(#chartGradient1)" />
      <path d="M0,100 C 50,70 100,80 150,50 C 200,30 250,60 300,40 C 350,20 400,30" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
    <div className="absolute top-[20%] left-[85%] w-2 h-2 bg-white rounded-full border-2 border-cyan-500 shadow-sm animate-pulse"></div>
  </div>
);

const VerticalBarChartStatic = ({ isDark }) => (
  <div className="w-full h-24 bg-slate-50 dark:bg-dashboard rounded-lg p-2 relative flex items-end gap-1.5 overflow-hidden border border-slate-100 dark:border-borderDark mt-2">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex-1 flex flex-col-reverse gap-1 items-center opacity-90 hover:opacity-100 transition-opacity cursor-pointer group/bar">
        <div style={{ height: `${Math.random() * 60 + 20}%` }} className={`w-full rounded-sm transition-all duration-300 group-hover/bar:bg-indigo-400 ${i % 2 === 0 ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
      </div>
    ))}
  </div>
);

const ComplexLineChartStatic = ({ isDark }) => (
  <div className="w-full h-24 bg-slate-50 dark:bg-dashboard rounded-lg p-2 relative overflow-hidden border border-slate-100 dark:border-borderDark mt-2 group/line2">
    <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="materialChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={isDark ? "0.4" : "0.15"} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      <path d="M0,100 C 30,50 60,60 90,80 C 120,100 150,20 180,60 C 210,100 240,40 270,70 C 300,100 330,50 360,30 L400,30 L400,100 Z" fill="url(#materialChartGradient)" className="group-hover/line2:opacity-80 transition-opacity" />
      <path d="M0,100 C 30,50 60,60 90,80 C 120,100 150,20 180,60 C 210,100 240,40 270,70 C 300,100 330,50 360,30 L400,30" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

const EngineerIcon = ({ color, flip, pointing }) => (
    <svg width="28" height="42" viewBox="0 0 24 40" fill="none" stroke={color} strokeWidth="1.5" style={{ transform: flip ? 'scaleX(-1)' : 'none', filter: `drop-shadow(0 0 6px ${color})` }}>
        <path d="M5 10c0-4 14-4 14 0h2v2H3v-2h2z" fill={color} stroke="none" opacity="0.8" />
        <path d="M3 12h18" strokeWidth="2" />
        <circle cx="12" cy="14" r="2.5" />
        <path d="M12 17v12" strokeWidth="2.5" />
        {pointing ? (
            <path d="M12 18l-3 4l1 5M12 18l6 -2l3 0" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
            <path d="M12 18l-4 6l2 4M12 18l4 6l-2 4" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path d="M12 29l-3 10M12 29l3 10" strokeLinecap="round" />
        {!pointing && <rect x="5" y="22" width="4" height="6" rx="0.5" fill={color} fillOpacity="0.4" stroke="none" />}
    </svg>
);

const AnimatedHouse = ({ isDark, scale = 1, isIntro = false }) => {
    const rows = 6;
    const cols = 8;
    
    const particles = useMemo(() => {
        return Array.from({ length: 45 }).map((_, i) => {
            const left = Math.random() * 220; 
            const delay = Math.random() * 1.5 + 0.2; 
            const duration = 0.5 + Math.random() * 0.4;
            const isSand = Math.random() > 0.4;
            const colorClass = isSand ? 'bg-amber-600' : 'bg-slate-500';
            
            return (
                <div 
                    key={`p-${i}`} 
                    className={`absolute bottom-[-10px] w-[3px] h-[3px] rounded-sm particle ${colorClass}`} 
                    style={{ left: `${left}px`, animation: `drop-particle ${duration}s ${delay}s ease-in forwards` }} 
                />
            );
        });
    }, []);

    const bricks = useMemo(() => {
        const arr = [];
        let bDelay = isIntro ? 1.5 : 0; 
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r < 3 && c >= 3 && c <= 4) continue;
                if (r >= 2 && r <= 4 && c === 1) continue;

                const brickClass = isDark 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-600 border border-orange-700/50 shadow-[0_0_6px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                    : 'bg-gradient-to-br from-orange-300 to-orange-500 border border-orange-600 shadow-[inset_0_1px_rgba(255,255,255,0.6)]';

                arr.push(
                    <div
                        key={`${r}-${c}`}
                        className={`absolute rounded-[2px] brick-anim z-10 ${brickClass}`}
                        style={{ 
                            bottom: `${r * 17}px`, 
                            left: `${c * 27 + (r % 2 === 0 ? 0 : 13.5)}px`, 
                            width: '26px', 
                            height: '16px', 
                            animationDelay: `${bDelay}s` 
                        }}
                    />
                );
                bDelay += 0.025; 
            }
        }
        return { elements: arr, totalDelay: bDelay };
    }, [isDark, isIntro]);

    const finishDelay = bricks.totalDelay + 0.1;

    return (
        <div className={`relative mx-auto origin-bottom ${isIntro ? 'shake-on-impact' : ''}`} style={{ width: '240px', height: '200px', transform: `scale(${scale})`, animationDelay: `${finishDelay}s`}}>
            {isIntro && (
                <svg className="absolute bottom-[2px] left-[5px] w-[230px] h-[175px] z-0 overflow-visible" viewBox="0 0 230 175" fill="none">
                    <path d="M0,175 L230,175 L230,70 L115,0 L0,70 Z" stroke="#06b6d4" strokeWidth="2" className="anim-wireframe" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="76" y="124" width="54" height="51" stroke="#06b6d4" strokeWidth="1.5" className="anim-wireframe" style={{animationDelay: '0.2s'}} />
                    <rect x="22" y="90" width="27" height="51" stroke="#06b6d4" strokeWidth="1.5" className="anim-wireframe" style={{animationDelay: '0.4s'}} />
                </svg>
            )}

            <div className="absolute fade-anim bg-cyan-400/50 blur-[12px]" style={{ bottom: '-15px', left: '-10px', width: '260px', height: '6px', animationDelay: isIntro ? '1.5s' : '0.1s'}}></div>
            {isIntro && <div className="absolute inset-0 overflow-visible">{particles}</div>}

            {isIntro && (
                <div className="absolute bottom-[8px] left-0 w-[240px] h-[45px] z-0 pointer-events-none overflow-visible opacity-90">
                    <div className="absolute bottom-0 anim-walk-right" style={{ animationDelay: '0.2s' }}>
                        <div className="anim-bob"><EngineerIcon color="#22d3ee" /></div>
                    </div>
                    <div className="absolute bottom-0 anim-walk-left" style={{ animationDelay: '1.2s' }}>
                        <div className="anim-bob" style={{ animationDelay: '0.3s' }}><EngineerIcon color="#818cf8" flip /></div>
                    </div>
                    <div className="absolute bottom-0 left-[180px] fade-anim glitch-out" style={{ animationDelay: '2.5s', animationDuration: `${finishDelay - 2.5}s` }}>
                         <div className="anim-bob" style={{ animationDelay: '0.1s' }}><EngineerIcon color="#fbbf24" pointing /></div>
                    </div>
                </div>
            )}

            <div className={`absolute rounded-[3px] shadow-[0_5px_15px_rgba(0,0,0,0.6)] fade-anim flex flex-col justify-end z-10 ${isDark ? 'bg-zinc-800 border-t-2 border-cyan-500/60' : 'bg-slate-300 border-t-2 border-cyan-500'}`} style={{ bottom: '-10px', left: '0', width: '240px', height: '10px', animationDelay: isIntro ? '1.4s' : '0.1s'}}>
                <div className={`w-full h-[2px] ${isDark ? 'bg-cyan-400/30' : 'bg-cyan-300/50'}`}></div>
            </div>

            <div className="absolute z-10" style={{ bottom: '0', left: '6px', width: '228px', height: '105px' }}>
                {bricks.elements}
                
                <div 
                    className={`absolute rounded-t-lg fade-anim flex items-center justify-end pr-2.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)] border-2 z-20 ${isDark ? 'bg-gradient-to-br from-zinc-800 to-black border-zinc-600' : 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-400'}`}
                    style={{ bottom: '0', left: '81px', width: '54px', height: '51px', animationDelay: `${finishDelay - 0.2}s` }}
                >
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></div>
                </div>

                <div 
                    className={`absolute rounded-[4px] backdrop-blur-md overflow-hidden window-power border-2 z-20 ${isDark ? 'bg-cyan-950/40 border-cyan-400' : 'bg-white/60 border-cyan-500'}`}
                    style={{ bottom: '34px', left: '27px', width: '27px', height: '51px', animationDelay: `${finishDelay + 0.3}s` }}
                >
                   <div className={`absolute top-1/2 w-full h-[2px] ${isDark ? 'bg-cyan-400' : 'bg-cyan-500'}`}></div>
                   <div className={`absolute left-1/2 w-[2px] h-full ${isDark ? 'bg-cyan-400' : 'bg-cyan-500'}`}></div>
                   <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60 animate-shimmer-glass"></div>
                </div>
            </div>

            <div className="absolute roof-anim z-30" style={{ bottom: '102px', left: '0', width: '240px', height: '75px', animationDelay: `${finishDelay}s` }}>
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full animate-roof-flash" style={{ overflow: 'visible', animationDelay: `${finishDelay}s` }}>
                    <defs>
                        <linearGradient id="roofGradDark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#1e1b4b" />
                        </linearGradient>
                        <linearGradient id="roofGradLight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                    </defs>
                    <polygon points="0,50 50,0 100,50" fill={isDark ? "#09090b" : "#1e293b"} transform="translate(0, 4)" />
                    <polygon points="0,50 50,0 100,50" fill={isDark ? "url(#roofGradDark)" : "url(#roofGradLight)"} />
                    <polyline points="0,50 50,0 100,50" fill="none" stroke={isDark ? "#22d3ee" : "#38bdf8"} strokeWidth="1.5" strokeLinejoin="round" />
                    <polyline points="0,50 50,0" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinejoin="round" />
                </svg>
            </div>
            
        </div>
    );
};

const App = () => {
  const [isDark, setIsDark] = useState(true);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false); 

  const [currentView, setCurrentView] = useState('Overview');

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsMobile(true);
        setIsLeftOpen(false);
        setIsRightOpen(false);
      } else {
        setIsMobile(false);
        setIsLeftOpen(true);
        setIsRightOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      const fadeTimer = setTimeout(() => setIntroFading(true), 6000);
      const removeTimer = setTimeout(() => setShowIntro(false), 6800);
      return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  return (
    <>
      {showIntro && (
          <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dashboard blueprint-grid transition-all duration-700 ease-in-out overflow-hidden ${introFading ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
              <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '5s' }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 via-transparent to-transparent blur-3xl opacity-60"></div>

              <div className="flex flex-col items-center justify-center w-full relative z-10" style={{ transform: 'translateY(-5%)' }}>
                  <div className="flex justify-center items-end relative mb-12" style={{ height: '240px', width: '340px' }}>
                      <AnimatedHouse isDark={true} scale={1.25} isIntro={true} />
                  </div>
                  <div className="flex flex-col items-center opacity-0 animate-fade-in-up mt-6" style={{ animationDelay: '4.5s' }}>
                      <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] mb-1 laser-text">CIVISMETRIC</h1>
                      <div className="w-[120%] h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] mb-3"></div>
                      <h2 className="text-gray-300 text-[10px] sm:text-[12px] tracking-[0.5em] uppercase font-semibold drop-shadow-md">Architecting The Future</h2>
                  </div>
              </div>
          </div>
      )}

      <div className={`w-full h-screen max-w-[1600px] lg:rounded-[2rem] flex overflow-hidden relative transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] mx-auto ${isDark ? 'bg-dashboard shadow-premium-dark' : 'bg-lightdash shadow-premium-light'} ${showIntro && !introFading ? 'scale-90 opacity-0 blur-lg' : 'scale-100 opacity-100 blur-0'}`}>
        
        <Sidebar isOpen={isLeftOpen} isMobile={isMobile} closeMobile={() => setIsLeftOpen(false)} isDark={isDark} activeView={currentView} setActiveView={setCurrentView} />
        
        <main className={`flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden relative transition-colors duration-400 z-10 ${isDark ? 'bg-[#050b1a]' : 'bg-slate-50'}`}>

            {isDark ? (
                <>
                    <div className="absolute top-0 left-1/4 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-purple-600/15 blur-[100px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 right-1/4 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none"></div>
                </>
            ) : (
                <>
                    <div className="absolute top-0 left-1/4 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-indigo-200/40 blur-[100px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 right-1/4 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-cyan-200/40 blur-[120px] rounded-full pointer-events-none"></div>
                </>
            )}

          <DashboardHeader 
            toggleLeft={() => setIsLeftOpen(!isLeftOpen)} 
            toggleRight={() => {
                if (isMobile) setIsRightOpen(true);
                else setIsRightOpen(!isRightOpen);
            }} 
            isDark={isDark}
            toggleTheme={() => setIsDark(!isDark)}
            title={currentView}
          />
          
          <div className="flex-1 flex flex-col xl:flex-row gap-6 overflow-hidden">
            
            <div className="flex-1 overflow-y-auto custom-scroll pr-2 lg:pr-4 pb-20 z-10 transition-all duration-500">
              
              {currentView === 'Bricks Calculator' ? (
                <BricksCalculator />

              ) : currentView === 'Foundation Calculator' ? (
                <FoundationCalculator />

              ) : currentView === 'Excavation Calculator' ? (
                <ExcavationCalculator />
              ) : currentView === 'Column Calculator' ? ( 
                <ColumnCalculator />

              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                  <CalculatorCard title="Cement Mix" delay="0ms">
                    <InputBlock label="Volume Required (m³)" value="12.5" />
                    <SliderBlock label="Grade Ratio" value="1.50" max={5} />
                    <ResultBlock label="Estimated Cost" value="3,050.00" />
                    <div className="flex items-center gap-4 mt-1">
                        <DonutChartStatic color1="#06b6d4" color2="#6366f1" color3="#f43f5e" isDark={isDark} />
                        <LegendBlock items={[
                            { label: 'Cement', colorClass: 'bg-cyan-500' },
                            { label: 'Sand', colorClass: 'bg-indigo-500' },
                            { label: 'Bricks', colorClass: 'bg-rose-500' }
                        ]} />
                    </div>
                  </CalculatorCard>
                  <CalculatorCard title="Slab Pour" delay="100ms">
                    <InputBlock label="Surface Area (sq ft)" value="1,200" />
                    <SliderBlock label="Thickness (in)" value="6.0" max={12} />
                    <ResultBlock label="Estimated Cost" value="3,560.00" />
                    <div className="flex items-center gap-4 mt-1">
                        <DonutChartStatic color1="#06b6d4" color2="#6366f1" color3="#f59e0b" isDark={isDark} />
                        <LegendBlock items={[
                            { label: 'Cement', colorClass: 'bg-cyan-500' },
                            { label: 'Sand', colorClass: 'bg-indigo-500' },
                            { label: 'Aggregate', colorClass: 'bg-amber-500' }
                        ]} />
                    </div>
                  </CalculatorCard>
                  <CalculatorCard title="Structural Beam" delay="200ms">
                    <div className="grid grid-cols-2 gap-3">
                        <InputBlock label="Span (ft)" value="100" />
                        <InputBlock label="Profile" value="I-Beam" />
                    </div>
                    <SliderBlock label="Load Factor (kN)" value="2.5" max={5} />
                    <div className="flex-1 flex flex-col justify-end mt-2">
                        <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">Stress Distribution</p>
                        <AnimatedLineChartStatic isDark={isDark} />
                    </div>
                  </CalculatorCard>
                  <CalculatorCard title="Finishing Paint" delay="300ms">
                    <InputBlock label="Surface Type" value="Interior Wall" />
                    <InputBlock label="Coats Needed" value="2 Layers" />
                    <div className="space-y-2 mt-2">
                        <ResultBlock label="Materials" value="338.00" />
                        <ResultBlock label="Labor" value="85.00" />
                    </div>
                    <button className="w-full h-10 mt-auto bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
                        Generate Report
                    </button>
                  </CalculatorCard>
                  <CalculatorCard title="Plaster Estimation" delay="400ms">
                    <InputBlock label="Wall Area (sqm)" value="450" />
                    <SliderBlock label="Mix Density" value="200" max={500} />
                    <div className="flex-1 flex flex-col justify-end mt-2">
                        <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">30-Day Projection</p>
                        <VerticalBarChartStatic isDark={isDark} />
                    </div>
                  </CalculatorCard>
                  <CalculatorCard title="Material Yield" delay="500ms">
                    <InputBlock label="Gross Volume" value="3,000 kg" />
                    <ResultBlock label="Net Usable Yield" value="1,500.00" />
                    <SliderBlock label="Waste Margin (%)" value="5.0" max={15} />
                    <div className="flex-1 flex flex-col justify-end mt-2">
                        <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium mb-2">Efficiency Trend</p>
                        <ComplexLineChartStatic isDark={isDark} />
                    </div>
                  </CalculatorCard>
                </div>
              )}
            </div>
            
            {isMobile && isRightOpen && (
                <div className="fixed inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsRightOpen(false)}></div>
            )}
            <div className={`
                ${isMobile 
                  ? `fixed inset-y-0 right-0 z-50 transform transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}` 
                  : `transition-all duration-500 ease-in-out shrink-0 overflow-hidden ${isRightOpen ? 'w-[320px] lg:w-[380px] opacity-100 ml-0 xl:ml-2' : 'w-0 opacity-0 ml-0'}`
                }
            `}>
              <div className={`w-[300px] sm:w-[320px] lg:w-[380px] h-full bg-white dark:bg-cardDark border-l xl:border border-slate-200 dark:border-borderDark xl:rounded-2xl p-6 lg:p-7 flex flex-col shadow-2xl relative z-10 overflow-y-auto custom-scroll transition-colors duration-400`}>
                
                {isMobile && (
                   <button onClick={() => setIsRightOpen(false)} className="absolute top-4 right-4 p-2 text-slate-500 bg-slate-100 dark:text-zinc-400 dark:bg-zinc-800 rounded-full z-20">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                )}
                
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Live Workspace</h3>
                    {isBuilding && (
                        <button onClick={() => setIsBuilding(false)} className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-white transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Reset
                        </button>
                    )}
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  Upload CAD files or sync to cloud for real-time 3D model estimation.
                </p>
                
                <div className="flex-1 min-h-[300px] blueprint-grid bg-slate-50 dark:bg-dashboard rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden transition-all duration-300">
                   
                   {!isBuilding ? (
                       <div className="flex flex-col items-center group cursor-pointer w-full h-full justify-center" onClick={() => setIsBuilding(true)}>
                          <div className="absolute top-0 left-0 right-0 h-[1px] bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_10px_#06b6d4] -translate-y-full group-hover:animate-scan-line"></div>
                          <div className="w-16 h-16 mb-5 bg-white dark:bg-cardDark border border-slate-200 dark:border-borderDark rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-all duration-300 relative z-10">
                              <svg className="w-8 h-8 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          </div>
                          <h4 className="text-slate-800 dark:text-zinc-100 font-semibold text-sm mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Start Construction Simulation</h4>
                          <p className="text-slate-500 dark:text-zinc-500 text-xs max-w-[200px]">Click to visualize automated material stacking.</p>
                          <button className="mt-6 px-5 py-1.5 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-sm text-xs font-medium rounded-md border border-slate-200 dark:border-borderDark group-hover:border-cyan-500/50 transition-colors">Simulate Now</button>
                       </div>
                   ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center fade-anim relative z-10">
                           <div className="origin-bottom scale-90 pt-8">
                              <AnimatedHouse isDark={isDark} scale={1} isIntro={true} />
                           </div>
                       </div>
                   )}

                </div>
                
                <div className="mt-6 flex items-center justify-between p-3 bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-borderDark rounded-xl">
                  <div className="flex items-center gap-2.5">
                     <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </div>
                     <span className="text-slate-700 dark:text-zinc-300 font-medium text-xs">System Online</span>
                  </div>
                  <span className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider font-semibold tabular-nums">Sync: 2m ago</span>
                </div>
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </>
  );
};

export default App;