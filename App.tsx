import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { ChatMessage } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [currentDomain, setCurrentDomain] = useState('bny');
  
  // Initialize histories from localStorage if available, otherwise default to empty objects
  const [histories, setHistories] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem('titan_chat_histories');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load history from storage", e);
      return {};
    }
  });

  // Persist histories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('titan_chat_histories', JSON.stringify(histories));
    } catch (e) {
      console.error("Failed to save history to storage", e);
    }
  }, [histories]);

  const handleNewMessage = (msg: ChatMessage) => {
    setHistories(prev => ({
      ...prev,
      [currentDomain]: [...(prev[currentDomain] || []), msg]
    }));
  };

  const handleNewChat = () => {
    // Explicitly clear only the current domain's history (Closing the ticket/session)
    setHistories(prev => ({
      ...prev,
      [currentDomain]: []
    }));
  };

  const handleDomainChange = (domainId: string) => {
    setCurrentDomain(domainId);
    // We do NOT clear history here. This preserves the context if the user switches back.
  };

  // Retrieve the specific history for the active domain
  const currentMessages = histories[currentDomain] || [];

  return (
    <div className="flex h-screen bg-cream-50 text-slate-800 font-sans selection:bg-titan-gold/30">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentDomain={currentDomain}
        onDomainChange={handleDomainChange}
        onNewChat={handleNewChat}
      />
      
      <main className="flex-1 h-full overflow-hidden relative shadow-2xl shadow-slate-200/50 rounded-l-3xl bg-white my-2 mr-2 border border-slate-100">
        {activeTab === 'chat' ? (
          <ChatInterface 
            currentDomain={currentDomain}
            onNewMessage={handleNewMessage}
            messages={currentMessages}
          />
        ) : (
          <Dashboard messages={currentMessages} />
        )}
      </main>
    </div>
  );
}