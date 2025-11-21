import React, { useState } from 'react';
import { XIcon, WandIcon, DownloadIcon } from './icons';

interface LightboxProps {
  imageUrl: string;
  onClose: () => void;
  onModify: (baseImageUrl: string, prompt: string) => void;
  isModifying: boolean;
}

export const Lightbox: React.FC<LightboxProps> = ({ imageUrl, onClose, onModify, isModifying }) => {
  const [modificationPrompt, setModificationPrompt] = useState('');

  const handleModifyClick = () => {
    if (modificationPrompt.trim()) {
      onModify(imageUrl, modificationPrompt);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-product-shot-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 z-50 transition-transform duration-200 hover:scale-110"
        aria-label="Close lightbox"
      >
        <XIcon className="w-8 h-8" />
      </button>
      
      <div className="flex flex-col md:flex-row gap-4 w-full h-full max-w-6xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex-grow flex items-center justify-center relative">
          {isModifying && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-2xl">
              <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-700 font-semibold">Modifying Image...</p>
            </div>
          )}
          <img 
            src={imageUrl} 
            alt="Generated product" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
        </div>

        <div className="w-full md:w-80 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-4 flex flex-col">
          <div className="flex-grow space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Modify Image</h3>
            <p className="text-sm text-gray-600">Describe the changes you'd like to make. For example, "make the background a marble surface" or "add a dramatic shadow to the right".</p>
            <textarea
              placeholder="Enter modification prompt..."
              value={modificationPrompt}
              onChange={(e) => setModificationPrompt(e.target.value)}
              rows={5}
              className="w-full bg-white/30 text-gray-800 p-3 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
              disabled={isModifying}
            />
          </div>
          <div className="mt-auto pt-4 space-y-2">
            <button
              onClick={handleModifyClick}
              disabled={isModifying || !modificationPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF7BDC] to-[#FF4FA8] text-white font-semibold rounded-full hover:bg-indigo-500 transition-colors disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 disabled:shadow-none disabled:scale-100"
            >
              {isModifying ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <WandIcon className="w-5 h-5" />
              )}
              Modify Image
            </button>
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-full hover:bg-gray-600 transition-colors"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};