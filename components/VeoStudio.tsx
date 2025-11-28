import React, { useState, useCallback, useRef } from 'react';
import { generateVeoVideo, enhancePrompt } from '../services/geminiService';
import { AspectRatio, VideoGenerationState } from '../types';
import { IconUpload, IconSparkles, IconLoading, IconMovie } from './Icons';

interface VeoStudioProps {
  apiKeyReady: boolean;
  apiKey?: string;
}

const VeoStudio: React.FC<VeoStudioProps> = ({ apiKeyReady, apiKey }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [state, setState] = useState<VideoGenerationState>({
    isGenerating: false,
    progressMessage: '',
    videoUri: null,
    error: null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Reader result is "data:image/png;base64,....."
        // We want to store the full string to display, and extract base64 for API
        const result = reader.result as string;
        setSelectedImage(result);
        setImageMimeType(file.type);
        // Reset state on new image
        setState(prev => ({ ...prev, videoUri: null, error: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || !apiKeyReady) return;
    
    setIsEnhancing(true);
    try {
        const enhanced = await enhancePrompt(apiKey, prompt);
        setPrompt(enhanced);
    } catch (err) {
        console.error("Failed to enhance prompt", err);
        // Silently fail or minimal indication as this is a convenience feature
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !apiKeyReady) return;

    // Extract base64 part
    const base64Data = selectedImage.split(',')[1];
    
    setState({
      isGenerating: true,
      progressMessage: 'Initializing...',
      videoUri: null,
      error: null,
    });

    try {
      const videoUri = await generateVeoVideo(
        apiKey,
        prompt,
        base64Data,
        imageMimeType,
        aspectRatio,
        (msg) => setState(prev => ({ ...prev, progressMessage: msg }))
      );

      setState({
        isGenerating: false,
        progressMessage: 'Done!',
        videoUri: videoUri,
        error: null,
      });

    } catch (err: any) {
      setState({
        isGenerating: false,
        progressMessage: '',
        videoUri: null,
        error: err.message || "An unexpected error occurred",
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Controls Section */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <IconSparkles />
            Veo Animation
          </h2>
          <p className="text-zinc-400 text-sm">Upload an image and bring it to life with AI video generation.</p>
        </div>

        {/* Image Upload */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer rounded-xl border-2 border-dashed border-zinc-700 
            hover:border-blue-500 hover:bg-zinc-800/50 transition-all duration-300
            flex flex-col items-center justify-center p-8 text-center h-48
            ${selectedImage ? 'border-blue-500/50 bg-zinc-800/30' : ''}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          {selectedImage ? (
             <img 
               src={selectedImage} 
               alt="Preview" 
               className="h-full w-full object-contain rounded-lg absolute inset-0 p-2" 
             />
          ) : (
            <>
              <div className="text-zinc-500 group-hover:text-blue-400 mb-2">
                <IconUpload />
              </div>
              <p className="text-zinc-300 font-medium">Click to upload image</p>
              <p className="text-zinc-500 text-xs mt-1">PNG, JPG up to 10MB</p>
            </>
          )}
          {selectedImage && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
              <span className="text-white font-medium">Change Image</span>
            </div>
          )}
        </div>

        {/* Parameters */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-zinc-300">
                Prompt <span className="text-zinc-500">(Optional)</span>
                </label>
                <button
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt.trim() || !apiKeyReady}
                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-purple-900/10 px-2 py-1 rounded-full border border-purple-500/20"
                    title="Convert keywords into a detailed prompt with AI"
                >
                    {isEnhancing ? <IconLoading className="animate-spin h-3 w-3 text-purple-400" /> : <IconSparkles />}
                    {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type keywords (e.g., 'cyberpunk city rain') and click 'Enhance', or type a full description..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-zinc-600 resize-none h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
                className={`p-2 rounded-lg text-sm border font-medium transition-colors ${
                  aspectRatio === AspectRatio.LANDSCAPE
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                16:9 Landscape
              </button>
              <button
                onClick={() => setAspectRatio(AspectRatio.PORTRAIT)}
                className={`p-2 rounded-lg text-sm border font-medium transition-colors ${
                  aspectRatio === AspectRatio.PORTRAIT
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                9:16 Portrait
              </button>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="pt-2">
           <button
            onClick={handleGenerate}
            disabled={!selectedImage || state.isGenerating || !apiKeyReady}
            className={`
              w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all
              flex items-center justify-center gap-2
              ${!selectedImage || !apiKeyReady
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : state.isGenerating 
                  ? 'bg-blue-900/50 cursor-wait' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-900/20'
              }
            `}
           >
            {state.isGenerating ? (
              <>
                <IconLoading />
                Generating...
              </>
            ) : (
              <>
                Generate Video
              </>
            )}
           </button>
           {!apiKeyReady && (
             <p className="text-xs text-red-400 text-center mt-2">API Key required (Check Settings)</p>
           )}
        </div>
        
        {state.isGenerating && (
          <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
             <p className="text-xs text-blue-300 text-center animate-pulse">{state.progressMessage}</p>
          </div>
        )}

        {state.error && (
          <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
            <p className="text-xs text-red-300">{state.error}</p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-center p-8 min-h-[500px]">
        {state.videoUri ? (
          <div className="flex flex-col items-center animate-in fade-in duration-700 w-full h-full justify-center">
            <video 
              controls 
              autoPlay 
              loop 
              className="max-h-full max-w-full rounded-lg shadow-2xl border border-zinc-800"
              src={state.videoUri}
            />
            <a 
              href={state.videoUri} 
              download="veo_generation.mp4"
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline"
            >
              Download MP4
            </a>
          </div>
        ) : (
          <div className="text-center text-zinc-600">
            <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
               <IconMovie />
            </div>
            <h3 className="text-lg font-medium text-zinc-400">Ready to Create</h3>
            <p className="text-sm max-w-xs mx-auto mt-2">
              Upload an image on the left and hit generate to see the magic happen here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VeoStudio;