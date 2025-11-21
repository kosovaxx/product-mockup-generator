import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  label: string;
  onFileUpload: (base64: string) => void;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onFileUpload, isLoading = false, loadingText = "Loading...", disabled = false }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileUpload(reader.result as string);
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  }, [onFileUpload]);

  return (
    <div className={`transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative mt-1">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-lg">
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-700 mt-2">{loadingText}</p>
          </div>
        )}
        <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-white/30 hover:ring-2 hover:ring-pink-200 transition-shadow">
          <div className="space-y-1 text-center">
            <UploadIcon className="mx-auto h-10 w-10 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor={`file-upload-${label.replace(' ', '-')}`}
                className="relative cursor-pointer bg-transparent rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id={`file-upload-${label.replace(' ', '-')}`}
                  name={`file-upload-${label.replace(' ', '-')}`}
                  type="file"
                  className="sr-only"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                  disabled={isLoading || disabled}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">{fileName || 'PNG, JPG up to 10MB'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};