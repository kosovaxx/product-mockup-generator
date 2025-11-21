import React, { useState, useEffect } from 'react';
import { GenerateIcon, CopyIcon } from './icons';

interface ImageWorkspaceProps {
  productImage: string | null;
  onGenerateClick: () => void;
  isLoading: boolean;
  error: string | null;
  infotainmentText: string | null; // Kept for type compatibility but will be null
  generatedImage: string | null;
  extractedText: string | null;
  finalPrompt: string | null;
  jsonSummary: string | null;
  addSocialText: boolean; // Kept for prop but will always be false
  onImageClick: (url: string) => void;
}

const ImagePlaceholder: React.FC<{title: string; description: string}> = ({title, description}) => (
  <div className="w-full h-full bg-gray-100/70 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 p-4">
    <div className="text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  </div>
);

const CopyOutput: React.FC<{ text: string, isJson?: boolean }> = ({ text, isJson = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formattedText = isJson ? JSON.stringify(JSON.parse(text), null, 2) : text;

  return (
    <div className="relative bg-gray-100/70 rounded-b-2xl border border-gray-200 p-4 h-full overflow-y-auto">
        <button 
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 text-gray-500 bg-gray-200 rounded-full hover:bg-gray-300 hover:text-gray-700 transition-colors"
            aria-label="Copy to clipboard"
        >
            <CopyIcon className="w-5 h-5" />
        </button>
        <pre className="text-gray-800 whitespace-pre-wrap font-sans text-sm leading-relaxed">{formattedText}</pre>
        {copied && <span className="absolute bottom-3 right-3 text-xs text-green-600">Copied!</span>}
    </div>
  );
};

const OutputTabs: React.FC<{
    extractedText: string | null;
    finalPrompt: string | null;
    jsonSummary: string | null;
}> = ({ extractedText, finalPrompt, jsonSummary }) => {
    
    // Removed infotainmentText from tabs as per new requirements
    const allTabs = [
        { id: 'extracted', label: 'Extracted Label', content: extractedText },
        { id: 'prompt', label: 'Generation Prompt', content: finalPrompt },
        { id: 'summary', label: 'JSON Summary', content: jsonSummary, isJson: true },
    ];

    const tabs = allTabs.filter(tab => tab.content);
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'extracted'); // Default to extracted

    useEffect(() => {
        if (tabs.length > 0 && !tabs.some(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabs, activeTab]);

    if (tabs.length === 0) return null;

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-pink-500 text-pink-500'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow pt-4 min-h-0">
                {tabs.map(tab => (
                    <div key={tab.id} className={`${activeTab === tab.id ? 'block' : 'hidden'} h-full`}>
                        <CopyOutput text={tab.content || ''} isJson={tab.isJson} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  productImage,
  onGenerateClick,
  isLoading,
  error,
  infotainmentText, // This prop is no longer used for display
  generatedImage,
  extractedText,
  finalPrompt,
  jsonSummary,
  addSocialText, // This prop is no longer used for display
  onImageClick,
}) => {
    
  const showImageOutput = generatedImage && !isLoading;
  const showPlaceholder = !isLoading && !showImageOutput;
  const buttonText = 'Generate Mockup';
    
  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0">
        <div className="flex flex-col min-h-[300px] md:min-h-0">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Original Product</h2>
          {productImage ? (
            <div className="flex-grow flex items-center justify-center bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-2">
                <img src={productImage} alt="Uploaded Product" className="max-w-full max-h-full object-contain rounded-xl" />
            </div>
          ) : (
            <ImagePlaceholder title="Product Image" description="Your uploaded image will appear here" />
          )}
        </div>
        <div className="flex flex-col min-h-[300px] md:min-h-0">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Generated Mockup</h2>
            <div className="relative flex-grow bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200">
                {isLoading && (
                     <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-2xl">
                        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-700 font-semibold">Generating...</p>
                    </div>
                )}
                {showImageOutput && (
                    <div className="flex flex-col h-full gap-4">
                        <div 
                            className="flex-shrink-0 h-1/2 flex items-center justify-center p-2 cursor-pointer"
                            onClick={() => onImageClick(generatedImage!)}
                        >
                            <img src={generatedImage!} alt="Generated Product" className="max-w-full max-h-full object-contain rounded-xl" />
                        </div>
                         <div className="flex-grow min-h-0">
                            <OutputTabs 
                                extractedText={extractedText}
                                finalPrompt={finalPrompt}
                                jsonSummary={jsonSummary}
                            />
                        </div>
                    </div>
                )}
                {showPlaceholder && (
                    <ImagePlaceholder 
                        title="AI Product Mockup"
                        description="Your generated image will appear here."
                    />
                )}
            </div>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="bg-white/80 backdrop-blur-md py-4 px-6 -mx-6 rounded-b-none rounded-t-2xl border-t border-gray-200 flex justify-center">
        <button
          onClick={onGenerateClick}
          disabled={!productImage || isLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FF7BDC] to-[#FF4FA8] text-white font-semibold rounded-full hover:scale-102 transition-transform shadow-md disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:scale-100"
        >
          <GenerateIcon />
          {buttonText}
        </button>
      </div>
    </div>
  );
};