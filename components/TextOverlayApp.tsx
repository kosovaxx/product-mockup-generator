

import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { OptionGroup } from './OptionGroup';
import { SelectControl, CollapsibleSection, ToggleSwitch } from './ControlPanel'; // Reusing from ControlPanel
import { DownloadIcon, GenerateIcon, CopyIcon } from './icons'; // Reusing icons
import {
  getTextOverlayStyleLayout,
  extractProductInfoForTextOverlay,
  generateOverlayTextContent,
  renderTextOverlay,
  TextLayoutSchema,
  ProductInfoSchema,
  GeneratedTextContentSchema,
} from '../services/geminiService';

interface TextOverlayAppProps {
  initialProductImage: string | null;
  onBackToGenerator: () => void;
}

const TextOverlayImagePlaceholder: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="w-full h-full bg-gray-100/70 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 p-4">
    <div className="text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  </div>
);

const TextOverlayCopyOutput: React.FC<{ text: string, isJson?: boolean }> = ({ text, isJson = false }) => {
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
        <textarea
          readOnly
          value={formattedText}
          rows={10} // Default number of rows
          className="w-full h-full bg-transparent text-gray-800 whitespace-pre-wrap font-sans text-sm leading-relaxed resize-y focus:outline-none"
        ></textarea>
        {copied && <span className="absolute bottom-3 right-3 text-xs text-green-600">Copied!</span>}
    </div>
  );
};


export const TextOverlayApp: React.FC<TextOverlayAppProps> = ({ initialProductImage, onBackToGenerator }) => {
  const [textOverlayStyleReferenceImage, setTextOverlayStyleReferenceImage] = useState<string | null>(null);
  const [textLayout, setTextLayout] = useState<TextLayoutSchema | null>(null);
  const [isAnalyzingLayout, setIsAnalyzingLayout] = useState(false);

  const [userUploadedProductImage, setUserUploadedProductImage] = useState<string | null>(null); // New state for user-uploaded product image
  const currentProductImage = userUploadedProductImage || initialProductImage; // Determine which product image to use

  const [extractedProductInfo, setExtractedProductInfo] = useState<ProductInfoSchema | null>(null);
  const [isExtractingProductInfo, setIsExtractingProductInfo] = useState(false);

  const [generatedTextContent, setGeneratedTextContent] = useState<GeneratedTextContentSchema | null>(null);
  const [isGeneratingTextContent, setIsGeneratingTextContent] = useState(false);
  const [overlayLanguage, setOverlayLanguage] = useState<'sq' | 'en'>('sq'); // Default to Albanian

  const [finalTextOverlayImage, setFinalTextOverlayImage] = useState<string | null>(null);
  const [isRenderingOverlay, setIsRenderingOverlay] = useState(false);

  const [addVibeElements, setAddVibeElements] = useState(false); // New state for vibe elements toggle
  const [matchStyleBackground, setMatchStyleBackground] = useState(false); // New state for match style background toggle

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear product info and generated text if either product image (initial or user-uploaded) changes or is cleared
    if (!currentProductImage) {
      setExtractedProductInfo(null);
      setGeneratedTextContent(null);
      setFinalTextOverlayImage(null);
    }
  }, [currentProductImage]);

  const handleSetUserUploadedProductImage = (img: string | null) => {
    setUserUploadedProductImage(img);
    // When a new product image is uploaded or cleared, reset related states
    setExtractedProductInfo(null);
    setGeneratedTextContent(null);
    setFinalTextOverlayImage(null);
  };

  const handleAnalyzeLayout = async (img: string | null) => {
    setTextOverlayStyleReferenceImage(img);
    setTextLayout(null);
    if (img) {
      setIsAnalyzingLayout(true);
      setError(null);
      try {
        const layout = await getTextOverlayStyleLayout(img);
        setTextLayout(layout);
      } catch (err) {
        setError(`Failed to analyze layout: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsAnalyzingLayout(false);
      }
    }
  };

  const handleExtractProductInfo = async () => {
    if (!currentProductImage) {
      setError("Please ensure a product image is available (from generator or uploaded here).");
      return;
    }
    setExtractedProductInfo(null);
    setIsExtractingProductInfo(true);
    setError(null);
    try {
      const info = await extractProductInfoForTextOverlay(currentProductImage);
      setExtractedProductInfo(info);
    } catch (err) {
      setError(`Failed to extract product info: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExtractingProductInfo(false);
    }
  };

  const handleGenerateTextContent = async () => {
    if (!extractedProductInfo || !textLayout) {
      setError("Please complete Step 1 (Layout) and Step 2 (Product Info) first.");
      return;
    }
    setGeneratedTextContent(null);
    setIsGeneratingTextContent(true);
    setError(null);
    try {
      const content = await generateOverlayTextContent(extractedProductInfo, textLayout);
      setGeneratedTextContent(content);
    } catch (err) {
      setError(`Failed to generate text content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingTextContent(false);
    }
  };

  const handleRenderOverlay = async () => {
    if (!currentProductImage || !textLayout || !generatedTextContent) {
      setError("Please complete all previous steps before rendering.");
      return;
    }
    setFinalTextOverlayImage(null);
    setIsRenderingOverlay(true);
    setError(null);
    try {
      const imageData = await renderTextOverlay(
        currentProductImage,
        textLayout,
        generatedTextContent,
        overlayLanguage,
        addVibeElements, // Pass new toggle state
        matchStyleBackground // Pass new toggle state
      );
      setFinalTextOverlayImage(`data:image/png;base64,${imageData}`);
    } catch (err) {
      setError(`Failed to render overlay: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRenderingOverlay(false);
    }
  };

  const handleDownloadFinalImage = () => {
    if (finalTextOverlayImage) {
      const link = document.createElement('a');
      link.href = finalTextOverlayImage;
      link.download = `product-overlay-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRunAllSteps = async () => {
    setError(null);
    if (!currentProductImage) {
        setError("Please provide a product image (from the generator or uploaded in Step 0).");
        return;
    }
    if (!textOverlayStyleReferenceImage) {
        setError("Please upload a Text Overlay Style Reference image in Step 1.");
        return;
    }

    try {
        setIsAnalyzingLayout(true);
        const layout = await getTextOverlayStyleLayout(textOverlayStyleReferenceImage);
        setTextLayout(layout);
        setIsAnalyzingLayout(false);

        setIsExtractingProductInfo(true);
        const info = await extractProductInfoForTextOverlay(currentProductImage);
        setExtractedProductInfo(info);
        setIsExtractingProductInfo(false);

        setIsGeneratingTextContent(true);
        const content = await generateOverlayTextContent(info, layout);
        setGeneratedTextContent(content);
        setIsGeneratingTextContent(false);

        setIsRenderingOverlay(true);
        const imageData = await renderTextOverlay(
            currentProductImage,
            layout,
            content,
            overlayLanguage,
            addVibeElements,
            matchStyleBackground
        );
        setFinalTextOverlayImage(`data:image/png;base64,${imageData}`);
        setIsRenderingOverlay(false);

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to complete overlay generation: ${message}`);
        setIsAnalyzingLayout(false);
        setIsExtractingProductInfo(false);
        setIsGeneratingTextContent(false);
        setIsRenderingOverlay(false);
    }
  };


  return (
    <div className="lg:col-span-3 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 flex-grow">
      <div className="md:col-span-1 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6 h-full overflow-y-auto">
        
        <OptionGroup title="0. Product Image for Overlay">
            <p className="text-sm text-gray-700 mb-2">
                This image will be used as the base for the text overlay. It can be the one from the main generator
                or you can upload a new one here.
            </p>
            <FileUpload
                label="Upload Product Image (Optional)"
                onFileUpload={handleSetUserUploadedProductImage}
                isLoading={false}
                loadingText=""
            />
            {currentProductImage && (
              <div className="mt-4 p-2 bg-gray-100/70 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-600">Current Base Image:</span>
                  <img src={currentProductImage} alt="Product Base for Overlay" className="max-w-full h-32 object-contain mt-2 rounded-md" />
              </div>
            )}
        </OptionGroup>

        <OptionGroup title="1. Text Overlay Style Reference">
          <FileUpload
            label="Upload Style Reference Image (for text layout)"
            onFileUpload={handleAnalyzeLayout}
            isLoading={isAnalyzingLayout}
            loadingText="Analyzing layout..."
          />
          {textLayout && !isAnalyzingLayout && (
            <div className="text-xs text-gray-700 p-2 bg-gray-100/70 rounded-lg border border-gray-200 mt-2">
              <span className="font-semibold text-gray-600">Layout Analysis:</span>
              <textarea
                readOnly
                value={JSON.stringify(textLayout, null, 2)}
                rows={6} // Default number of rows
                className="w-full bg-transparent text-gray-800 whitespace-pre-wrap font-sans text-xs mt-1 resize-y focus:outline-none"
              ></textarea>
            </div>
          )}
        </OptionGroup>

        <OptionGroup title="2. Product Information Extraction">
          <p className="text-sm text-gray-700">Extracts brand, claims, etc., from the selected product image.</p>
          <button
            onClick={handleExtractProductInfo}
            disabled={!currentProductImage || isExtractingProductInfo || isAnalyzingLayout || !textLayout}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-pink-500 text-white font-semibold rounded-full hover:scale-102 transition-transform shadow-md disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:scale-100"
          >
            {isExtractingProductInfo ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <GenerateIcon className="w-5 h-5" />
            )}
            Extract Product Info
          </button>
          {extractedProductInfo && !isExtractingProductInfo && (
            <div className="text-xs text-gray-700 p-2 bg-gray-100/70 rounded-lg border border-gray-200 mt-2">
              <span className="font-semibold text-gray-600">Extracted Info:</span>
              <textarea
                readOnly
                value={JSON.stringify(extractedProductInfo, null, 2)}
                rows={6} // Default number of rows
                className="w-full bg-transparent text-gray-800 whitespace-pre-wrap font-sans text-xs mt-1 resize-y focus:outline-none"
              ></textarea>
            </div>
          )}
        </OptionGroup>

        <OptionGroup title="3. Generate Text Content">
          <p className="text-sm text-gray-700">Generates Albanian & English headlines, callouts, and specs based on product info and layout.</p>
          <button
            onClick={handleGenerateTextContent}
            disabled={!extractedProductInfo || !textLayout || isGeneratingTextContent}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-pink-500 text-white font-semibold rounded-full hover:scale-102 transition-transform shadow-md disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:scale-100"
          >
            {isGeneratingTextContent ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <GenerateIcon className="w-5 h-5" />
            )}
            Generate Text Content
          </button>
          {generatedTextContent && !isGeneratingTextContent && (
            <div className="text-xs text-gray-700 p-2 bg-gray-100/70 rounded-lg border border-gray-200 mt-2">
              <span className="font-semibold text-gray-600">Generated Text:</span>
              <textarea
                readOnly
                value={JSON.stringify(generatedTextContent, null, 2)}
                rows={6} // Default number of rows
                className="w-full bg-transparent text-gray-800 whitespace-pre-wrap font-sans text-xs mt-1 resize-y focus:outline-none"
              ></textarea>
            </div>
          )}
           <CollapsibleSection title="Output Language" defaultOpen>
              <SelectControl
                label="Text Language for Overlay"
                value={overlayLanguage}
                onChange={(value) => setOverlayLanguage(value as 'sq' | 'en')}
                options={['sq', 'en']}
              />
            </CollapsibleSection>
        </OptionGroup>
        
        <OptionGroup title="4. Render Controls">
            <CollapsibleSection title="Rendering Options" defaultOpen>
                <div className="space-y-4">
                    <ToggleSwitch
                        id="add-vibe-elements-toggle"
                        label="Add Vibe Elements"
                        checked={addVibeElements}
                        onChange={setAddVibeElements}
                        description="Adds subtle decorative elements (fruits, herbs, etc.) matching the product vibe, if available in style reference."
                        disabled={!textOverlayStyleReferenceImage}
                    />
                    <ToggleSwitch
                        id="match-style-background-toggle"
                        label="Match Style Background"
                        checked={matchStyleBackground}
                        onChange={setMatchStyleBackground}
                        description="Subtly adopt color palette or soft tone from style reference background, without replacing it."
                        disabled={!textOverlayStyleReferenceImage}
                    />
                </div>
            </CollapsibleSection>
        </OptionGroup>

        {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

        <button
          onClick={handleRunAllSteps}
          disabled={!currentProductImage || !textOverlayStyleReferenceImage || isAnalyzingLayout || isExtractingProductInfo || isGeneratingTextContent || isRenderingOverlay}
          className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FF7BDC] to-[#FF4FA8] text-white font-semibold rounded-full hover:scale-102 transition-transform shadow-md disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:scale-100 mt-auto"
        >
          <GenerateIcon />
          Run All Steps & Render Overlay
        </button>
      </div>

      <div className="md:col-span-1 flex flex-col h-full space-y-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Generated Overlay Mockup</h2>
        <div className="relative flex-grow bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center p-2 min-h-[300px]">
          {(isAnalyzingLayout || isExtractingProductInfo || isGeneratingTextContent || isRenderingOverlay) && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-2xl">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-700 font-semibold">Processing...</p>
            </div>
          )}
          {finalTextOverlayImage ? (
            <img src={finalTextOverlayImage} alt="Product with Text Overlay" className="max-w-full max-h-full object-contain rounded-xl" />
          ) : (
            <TextOverlayImagePlaceholder
              title="Final Overlay Image"
              description="Your generated image with text overlay will appear here."
            />
          )}
        </div>

        {finalTextOverlayImage && (
          <div className="bg-white/80 backdrop-blur-md py-4 px-6 rounded-2xl border border-gray-200 flex justify-center">
            <button
              onClick={handleDownloadFinalImage}
              className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-gray-700 text-white font-semibold rounded-full hover:bg-gray-600 transition-colors"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Overlay Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};