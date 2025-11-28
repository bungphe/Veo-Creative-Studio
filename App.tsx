import React, { useState, useEffect } from 'react';
import { checkApiKey, openApiKeySelection } from './services/geminiService';
import VeoStudio from './components/VeoStudio';
import AudioStudio from './components/AudioStudio';
import { AppMode } from './types';
import { IconMovie, IconMicrophone, IconAlert, IconSettings, IconKey } from './components/Icons';

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.VIDEO);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  
  // Checking for API Key on mount (checking both injected key and local custom key)
  useEffect(() => {
    const initKey = async () => {
        const hasInjectedKey = await checkApiKey();
        const storedKey = localStorage.getItem('gemini_api_key');
        
        if (storedKey) {
            setCustomApiKey(storedKey);
            setApiKeyReady(true);
        } else if (hasInjectedKey) {
            setApiKeyReady(true);
        } else {
            setApiKeyReady(false);
        }
    };
    
    initKey();
    window.addEventListener('focus', initKey);
    return () => window.removeEventListener('focus', initKey);
  }, []);

  const handleSelectKey = async () => {
    await openApiKeySelection();
    // Optimistic update
    setApiKeyReady(true);
  };

  const handleSaveCustomKey = () => {
      if (customApiKey.trim()) {
          localStorage.setItem('gemini_api_key', customApiKey.trim());
          setApiKeyReady(true);
          setShowSettings(false);
      } else {
          localStorage.removeItem('gemini_api_key');
          setApiKeyReady(false);
      }
  };

  const clearKey = () => {
      localStorage.removeItem('gemini_api_key');
      setCustomApiKey('');
      setApiKeyReady(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-white text-lg">V</span>
                </div>
                <h1 className="font-bold text-xl tracking-tight text-white">Veo Studio</h1>
            </div>

            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                    title="Settings & API Key"
                >
                    <IconSettings />
                </button>
                {!apiKeyReady ? (
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="text-xs bg-red-500/10 text-red-400 border border-red-500/50 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    >
                        <IconAlert />
                        Connect API
                    </button>
                ) : (
                    <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/50 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Ready
                    </span>
                )}
            </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8 bg-zinc-900/50 p-1 rounded-xl w-fit border border-zinc-800">
            <button
                onClick={() => setMode(AppMode.VIDEO)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === AppMode.VIDEO 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                <IconMovie />
                Video Generator
            </button>
            <button
                onClick={() => setMode(AppMode.AUDIO)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === AppMode.AUDIO 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                <IconMicrophone />
                Voiceover
            </button>
        </div>

        {/* Content */}
        <main className="animate-in fade-in duration-500">
            {mode === AppMode.VIDEO ? (
                <VeoStudio apiKeyReady={apiKeyReady} apiKey={customApiKey} />
            ) : (
                <AudioStudio apiKeyReady={apiKeyReady} apiKey={customApiKey} />
            )}
        </main>
      </div>
      
      {/* Footer Instructions for Key */}
      {!apiKeyReady && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 to-zinc-900/90 border-t border-zinc-800 flex justify-center z-40">
            <div className="max-w-md text-center">
                <p className="text-zinc-400 text-sm mb-2">To use the Veo model, you must provide a valid API Key.</p>
                <button 
                    onClick={() => setShowSettings(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline"
                >
                    Configure Settings &rarr;
                </button>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <IconSettings /> Settings
                      </h2>
                      <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">✕</button>
                  </div>

                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                             <IconKey /> Gemini API Key
                          </label>
                          <p className="text-xs text-zinc-500 mb-3">
                              Paste your Google Gemini API Key here to use the application functionality.
                          </p>
                          <input 
                            type="password" 
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-zinc-700"
                          />
                      </div>

                      <div className="flex gap-3">
                          <button 
                             onClick={handleSaveCustomKey}
                             className="flex-1 bg-white text-black font-bold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors"
                          >
                              Save Key
                          </button>
                          {customApiKey && (
                              <button 
                                onClick={clearKey}
                                className="px-4 py-2.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-900/20 text-sm font-medium"
                              >
                                  Clear
                              </button>
                          )}
                      </div>
                      
                      <div className="pt-4 border-t border-zinc-800">
                          <p className="text-xs text-zinc-500 text-center">
                              Or use the AI Studio Project Selector if available:
                          </p>
                          <button 
                            onClick={handleSelectKey}
                            className="w-full mt-2 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          >
                              Open Project Selector
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;