import React, { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageWorkspace } from './components/ImageWorkspace';
import { getTextContent, generateProductShot, modifyImage, getStyleReferencePrompt, getProductVibePrompt } from './services/geminiService';
import { Lightbox } from './components/Lightbox';
import { HistoryPanel } from './components/HistoryPanel';
import { HistoryIcon, LayersIcon } from './components/icons'; // Added LayersIcon
import { TextOverlayApp } from './components/TextOverlayApp'; // New component
import {
  ASPECT_RATIOS,
  RESOLUTIONS,
  CAMERA_ANGLES,
  LENSES,
  APERTURES,
  LIGHTING_TYPES,
  LIGHTING_DIRECTIONS,
  SURFACES,
  BACKGROUNDS,
  SHADOWS,
  REFLECTIONS,
  COLOR_STYLES,
  COMPOSITIONS,
} from './constants';


function App() {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [styleReferencePrompt, setStyleReferencePrompt] = useState<string | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [useStyleReference, setUseStyleReference] = useState(false);
  const [matchProductVibe, setMatchProductVibe] = useState(false);
  const [productVibePrompt, setProductVibePrompt] = useState<string | null>(null);
  const [isAnalyzingVibe, setIsAnalyzingVibe] = useState(false);

  // --- Generation Settings State ---
  const [addSocialText, setAddSocialText] = useState(false); // Default to false as per new instructions
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[1]); // 4:5
  const [resolution, setResolution] = useState(RESOLUTIONS[1]); // 1080x1350
  const [cameraAngle, setCameraAngle] = useState(CAMERA_ANGLES[3]); // 45° hero angle
  const [lens, setLens] = useState(LENSES[1]); // 50mm
  const [depthOfField, setDepthOfField] = useState(APERTURES[2]); // f/5.6
  const [lightingType, setLightingType] = useState(LIGHTING_TYPES[0]); // Natural window light
  const [lightingDirection, setLightingDirection] = useState(LIGHTING_DIRECTIONS[0]); // Left
  const [surface, setSurface] = useState(SURFACES[4]); // Marble (white or grey)
  const [background, setBackground] = useState(BACKGROUNDS[1]); // Off-white studio
  const [shadow, setShadow] = useState(SHADOWS[0]); // Soft contact shadow
  const [reflection, setReflection] = useState(REFLECTIONS[0]); // None
  const [colorStyle, setColorStyle] = useState(COLOR_STYLES[0]); // Neutral
  const [composition, setComposition] = useState(COMPOSITIONS[0]); // Center framed
  const [outputPng, setOutputPng] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Output State ---
  const [infotainmentText, setInfotainmentText] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [jsonSummary, setJsonSummary] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // --- History State ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // --- API Key State ---
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null means not yet checked

  // --- Text Overlay Mode State ---
  const [isTextOverlayMode, setIsTextOverlayMode] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const keySelected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(keySelected);
      } else {
        // Fallback for local development if aistudio API is not available
        console.warn("window.aistudio API not available. Assuming API_KEY is set via environment.");
        setHasApiKey(true); // Assume true for local development if AISTudio APIs are missing
      }
    };
    checkKey();
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // As per rules, assume success and proceed. The actual key will be in process.env.API_KEY.
      setHasApiKey(true);
      setError(null); // Clear any previous API key error
    } else {
      setError("AI Studio API for key selection not available.");
    }
  };

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('generationHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    // Clear product vibe prompt if product image is cleared
    if (!productImage) {
      setProductVibePrompt(null);
      setIsAnalyzingVibe(false);
    }
  }, [productImage]);

  useEffect(() => {
    // Clear style reference prompt if style reference image is cleared
    if (!styleReferenceImage) {
      setStyleReferencePrompt(null);
      setIsAnalyzingStyle(false);
    }
    // Disable matchProductVibe if useStyleReference is false
    if (!useStyleReference) {
      setMatchProductVibe(false);
    }
  }, [styleReferenceImage, useStyleReference]);

  const addToHistory = (newImage: string) => {
    const maxHistoryItems = 5; // Reduced from 20 to 5 to mitigate localStorage quota issues
    const newHistory = [newImage, ...history].slice(0, maxHistoryItems);
    setHistory(newHistory);
    try {
      localStorage.setItem('generationHistory', JSON.stringify(newHistory));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn("localStorage quota exceeded. Clearing history from localStorage to free space.");
        localStorage.removeItem('generationHistory'); // Clear the problematic entry
        setError("History storage full. Only current session history will be kept."); // Set a user-facing error
      } else {
        console.error("Failed to save history to localStorage:", e);
        setError("Failed to save history."); // Generic error
      }
      // Note: The in-memory `history` state is still updated, so it works for the current session.
      // This ensures the user doesn't lose history *immediately* within the same tab,
      // but it won't persist if the tab is closed/reloaded.
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('generationHistory');
  };

  const clearOutputs = () => {
    setInfotainmentText(null);
    setGeneratedImage(null);
    setExtractedText(null);
    setFinalPrompt(null);
    setJsonSummary(null);
    setError(null);
  };
  
  const handleSetStyleReferenceImage = async (img: string | null) => {
    setStyleReferenceImage(img);
    setStyleReferencePrompt(null); // Clear previous prompt
    if (img) {
      setIsAnalyzingStyle(true);
      setError(null);
      try {
        const promptJson = await getStyleReferencePrompt(img);
        const formattedPrompt = `
- Environment: ${promptJson.Environment || 'N/A'}
- Lighting: ${promptJson.Lighting || 'N/A'}
- Colors: ${promptJson.Colors || 'N/A'}
- Camera framing: ${promptJson['Camera framing'] || 'N/A'}
- Texture & materials: ${promptJson['Texture & materials'] || 'N/A'}
- Atmosphere: ${promptJson.Atmosphere || 'N/A'}
        `.trim();
        setStyleReferencePrompt(formattedPrompt);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        if (message.includes("Requested entity was not found.")) { 
          setError("API Key invalid or not found. Please select a valid key.");
          setHasApiKey(false); // Reset API key selection state
        } else {
          setError(`Failed to analyze style reference: ${message}`);
        }
      } finally {
        setIsAnalyzingStyle(false);
      }
    }
  };

  const handleSetProductImage = async (img: string | null) => {
    setProductImage(img);
    clearOutputs();
    setProductVibePrompt(null); // Clear previous vibe
    if (img) {
      setIsAnalyzingVibe(true);
      setError(null);
      try {
        const vibe = await getProductVibePrompt(img);
        setProductVibePrompt(vibe);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        if (message.includes("Requested entity was not found.")) { 
          setError("API Key invalid or not found. Please select a valid key.");
          setHasApiKey(false); // Reset API key selection state
        } else {
          setError(`Failed to analyze product vibe: ${message}`);
        }
      } finally {
        setIsAnalyzingVibe(false);
      }
    }
  }

  const handleGenerate = async () => {
    if (!productImage) {
      setError("Please upload a product image first.");
      return;
    }
    
    setIsLoading(true);
    clearOutputs();
    
    try {
      const { extractedText } = await getTextContent(productImage); // Only extract text
      setExtractedText(extractedText);
      setInfotainmentText(null); // Ensure infotainment text is always null

      const settings = {
        productImageBase64: productImage,
        styleReferenceBase64: useStyleReference ? styleReferenceImage : null,
        styleReferencePrompt: useStyleReference ? styleReferencePrompt : null,
        matchProductVibe: useStyleReference && matchProductVibe, // Only active if style reference is also used
        productVibePrompt: useStyleReference && matchProductVibe ? productVibePrompt : null,
        addSocialText: false, // Always false as feature is removed
        infotainmentText: '', // Empty string as feature is removed
        aspectRatio,
        resolution,
        cameraAngle,
        lens,
        depthOfField,
        lightingType,
        lightingDirection,
        surface,
        background,
        shadow,
        reflection,
        colorStyle,
        composition,
        outputPng,
      };

      const { generatedImage, finalImagePrompt, jsonSummary } = await generateProductShot(settings);

      const imageUrl = `data:image/png;base66,${generatedImage}`;
      setGeneratedImage(imageUrl);
      setFinalPrompt(finalImagePrompt);
      setJsonSummary(jsonSummary);
      addToHistory(imageUrl);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      if (message.includes("Requested entity was not found.")) { 
        setError("API Key invalid or not found. Please select a valid key.");
        setHasApiKey(false); // Reset API key selection state
      } else {
        setError(`Failed to generate: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyImage = async (baseImageUrl: string, prompt: string) => {
    if (!baseImageUrl) return;
    setIsModifying(true);
    setError(null);
    try {
        const modifiedImage = await modifyImage(baseImageUrl, prompt);
        const imageUrl = `data:image/png;base66,${modifiedImage}`;
        setGeneratedImage(imageUrl);
        setLightboxImage(imageUrl);
        addToHistory(imageUrl);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        if (message.includes("Requested entity was not found.")) { 
          setError("API Key invalid or not found. Please select a valid key.");
          setHasApiKey(false); // Reset API key selection state
        } else {
          setError(`Failed to modify image: ${message}`);
        }
        setLightboxImage(null);
    } finally {
        setIsModifying(false);
    }
};
  
  if (hasApiKey === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-gray-700">Checking API key...</p>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">API Key Required</h2>
        <p className="text-gray-600 mb-6 max-w-md">
          To use this application, you need to select a paid Google Cloud Project API Key.
          This enables access to the latest Gemini models.
        </p>
        <button
          onClick={handleSelectApiKey}
          className="px-8 py-3 bg-gradient-to-r from-[#FF7BDC] to-[#FF4FA8] text-white font-semibold rounded-full hover:scale-102 transition-transform shadow-md"
        >
          Select API Key
        </button>
        <p className="text-xs text-gray-500 mt-4">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">
            Learn more about billing
          </a>
        </p>
        {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm mt-4">{error}</div>}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 sticky top-0 z-20 flex items-center justify-between">
        {/* Left Spacer for alignment */}
        <div className="w-8"> 
          {isTextOverlayMode && (
            <button
              onClick={() => setIsTextOverlayMode(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Back to Generator"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
        </div>
        <h1 className="text-2xl font-semibold gradient-text text-center">
          {isTextOverlayMode ? 'Text Overlay Generator' : 'AI Product Mockup Generator'}
        </h1>
        {/* Right buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => setIsTextOverlayMode(!isTextOverlayMode)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isTextOverlayMode ? "Switch to Product Generator" : "Switch to Text Overlay Mode"}
          >
            <LayersIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Open history"
          >
            <HistoryIcon className="w-6 h-6" />
          </button>
        </div>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 flex-grow">
        {isTextOverlayMode ? (
          <TextOverlayApp 
            initialProductImage={generatedImage} 
            onBackToGenerator={() => setIsTextOverlayMode(false)} 
          />
        ) : (
          <>
            <div className="lg:col-span-1 xl:col-span-1">
              <ControlPanel
                setProductImage={handleSetProductImage}
                useStyleReference={useStyleReference}
                onUseStyleReferenceChange={setUseStyleReference}
                setStyleReferenceImage={handleSetStyleReferenceImage}
                styleReferencePrompt={styleReferencePrompt}
                isAnalyzingStyle={isAnalyzingStyle}
                matchProductVibe={matchProductVibe}
                onMatchProductVibeChange={setMatchProductVibe}
                productVibePrompt={productVibePrompt}
                isAnalyzingVibe={isAnalyzingVibe}
                addSocialText={addSocialText} // Kept for prop but will always be false
                onAddSocialTextChange={setAddSocialText} // Kept for prop but will always be false
                isLoading={isLoading}
                // Pass all settings
                settings={{
                  aspectRatio, resolution, cameraAngle, lens, depthOfField,
                  lightingType, lightingDirection, surface, background, shadow,
                  reflection, colorStyle, composition, outputPng
                }}
                setters={{
                  setAspectRatio, setResolution, setCameraAngle, setLens, setDepthOfField,
                  setLightingType, setLightingDirection, setSurface, setBackground, setShadow,
                  setReflection, setColorStyle, setComposition, setOutputPng
                }}
              />
            </div>
            <div className="lg:col-span-2 xl:col-span-3">
              <ImageWorkspace
                productImage={productImage}
                onGenerateClick={handleGenerate}
                isLoading={isLoading}
                error={error}
                infotainmentText={infotainmentText}
                generatedImage={generatedImage}
                extractedText={extractedText}
                finalPrompt={finalPrompt}
                jsonSummary={jsonSummary}
                addSocialText={false} // Feature removed, always pass false
                onImageClick={(url) => setLightboxImage(url)}
              />
            </div>
          </>
        )}
      </main>
      {lightboxImage && (
        <Lightbox 
            imageUrl={lightboxImage}
            onClose={() => setLightboxImage(null)}
            onModify={handleModifyImage}
            isModifying={isModifying}
        />
      )}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onImageClick={(url) => {
            setLightboxImage(url);
            setIsHistoryOpen(false);
        }}
        onClear={clearHistory}
      />
    </div>
  );
}

export default App;