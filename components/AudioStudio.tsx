import React, { useState, useRef } from 'react';
import { generateTextToSpeech, generateClonedSpeech } from '../services/geminiService';
import { AudioGenerationState, VOICES, VoiceName } from '../types';
import { IconMicrophone, IconLoading, IconSettings, IconWaveform, IconUpload } from './Icons';

interface AudioStudioProps {
    apiKeyReady: boolean;
    apiKey?: string;
}

type AudioMode = 'PRESET' | 'CLONE';

const AudioStudio: React.FC<AudioStudioProps> = ({ apiKeyReady, apiKey }) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<AudioMode>('PRESET');
  
  // Preset State
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  
  // Clone State
  const [cloneFile, setCloneFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);

  const [state, setState] = useState<AudioGenerationState>({
    isGenerating: false,
    audioUrl: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alert('Please select a valid audio file (WAV, MP3)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 part
        const base64 = result.split(',')[1];
        setCloneFile({
            name: file.name,
            base64,
            mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || !apiKeyReady) return;
    if (mode === 'CLONE' && !cloneFile) return;

    setState({ isGenerating: true, audioUrl: null, error: null });

    try {
      let url: string;
      if (mode === 'PRESET') {
        url = await generateTextToSpeech(apiKey, text, selectedVoice);
      } else {
        if (!cloneFile) throw new Error("No voice sample provided");
        url = await generateClonedSpeech(apiKey, text, cloneFile.base64, cloneFile.mimeType);
      }

      setState({
        isGenerating: false,
        audioUrl: url,
        error: null,
      });
    } catch (err: any) {
      setState({
        isGenerating: false,
        audioUrl: null,
        error: err.message || "Failed to generate speech",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
       <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <IconMicrophone />
                  Voiceover Generator
              </h2>
              <p className="text-zinc-400 text-sm mb-4">Create a narration using different AI voice personas or clone a voice.</p>
              
              {/* Mode Toggle */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-fit">
                <button
                    onClick={() => setMode('PRESET')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        mode === 'PRESET' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    Preset Voices
                </button>
                <button
                    onClick={() => setMode('CLONE')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        mode === 'CLONE' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    Voice Cloning
                </button>
              </div>
          </div>
            
          {/* Controls based on mode */}
          <div className="mb-6">
              {mode === 'PRESET' ? (
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Voice Persona</label>
                    <div className="relative">
                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                            className="w-full bg-zinc-950 text-sm text-white border border-zinc-700 rounded-lg py-3 pl-3 pr-8 focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
                        >
                            {VOICES.map((v) => (
                            <option key={v.name} value={v.name}>{v.name} ({v.gender}) - {v.style}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                     <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reference Audio</label>
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            relative group cursor-pointer rounded-xl border-2 border-dashed 
                            transition-all duration-300 flex items-center justify-center p-6 text-center h-32
                            ${cloneFile ? 'border-purple-500/50 bg-zinc-800/30' : 'border-zinc-700 hover:border-purple-500 hover:bg-zinc-800/50'}
                        `}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="audio/*" 
                            className="hidden" 
                        />
                        {cloneFile ? (
                            <div className="flex flex-col items-center">
                                <div className="text-purple-400 mb-2">
                                    <IconWaveform />
                                </div>
                                <p className="text-zinc-200 font-medium text-sm truncate max-w-[200px]">{cloneFile.name}</p>
                                <p className="text-zinc-500 text-xs">Ready to clone</p>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                    <span className="text-white text-xs font-medium">Change File</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="text-zinc-500 group-hover:text-purple-400 mb-2 transition-colors">
                                    <IconUpload />
                                </div>
                                <p className="text-zinc-300 font-medium text-sm">Upload Reference Voice</p>
                                <p className="text-zinc-500 text-xs mt-1">WAV or MP3 (max 10MB)</p>
                            </div>
                        )}
                    </div>
                </div>
              )}
          </div>

          <div className="space-y-4">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={mode === 'PRESET' ? "Type your script here..." : "Type text for the cloned voice to speak..."}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600 resize-none h-40"
            />
            
            <button
                onClick={handleGenerate}
                disabled={!text.trim() || state.isGenerating || !apiKeyReady || (mode === 'CLONE' && !cloneFile)}
                className={`
                w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all
                flex items-center justify-center gap-2
                ${(!text.trim() || !apiKeyReady || (mode === 'CLONE' && !cloneFile))
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : state.isGenerating 
                    ? 'bg-purple-900/50 cursor-wait' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                }
                `}
            >
                {state.isGenerating ? <><IconLoading /> Generating Audio...</> : 'Generate Voiceover'}
            </button>

            {state.error && (
                <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                    <p className="text-xs text-red-300">{state.error}</p>
                </div>
            )}
          </div>
       </div>

       {state.audioUrl && (
         <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-medium text-white mb-4">Result</h3>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                      Mode: <span className="text-white font-medium">{mode === 'PRESET' ? selectedVoice : 'Cloned Voice'}</span>
                  </span>
                </div>
                <audio controls src={state.audioUrl} className="w-full" />
            </div>
            <div className="mt-4 flex justify-end">
                <a 
                    href={state.audioUrl} 
                    download={`voiceover_${mode === 'PRESET' ? selectedVoice : 'clone'}.wav`}
                    className="text-sm font-medium text-purple-400 hover:text-purple-300"
                >
                    Download WAV
                </a>
            </div>
         </div>
       )}
    </div>
  );
};

export default AudioStudio;
