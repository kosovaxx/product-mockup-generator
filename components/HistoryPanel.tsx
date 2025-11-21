import React from 'react';
import { XIcon, TrashIcon } from './icons';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  onImageClick: (url: string) => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onImageClick, onClear }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-60 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white/60 backdrop-blur-lg rounded-l-2xl shadow-lg border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">History</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4">
          {history.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {history.map((url, index) => (
                <div key={index} className="group relative rounded-lg overflow-hidden cursor-pointer" onClick={() => onImageClick(url)}>
                  <img src={url} alt={`History item ${index + 1}`} className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 h-full flex flex-col items-center justify-center">
              <p>Generation history will appear here.</p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button 
              onClick={onClear} 
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
              Clear History
            </button>
          </div>
        )}
      </div>
    </>
  );
};