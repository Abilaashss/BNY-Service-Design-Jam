import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ArrowRight, Loader2, ChevronRight, Activity, Zap, Landmark, Brain, ShieldAlert, Clock, CheckCircle2, FileSearch, ChevronDown, ChevronUp, AlertOctagon, Check, Users } from 'lucide-react';
import { ChatMessage, ProcessingStep, AgentType } from '../types';
import { processUserRequest } from '../services/geminiService';
import { DOMAINS } from '../services/mockData';

interface ChatInterfaceProps {
  currentDomain: string;
  onNewMessage: (msg: ChatMessage) => void;
  messages: ChatMessage[];
}

// Queries tailored for initial prompt based on domain
const STARTER_QUERIES: Record<string, { text: string, label: string }[]> = {
  bny: [
    { text: "Status of wire transfer TXN-88291?", label: "Track Transfer" },
    { text: "My compliance alert regarding Singapore login?", label: "Security Alert" },
    { text: "Rebalance my portfolio for Q3 based on recommendations.", label: "Portfolio Action" },
  ],
  zepto: [
    { text: "Where is my order ZEP-9921? It's late.", label: "Track Order" },
    { text: "I received spoiled milk in my last delivery.", label: "Report Issue" },
    { text: "Do you have any promo codes for today?", label: "Offers" },
  ]
};

// --- Helper Component: Agent Step Visualization ---
const AgentStepItem = ({ step, isLast }: { step: ProcessingStep; isLast: boolean }) => {
  const getIcon = () => {
    switch (step.agent) {
      case AgentType.MASTER: return <Brain size={14} />;
      case AgentType.RISK: return <ShieldAlert size={14} />;
      case AgentType.SLA: return <Clock size={14} />;
      case AgentType.VALIDATION: return <CheckCircle2 size={14} />;
      case AgentType.SYSTEM: return <Users size={14} />;
      default: return <FileSearch size={14} />;
    }
  };

  const getColor = () => {
    if (step.status === 'warning') return 'text-amber-500 bg-amber-50 border-amber-100';
    if (step.status === 'error') return 'text-red-500 bg-red-50 border-red-100';
    if (step.status === 'success') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    return 'text-blue-500 bg-blue-50 border-blue-100'; // pending
  };

  return (
    <div className="relative flex items-start gap-4 z-10">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-slate-100 z-0"></div>
      )}

      {/* Icon Node */}
      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300 ${getColor()} ${step.status === 'pending' ? 'animate-pulse' : ''}`}>
        {step.status === 'pending' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <div className="relative flex items-center justify-center w-full h-full animate-fadeIn">
            {getIcon()}
            {/* Success Tick Badge */}
            {step.status === 'success' && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-[2px] border-2 border-white animate-scaleIn">
                <Check size={6} className="text-white stroke-[4]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 py-1">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{step.agent}</span>
          <span className="text-[9px] text-slate-400 font-mono">
            {new Date(step.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.message}</p>
        {step.details && (
          <div className="mt-1.5 p-2 bg-slate-50 rounded text-[10px] text-slate-500 font-mono border border-slate-100">
            {step.details}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentDomain, onNewMessage, messages }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<ProcessingStep[]>([]);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentSteps]);

  const toggleTrace = (id: string) => {
    setExpandedTraceId(prev => prev === id ? null : id);
  };

  const handleSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToSend = overrideText || input;

    if (!textToSend.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    onNewMessage(userMsg);
    setInput('');
    setIsProcessing(true);
    setCurrentSteps([]); // Reset steps for new flow

    // Use a local array to track steps, updating existing agents instead of appending
    // This ensures the UI transitions from Pending -> Success for the same item
    let localSteps: ProcessingStep[] = [];

    try {
      const result = await processUserRequest(
        userMsg.content,
        messages,
        currentDomain,
        (step) => {
          // Check if we already have a step for this agent
          const existingIndex = localSteps.findIndex(s => s.agent === step.agent);

          if (existingIndex !== -1) {
            // Update existing step
            localSteps[existingIndex] = step;
          } else {
            // Add new step
            localSteps.push(step);
          }

          // Update State with a new array reference
          setCurrentSteps([...localSteps]);
          scrollToBottom();
        }
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result.response,
        timestamp: Date.now(),
        processingSteps: [...localSteps], // Use the final local state
        metadata: result.metadata,
        suggestedActions: result.suggestedActions
      };

      onNewMessage(botMsg);
      setIsProcessing(false);
      setCurrentSteps([]); // Clear visualizer

    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const domain = DOMAINS[currentDomain];
  const starters = STARTER_QUERIES[currentDomain] || STARTER_QUERIES['bny'];

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans rounded-r-3xl">

      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-3 shadow-sm border border-slate-100 bg-white">
            <img src={domain.logo} alt={domain.name} className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {domain.name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs font-medium text-slate-500">Titan Agent Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-10 z-10 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center animate-fadeIn">
            <div className="w-20 h-20 bg-gradient-to-tr from-slate-100 to-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50 border border-slate-100">
              <Sparkles className="text-titan-gold" size={40} />
            </div>
            <h3 className="text-2xl font-serif font-medium text-slate-900 mb-3">Welcome, Alex.</h3>
            <p className="text-slate-500 text-sm max-w-md text-center mb-10 leading-relaxed">
              I am Titan, your {domain.name} intelligent assistant. <br />
              I can help with transactions, orders, and priority support.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full px-4">
              {starters.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(undefined, q.text)}
                  className="text-left p-5 bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-2xl transition-all duration-300 group shadow-sm hover:shadow-md"
                >
                  <span className="text-xs font-bold text-titan-gold mb-2 block uppercase tracking-wider">{q.label}</span>
                  <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2">{q.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group animate-fadeIn`}>
            <div className={`flex gap-4 max-w-[95%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Message Bubble */}
              <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-sm transition-all ${msg.role === 'user'
                ? 'bg-slate-900 text-white rounded-tr-sm'
                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-md shadow-slate-100'
                }`}>
                {msg.content}

                {/* Structured Validation Flag */}
                {msg.role === 'model' && msg.metadata?.validationPassed === false && (
                  <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 w-fit">
                    <AlertOctagon size={14} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Flagged for Review</span>
                      <span className="text-[10px] opacity-80 leading-tight">{msg.metadata.validationReason || "Quality check failed"}</span>
                    </div>
                  </div>
                )}

                {/* Agent Trace (Collapsed by default for history) */}
                {msg.role === 'model' && msg.processingSteps && msg.processingSteps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100/50">
                    <button
                      onClick={() => toggleTrace(msg.id)}
                      className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 hover:text-titan-gold transition-colors"
                    >
                      {expandedTraceId === msg.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {expandedTraceId === msg.id ? "Hide Agent Trace" : "View Agent Decision Flow"}
                    </button>

                    {expandedTraceId === msg.id && (
                      <div className="mt-4 space-y-4 animate-fadeIn">
                        {msg.processingSteps.map((step, idx) => (
                          <AgentStepItem
                            key={idx}
                            step={step}
                            isLast={idx === msg.processingSteps!.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Actions */}
            {msg.role === 'model' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 animate-fadeIn pl-2">
                {msg.suggestedActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(undefined, action.text)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    {action.type === 'data' ? <Activity size={14} className="text-titan-gold" /> : <ChevronRight size={14} />}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Live Processing Indicator */}
        {isProcessing && (
          <div className="flex justify-start animate-fadeIn w-full">
            <div className="max-w-[80%] bg-white border border-slate-100 rounded-3xl rounded-tl-sm p-6 shadow-md shadow-slate-100/50">
              <div className="flex items-center gap-2 mb-6">
                <Loader2 size={16} className="animate-spin text-titan-gold" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Processing Agent Flow
                </span>
              </div>

              <div className="space-y-4">
                {currentSteps.length === 0 ? (
                  <div className="text-xs text-slate-400 italic pl-2">Initializing agents...</div>
                ) : (
                  currentSteps.map((step, idx) => (
                    <AgentStepItem
                      key={idx}
                      step={step}
                      isLast={idx === currentSteps.length - 1}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 md:p-8 bg-white z-20">
        <div className="max-w-4xl mx-auto relative">
          <form onSubmit={(e) => handleSubmit(e)} className="relative flex gap-4 items-center group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Titan anything..."
              disabled={isProcessing}
              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 pl-6 pr-16 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-3 top-3 bottom-3 aspect-square bg-slate-900 hover:bg-black text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-slate-900/20 active:scale-90"
            >
              <ArrowRight size={20} />
            </button>
          </form>
          <div className="text-center mt-4 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Titan Powered • BNY Enterprise Security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};