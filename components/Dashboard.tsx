import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { ChatMessage, IntentType, RiskLevel } from '../types';
import { 
  AlertTriangle, Users, Clock, Shield, 
  Filter, Briefcase, FileText, Activity, CheckCircle, Zap, ChevronDown 
} from 'lucide-react';

interface DashboardProps {
  messages: ChatMessage[];
}

const FilterDropdown = ({ 
    icon: Icon, 
    value, 
    options, 
    onChange, 
    label 
}: { 
    icon: any, 
    value: string, 
    options: string[], 
    onChange: (val: string) => void, 
    label: string 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
                <Icon size={14} className="text-slate-400" />
                <span>{value === 'ALL' ? label : value}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn origin-top-right">
                    <button 
                         onClick={() => { onChange('ALL'); setIsOpen(false); }}
                         className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${value === 'ALL' ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        {label}
                    </button>
                    <div className="h-px bg-slate-50 mx-2"></div>
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${value === opt ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ messages }) => {
  const [filterIntent, setFilterIntent] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterSLA, setFilterSLA] = useState<string>('ALL');

  // Compute real-time stats from messages with filters
  const stats = useMemo(() => {
    // 1. Filter Messages
    const filteredMessages = messages.filter(m => {
      if (m.role !== 'model' || !m.metadata) return false;
      const meta = m.metadata;
      
      const matchIntent = filterIntent === 'ALL' || meta.intent === filterIntent;
      const matchRisk = filterRisk === 'ALL' || meta.riskLevel === filterRisk;
      const matchSLA = filterSLA === 'ALL' || (filterSLA === 'BREACH' && meta.slaBreachPredicted);
      
      return matchIntent && matchRisk && matchSLA;
    });

    const total = filteredMessages.length;
    
    // Initialize Stats
    const intentDist: Record<string, number> = {};
    const riskDist: Record<string, number> = {};
    const teamLoad: Record<string, number> = {};
    const teamIntentMap: Record<string, Record<string, number>> = {};

    let highRiskCount = 0;
    let slaBreachesPrevented = 0;
    let feedbackCount = 0;

    // Process Metrics
    filteredMessages.forEach(msg => {
      const meta = msg.metadata!;
      
      // Intent Dist
      if (meta.intent) {
        intentDist[meta.intent] = (intentDist[meta.intent] || 0) + 1;
        if (meta.intent === IntentType.FEEDBACK) feedbackCount++;
      }
      
      // Risk Dist
      if (meta.riskLevel) riskDist[meta.riskLevel] = (riskDist[meta.riskLevel] || 0) + 1;
      
      // Flags
      if (meta.riskLevel === RiskLevel.HIGH || meta.riskLevel === RiskLevel.CRITICAL) {
        highRiskCount++;
      }
      if (meta.slaBreachPredicted) {
        slaBreachesPrevented++;
      }

      // Team Load & Intent Mapping
      if (meta.notifiedTeams) {
        meta.notifiedTeams.forEach(team => {
          teamLoad[team] = (teamLoad[team] || 0) + 1;
          
          if (!teamIntentMap[team]) teamIntentMap[team] = {};
          const intentKey = meta.intent || 'Unknown';
          teamIntentMap[team][intentKey] = (teamIntentMap[team][intentKey] || 0) + 1;
        });
      }
    });

    return {
      totalInteractions: total,
      slaBreachesPrevented,
      highRiskFlags: highRiskCount,
      feedbackCount,
      intentDistribution: intentDist,
      riskDistribution: riskDist,
      teamLoad,
      teamIntentMap,
      filteredMessages
    };
  }, [messages, filterIntent, filterRisk, filterSLA]);

  // Data for Charts
  const riskData = Object.entries(stats.riskDistribution).map(([name, value]) => ({ name, value }));
  
  // Transform Team Data for Stacked Bar Chart
  const teamChartData = Object.keys(stats.teamLoad)
    .map(team => {
      const intents = stats.teamIntentMap[team] || {};
      return {
        name: team,
        total: stats.teamLoad[team],
        [IntentType.QUERY]: intents[IntentType.QUERY] || 0,
        [IntentType.FEEDBACK]: intents[IntentType.FEEDBACK] || 0,
        [IntentType.COMPLAINT]: intents[IntentType.COMPLAINT] || 0,
        [IntentType.UNKNOWN]: intents[IntentType.UNKNOWN] || 0,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6); // Top 6 teams

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const INTENT_COLORS: Record<string, string> = {
    [IntentType.QUERY]: '#94a3b8', // Slate 400
    [IntentType.FEEDBACK]: '#8b5cf6', // Violet 500
    [IntentType.COMPLAINT]: '#ef4444', // Red 500
    [IntentType.UNKNOWN]: '#cbd5e1', // Slate 300
  };
  
  const RISK_COLORS: Record<string, string> = {
    [RiskLevel.LOW]: '#10b981',
    [RiskLevel.MEDIUM]: '#f59e0b',
    [RiskLevel.HIGH]: '#f97316',
    [RiskLevel.CRITICAL]: '#ef4444',
  };

  return (
    <div className="h-full overflow-y-auto bg-white p-8 space-y-8 rounded-r-3xl">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-slate-100 pb-6 gap-6">
        <div>
           <h2 className="text-3xl font-serif font-bold text-slate-900">Operational Command</h2>
           <p className="text-slate-500 mt-1">Real-time monitoring of agent routing and team deployment.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Intent Filter */}
            <FilterDropdown 
                icon={Filter}
                label="All Intents"
                value={filterIntent}
                options={Object.values(IntentType)}
                onChange={setFilterIntent}
            />

            {/* Risk Filter */}
            <FilterDropdown 
                icon={Activity}
                label="All Risk Levels"
                value={filterRisk}
                options={Object.values(RiskLevel)}
                onChange={setFilterRisk}
            />

            {/* SLA Filter */}
            <FilterDropdown 
                icon={Clock}
                label="All SLA Status"
                value={filterSLA}
                options={['BREACH']}
                onChange={setFilterSLA}
            />

            <div className="flex items-center gap-2 text-xs text-titan-gold font-bold bg-cream-50 px-3 py-2 rounded-lg border border-slate-100 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                Live
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Briefcase size={16} />
                </div>
                <span className="text-xs font-bold text-slate-400">TOTAL</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalInteractions}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Filtered Tickets</p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                    <Zap size={16} />
                </div>
                 <span className="text-xs font-bold text-slate-400">FEEDBACK</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.feedbackCount}</h3>
             <p className="text-[10px] text-slate-400 font-medium">Feature Requests & Feedback</p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                    <AlertTriangle size={16} />
                </div>
                 <span className="text-xs font-bold text-slate-400">CRITICAL</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.highRiskFlags}</h3>
             <p className="text-[10px] text-slate-400 font-medium">High Risk Incidents</p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                    <Shield size={16} />
                </div>
                 <span className="text-xs font-bold text-slate-400">SLA SAVED</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.slaBreachesPrevented}</h3>
             <p className="text-[10px] text-slate-400 font-medium">Potential Breaches Averted</p>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         
         {/* Team Workload Chart (Stacked) */}
         <div className="xl:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    <Users size={16} className="text-titan-gold"/>
                    Departmental Load & Routing
                </h3>
                <div className="flex gap-3 text-[10px] font-medium">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Query</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Feedback</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Complaint</div>
                </div>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamChartData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={100} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar dataKey={IntentType.QUERY} stackId="a" fill={INTENT_COLORS[IntentType.QUERY]} radius={[0,0,0,0]} barSize={20} />
                        <Bar dataKey={IntentType.FEEDBACK} stackId="a" fill={INTENT_COLORS[IntentType.FEEDBACK]} radius={[0,0,0,0]} barSize={20} />
                        <Bar dataKey={IntentType.COMPLAINT} stackId="a" fill={INTENT_COLORS[IntentType.COMPLAINT]} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* Risk Distribution */}
         <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
                <Activity size={16} className="text-titan-gold"/>
                Risk Profile
            </h3>
            <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={riskData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {riskData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name as string] || COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Incident Log Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <FileText size={16} className="text-titan-gold"/>
                Live Operational Log
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">Showing last {stats.filteredMessages.length} entries</span>
        </div>
        <div className="overflow-x-visible pb-12">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4 border-b border-slate-100">Timestamp</th>
                        <th className="px-6 py-4 border-b border-slate-100">Message Summary</th>
                        <th className="px-6 py-4 border-b border-slate-100">Intent</th>
                        <th className="px-6 py-4 border-b border-slate-100">Risk</th>
                        <th className="px-6 py-4 border-b border-slate-100">SLA Status</th>
                        <th className="px-6 py-4 border-b border-slate-100">Teams Notified</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                    {[...stats.filteredMessages].reverse().map((msg) => {
                         const meta = msg.metadata!;
                         // Calculate Deadline
                         const breachDeadline = new Date(msg.timestamp + (meta.slaTargetHours || 24) * 60 * 60 * 1000);
                         
                         return (
                            <tr key={msg.id} className="hover:bg-cream-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate text-slate-600 font-medium" title={msg.content}>
                                    {msg.content}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        meta.intent === IntentType.FEEDBACK ? 'bg-purple-100 text-purple-800' : 
                                        meta.intent === IntentType.COMPLAINT ? 'bg-red-100 text-red-800' : 
                                        'bg-slate-100 text-slate-800'
                                    }`}>
                                        {meta.intent}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span 
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                        style={{ 
                                            borderColor: RISK_COLORS[meta.riskLevel!] + '40',
                                            backgroundColor: RISK_COLORS[meta.riskLevel!] + '10',
                                            color: RISK_COLORS[meta.riskLevel!]
                                        }}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS[meta.riskLevel!] }}></span>
                                        {meta.riskLevel}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                  {meta.slaBreachPredicted ? (
                                    <div className="group relative flex items-center cursor-help w-fit">
                                       <div className="bg-red-50 text-red-600 p-1.5 rounded-lg border border-red-100 animate-pulse">
                                          <Clock size={16} />
                                       </div>
                                       {/* Enhanced Tooltip */}
                                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-900 text-white text-xs rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl ring-1 ring-white/10">
                                           <div className="font-bold text-red-300 mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                                             <AlertTriangle size={14} /> Potential Breach Detected
                                           </div>
                                           
                                           <div className="space-y-3">
                                               <div>
                                                 <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Breach Deadline</span>
                                                 <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                                     <span className="text-slate-300">Target Time:</span>
                                                     <span className="font-mono text-white font-bold">{meta.slaTargetHours}h</span>
                                                 </div>
                                                 <div className="mt-1 text-right text-[10px] text-red-400">
                                                     Due by: {breachDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                 </div>
                                               </div>

                                               <div>
                                                 <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Reason</span>
                                                 <div className="text-slate-300 leading-snug bg-white/5 p-2 rounded-lg border border-white/5">
                                                     {meta.slaReason || "Critical risk parameters detected"}
                                                 </div>
                                               </div>

                                               <div>
                                                 <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold block mb-1">Breach Summary</span>
                                                 <div className="text-slate-400 italic text-[10px] leading-relaxed line-clamp-3">
                                                     "{msg.content.substring(0, 100)}{msg.content.length > 100 ? '...' : ''}"
                                                 </div>
                                               </div>
                                           </div>
                                           <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                                       </div>
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 flex items-center gap-1.5 group relative w-fit">
                                        <div className="bg-green-50 text-green-600 p-1.5 rounded-lg border border-green-100">
                                            <CheckCircle size={16} />
                                        </div>
                                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 bg-white border border-slate-100 text-slate-600 text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                            <div className="font-semibold text-slate-800 mb-1">On Track</div>
                                            <div className="text-slate-500">Target: {meta.slaTargetHours}h</div>
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-white border-b border-r border-slate-100"></div>
                                        </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {meta.notifiedTeams?.map((team, idx) => (
                                            <span key={idx} className={`text-[10px] font-medium border px-2 py-1 rounded shadow-sm ${
                                                meta.intent === IntentType.FEEDBACK 
                                                    ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                                    : 'bg-white text-slate-600 border-slate-200'
                                            }`}>
                                                {team}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                         );
                    })}
                    {stats.filteredMessages.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                No interactions found matching selected filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};