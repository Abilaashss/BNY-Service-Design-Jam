import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, LayoutDashboard, PlusCircle, ChevronDown, Command, MoreHorizontal, Key } from 'lucide-react';
import { DOMAINS } from '../services/mockData';

interface SidebarProps {
  activeTab: 'chat' | 'dashboard';
  onTabChange: (tab: 'chat' | 'dashboard') => void;
  currentDomain: string;
  onDomainChange: (id: string) => void;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab,
  onTabChange,
  currentDomain,
  onDomainChange,
  onNewChat
}) => {
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const domainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (domainRef.current && !domainRef.current.contains(event.target as Node)) {
        setIsDomainOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangeKey = async () => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
    } else {
        alert("API Key selection is only available in the AI Studio environment. Locally, please update your .env file.");
    }
  };

  return (
    <div className="w-20 lg:w-72 bg-cream-50 flex flex-col h-full transition-all duration-500 z-10 font-sans border-r border-slate-100/50">
      {/* Brand Header */}
      <div className="p-6 pb-8 flex items-center gap-4 justify-center lg:justify-start">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-titan-dark to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 ring-1 ring-white/20 transition-transform hover:scale-105 duration-300">
          <Command className="text-titan-gold" size={18} />
        </div>
        <div className="hidden lg:block opacity-0 lg:opacity-100 transition-opacity duration-500 delay-75">
          <h1 className="text-lg font-serif font-bold text-slate-900 tracking-tight leading-none">
            Titan<span className="text-titan-gold">.</span>
          </h1>
          <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">Intelligence</p>
        </div>
      </div>

      {/* Domain Switcher */}
      <div className="px-5 mb-8 hidden lg:block" ref={domainRef}>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Workspace</div>
        <div className="relative group">
            <button
                onClick={() => setIsDomainOpen(!isDomainOpen)}
                className="w-full flex items-center justify-between bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-titan-gold/20 focus:border-titan-gold/50 font-medium shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 hover:border-slate-300 hover:shadow-md cursor-pointer"
            >
                <div className="flex items-center gap-2">
                   <span>{DOMAINS[currentDomain].logo}</span>
                   <span>{DOMAINS[currentDomain].name}</span>
                </div>
                <ChevronDown size={14} strokeWidth={2.5} className={`text-slate-400 transition-transform duration-300 ${isDomainOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDomainOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn origin-top">
                    {Object.values(DOMAINS).map(d => (
                        <button
                            key={d.id}
                            onClick={() => {
                                onDomainChange(d.id);
                                setIsDomainOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${currentDomain === d.id ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span>{d.logo}</span>
                            <span>{d.name}</span>
                            {currentDomain === d.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 space-y-2">
        <div className="px-2 mb-3 hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Menu
        </div>
        
        <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => onTabChange('chat')} 
            icon={<MessageSquare size={18} />} 
            label="Concierge" 
        />

        <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => onTabChange('dashboard')} 
            icon={<LayoutDashboard size={18} />} 
            label="Overview" 
        />
      </div>

      {/* New Chat Action */}
      <div className="px-4 mb-6">
        <button 
            onClick={onNewChat}
            className="group w-full flex items-center justify-center lg:justify-start gap-3 bg-white border border-slate-200 hover:border-titan-gold/30 hover:bg-titan-dark hover:text-white text-slate-700 px-1 py-3.5 rounded-xl transition-all duration-300 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] active:scale-[0.98]"
        >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <PlusCircle size={18} className="text-slate-600 group-hover:text-titan-gold transition-colors" />
            </div>
            <span className="hidden lg:block text-sm font-semibold tracking-tight">New Session</span>
        </button>
      </div>

      {/* User Profile / Footer */}
      <div className="p-5 border-t border-slate-100/60 bg-white/40 backdrop-blur-sm mx-2 mb-2 rounded-2xl">
        <div className="flex items-center gap-3 justify-center lg:justify-start cursor-pointer group">
          <div className="relative">
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-white border border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-600 group-hover:scale-105 transition-transform duration-300">
                AM
             </div>
             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full ring-2 ring-white"></div>
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
             <div className="text-sm font-bold text-slate-800 truncate">Alex Mercer</div>
             <div className="text-[10px] text-slate-400 font-medium group-hover:text-titan-gold transition-colors">Premium Client</div>
          </div>
          
          <button 
             onClick={handleChangeKey}
             title="Switch API Key"
             className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
             <Key size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
        active
            ? 'bg-white text-slate-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] ring-1 ring-slate-100'
            : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
        }`}
    >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-titan-gold rounded-r-full"></div>}
        <div className={`transition-all duration-300 ${active ? 'text-titan-dark scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {icon}
        </div>
        <span className={`hidden lg:block text-sm transition-all ${active ? 'font-bold tracking-tight' : 'font-medium'}`}>{label}</span>
    </button>
);