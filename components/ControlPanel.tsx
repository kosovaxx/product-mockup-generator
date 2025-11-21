import React from 'react';
import { FileUpload } from './FileUpload';
import { OptionGroup } from './OptionGroup';
import { SparklesIcon, TextIcon } from './icons';
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
} from '../constants';


type Settings = {
  aspectRatio: string;
  resolution: string;
  cameraAngle: string;
  lens: string;
  depthOfField: string;
  lightingType: string;
  lightingDirection: string;
  surface: string;
  background: string;
  shadow: string;
  reflection: string;
  colorStyle: string;
  composition: string;
  outputPng: boolean;
};

type Setters = {
  setAspectRatio: (v: string) => void;
  setResolution: (v: string) => void;
  setCameraAngle: (v: string) => void;
  setLens: (v: string) => void;
  setDepthOfField: (v: string) => void;
  setLightingType: (v: string) => void;
  setLightingDirection: (v: string) => void;
  setSurface: (v: string) => void;
  setBackground: (v: string) => void;
  setShadow: (v: string) => void;
  setReflection: (v: string) => void;
  setColorStyle: (v: string) => void;
  setComposition: (v: string) => void;
  setOutputPng: (v: boolean) => void;
};

interface ControlPanelProps {
  setProductImage: (base64: string | null) => void;
  useStyleReference: boolean;
  onUseStyleReferenceChange: (enabled: boolean) => void;
  setStyleReferenceImage: (base64: string | null) => void;
  styleReferencePrompt: string | null;
  isAnalyzingStyle: boolean;
  matchProductVibe: boolean;
  onMatchProductVibeChange: (enabled: boolean) => void;
  productVibePrompt: string | null;
  isAnalyzingVibe: boolean;
  addSocialText: boolean; // Kept for prop but will always be false
  onAddSocialTextChange: (enabled: boolean) => void; // Kept for prop but will always be false
  isLoading: boolean;
  settings: Settings;
  setters: Setters;
}

export const ToggleSwitch: React.FC<{ id: string; checked: boolean; onChange: (checked: boolean) => void; label: string; icon?: React.ReactNode; description?: string; disabled?: boolean;}> = ({ id, checked, onChange, label, icon, description, disabled = false }) => (
    <div className={`transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <label htmlFor={id} className="flex items-center justify-between cursor-pointer" aria-disabled={disabled}>
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          {icon}
          {label}
        </span>
        <div className="relative">
          <input 
            id={id}
            type="checkbox" 
            className="sr-only" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-pink-500' : 'bg-gray-400'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
      </label>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
);

export const SelectControl: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: readonly string[]; }> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/30 border border-gray-300 text-gray-800 text-sm rounded-lg focus:ring-pink-400 focus:border-pink-400 block p-2.5"
    >
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </div>
);

export const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; }> = ({ title, children, defaultOpen = false }) => (
    <details open={defaultOpen} className="border-t border-gray-200 pt-4">
        <summary className="text-sm font-semibold uppercase tracking-wider text-gray-600 cursor-pointer list-none flex justify-between items-center">
            {title}
            <span className="text-gray-500 transform transition-transform duration-200 open:rotate-90">&#9656;</span>
        </summary>
        <div className="pt-4 space-y-4">
            {children}
        </div>
        <style>{`
            details[open] > summary span {
                transform: rotate(90deg);
            }
        `}</style>
    </details>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({
  setProductImage,
  useStyleReference,
  onUseStyleReferenceChange,
  setStyleReferenceImage,
  styleReferencePrompt,
  isAnalyzingStyle,
  matchProductVibe,
  onMatchProductVibeChange,
  productVibePrompt,
  isAnalyzingVibe,
  isLoading,
  settings,
  setters
}) => {
  return (
    <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6 h-full overflow-y-auto">
      <OptionGroup title="1. Upload Product">
        <FileUpload 
          label="Product Photo" 
          onFileUpload={setProductImage} 
          isLoading={isLoading} 
          loadingText="Generating..."
        />
        { isAnalyzingVibe && <p className="text-xs text-gray-500 animate-pulse mt-2">Analyzing product vibe...</p> }
        { productVibePrompt && !isAnalyzingVibe && 
            <div className="text-xs text-gray-700 p-2 bg-gray-100/70 rounded-lg border border-gray-200 mt-2">
                <span className="font-semibold text-gray-600">Product Vibe:</span> {productVibePrompt}
            </div> 
        }
      </OptionGroup>
      
      <OptionGroup title="2. Generation Controls">
        <div className="space-y-4">
            <ToggleSwitch
                id="style-ref-toggle"
                label="Use Style Reference"
                checked={useStyleReference}
                onChange={onUseStyleReferenceChange}
            />

            {useStyleReference && (
                <div className="pl-4 border-l-2 border-gray-200 space-y-2">
                    <FileUpload 
                        label="Style Reference Image" 
                        onFileUpload={setStyleReferenceImage}
                    />
                    { isAnalyzingStyle && <p className="text-xs text-gray-500 animate-pulse">Analyzing style...</p> }
                    { styleReferencePrompt && !isAnalyzingStyle && 
                        <div className="text-xs text-gray-700 p-2 bg-gray-100/70 rounded-lg border border-gray-200">
                            <span className="font-semibold text-gray-600">Style Analysis:</span> 
                            <pre className="whitespace-pre-wrap font-sans mt-1">{styleReferencePrompt}</pre>
                        </div> 
                    }
                    <ToggleSwitch
                        id="match-vibe-toggle"
                        label="Match Product Vibe"
                        checked={matchProductVibe}
                        onChange={onMatchProductVibeChange}
                        disabled={!useStyleReference || !productVibePrompt}
                        description="Analyzes product for mood/theme and merges with style reference."
                    />
                </div>
            )}

            <CollapsibleSection title="Output Format" defaultOpen>
                <SelectControl label="Aspect Ratio" value={settings.aspectRatio} onChange={setters.setAspectRatio} options={ASPECT_RATIOS} />
                <SelectControl label="Resolution" value={settings.resolution} onChange={setters.setResolution} options={RESOLUTIONS} />
                <SelectControl label="Composition" value={settings.composition} onChange={setters.setComposition} options={COMPOSITIONS} />
            </CollapsibleSection>
            
            <CollapsibleSection title="Camera">
                <SelectControl label="Camera Angle" value={settings.cameraAngle} onChange={setters.setCameraAngle} options={CAMERA_ANGLES} />
                <SelectControl label="Lens" value={settings.lens} onChange={setters.setLens} options={LENSES} />
                <SelectControl label="Depth of Field (Aperture)" value={settings.depthOfField} onChange={setters.setDepthOfField} options={APERTURES} />
            </CollapsibleSection>

            <CollapsibleSection title="Lighting">
                <SelectControl label="Lighting Type" value={settings.lightingType} onChange={setters.setLightingType} options={LIGHTING_TYPES} />
                <SelectControl label="Lighting Direction" value={settings.lightingDirection} onChange={setters.setLightingDirection} options={LIGHTING_DIRECTIONS} />
                <SelectControl label="Color Style" value={settings.colorStyle} onChange={setters.setColorStyle} options={COLOR_STYLES} />
            </CollapsibleSection>
            
            <CollapsibleSection title="Scene">
                 <SelectControl label="Surface" value={settings.surface} onChange={setters.setSurface} options={SURFACES} />
                 <SelectControl label="Background / Environment" value={settings.background} onChange={setters.setBackground} options={BACKGROUNDS} />
                 <SelectControl label="Shadows" value={settings.shadow} onChange={setters.setShadow} options={SHADOWS} />
                 <SelectControl label="Reflections" value={settings.reflection} onChange={setters.setReflection} options={REFLECTIONS} />
            </CollapsibleSection>
            
            <CollapsibleSection title="Extras">
                {/* REMOVED: Social Text Toggle as per prompt */}
                <ToggleSwitch
                    id="png-toggle"
                    label="PNG with Transparency"
                    checked={settings.outputPng}
                    onChange={setters.setOutputPng}
                    description="Generates a transparent background (best with simple backgrounds)."
                />
            </CollapsibleSection>
        </div>
      </OptionGroup>
    </div>
  );
};