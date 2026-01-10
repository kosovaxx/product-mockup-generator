import { GoogleGenAI, Type, Modality } from '@google/genai';

// Utility to convert base64 data URL to a format Gemini API accepts
const fileToGenerativePart = (dataUrl: string) => {
  const parts = dataUrl.split(';base64,');
  const mimeType = parts[0].split(':')[1];
  const data = parts[1];
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
};

// Helper to parse JSON from model text output as Nano Banana doesn't support responseMimeType
const parseJsonFromText = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from text:", text);
    throw new Error("Model returned invalid JSON format.");
  }
};

export const getTextContent = async (productImageBase64: string): Promise<{ extractedText: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(productImageBase64);

  const prompt = `Extract the text exactly as it appears on the label of the provided product image. Return ONLY a valid JSON object with one key: "extractedText". Do not include markdown formatting or extra text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });

    return parseJsonFromText(response.text || '{}');
  } catch (error) {
    console.error("Error calling Gemini API for text content:", error);
    throw new Error("Failed to extract text content.");
  }
};

interface StyleReferencePromptOutput {
  Environment: string;
  Lighting: string;
  Colors: string;
  'Camera framing': string;
  'Texture & materials': string;
  Atmosphere: string;
}

export const getStyleReferencePrompt = async (styleReferenceBase64: string): Promise<StyleReferencePromptOutput> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(styleReferenceBase64);

  const prompt = `Analyze this image aesthetic. Return ONLY a valid JSON object with these keys: "Environment", "Lighting", "Colors", "Camera framing", "Texture & materials", "Atmosphere". Do not describe the product itself.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return parseJsonFromText(response.text || '{}');
  } catch (error) {
    console.error("Error calling Gemini API for style analysis:", error);
    throw new Error("Failed to analyze style reference.");
  }
};

export const getProductVibePrompt = async (productImageBase64: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(productImageBase64);

  const prompt = `Describe the inherent mood/vibe of this product in 3-5 keywords. Return ONLY the keywords separated by commas.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text?.trim() || "clean, professional";
  } catch (error) {
    console.error("Error calling Gemini API for product vibe analysis:", error);
    throw new Error("Failed to analyze product vibe.");
  }
};

interface GenerationSettings {
  productImageBase64: string;
  styleReferenceBase64: string | null;
  styleReferencePrompt: string | null;
  matchProductVibe: boolean;
  productVibePrompt: string | null;
  addSocialText: boolean;
  infotainmentText: string;
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
}

export const generateProductShot = async (
    settings: GenerationSettings
): Promise<{ generatedImage: string, finalImagePrompt: string, jsonSummary: string }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY environment variable is not set.");
    const ai = new GoogleGenAI({ apiKey });

    let styleInstructions = settings.styleReferencePrompt ? `\nSTYLE: Match aesthetic - ${settings.styleReferencePrompt}` : '';
    let vibeInstructions = (settings.matchProductVibe && settings.productVibePrompt) ? `\nVIBE: Incorporate mood - ${settings.productVibePrompt}` : '';

    const finalImagePrompt = `Professional hero shot of the product. 
PRESERVE ORIGINAL PRODUCT: Isolate the product from the source image. Label and geometry must be identical.
SCENE: Placed on ${settings.surface} in a ${settings.background} environment. 
CAMERA: ${settings.cameraAngle}, ${settings.lens} lens, ${settings.depthOfField}. ${settings.composition} framing.
LIGHTING: ${settings.lightingType} from ${settings.lightingDirection}. ${settings.shadow} shadows. ${settings.colorStyle} style.
${styleInstructions}${vibeInstructions}
${settings.outputPng ? "Output with transparent background." : ""}
Return ONLY the image.`;

    const parts: any[] = [{ text: finalImagePrompt }];
    parts.push(fileToGenerativePart(settings.productImageBase64));
    if (settings.styleReferenceBase64) parts.push(fileToGenerativePart(settings.styleReferenceBase64));
    
    const { productImageBase64, styleReferenceBase64, ...summarySettings } = settings;
    const jsonSummary = JSON.stringify(summarySettings, null, 2);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: settings.aspectRatio as any,
                    imageSize: settings.resolution.includes("4096") ? "4K" : settings.resolution.includes("2048") ? "2K" : "1K"
                }
            },
        });
        
        console.log("Full generation response:", response);
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) throw new Error("No image was generated. Check API response for details.");
        
        return { generatedImage: part.inlineData.data, finalImagePrompt, jsonSummary };
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const modifyImage = async (baseImageBase64: string, prompt: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY environment variable is not set.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [fileToGenerativePart(baseImageBase64), { text: prompt }] },
            config: {
                imageConfig: { aspectRatio: "1:1" }
            }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) throw new Error("Modification failed.");
        return part.inlineData.data;
    } catch (error) {
        console.error("Modification error:", error);
        throw new Error("Failed to modify image.");
    }
};

interface TextBlock {
  id: string;
  role: 'headline' | 'subheadline' | 'bullet_list' | 'specs_volume' | 'tagline' | 'background_headline';
  anchor_box: [number, number, number, number];
  align: 'left' | 'center' | 'right';
  size_hint: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
  weight_hint: 'bold' | 'medium' | 'light';
}

export interface TextLayoutSchema {
  font_hint: string;
  color_palette: string[];
  blocks: TextBlock[];
}

export const getTextOverlayStyleLayout = async (styleReferenceImageBase64: string): Promise<TextLayoutSchema> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Analyze text layout in this image. Return ONLY a valid JSON object matching this interface:
interface TextLayoutSchema { font_hint: string; color_palette: string[]; blocks: { id: string; role: string; anchor_box: [number, number, number, number]; align: string; size_hint: string; weight_hint: string; }[]; }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [fileToGenerativePart(styleReferenceImageBase64), { text: prompt }] },
    });
    return parseJsonFromText(response.text || '{}');
  } catch (error) {
    throw new Error("Failed to analyze layout.");
  }
};

export interface ProductInfoSchema {
  brand: string | null;
  product_name: string | null;
  product_type: string | null;
  visible_claims: string[];
  volume: string | null;
  language_detected: string;
}

export const extractProductInfoForTextOverlay = async (productImageBase64: string): Promise<ProductInfoSchema> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract product data. Return ONLY valid JSON: { brand, product_name, product_type, visible_claims: string[], volume, language_detected }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [fileToGenerativePart(productImageBase64), { text: prompt }] },
    });
    return parseJsonFromText(response.text || '{}');
  } catch (error) {
    throw new Error("Failed to extract info.");
  }
};

interface GeneratedTextBlock extends TextBlock {
  text_sq?: string;
  text_en?: string;
  items_sq?: string[];
  items_en?: string[];
}

export interface GeneratedTextContentSchema {
  font_hint: string;
  color_palette: string[];
  blocks: GeneratedTextBlock[];
}

export const generateOverlayTextContent = async (
  productInfo: ProductInfoSchema,
  textLayout: TextLayoutSchema
): Promise<GeneratedTextContentSchema> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Generate marketing copy in Albanian (sq) and English (en) based on this data: ${JSON.stringify(productInfo)} and this layout: ${JSON.stringify(textLayout)}. Return ONLY the layout JSON updated with text_sq/text_en/items_sq/items_en fields.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return parseJsonFromText(response.text || '{}');
  } catch (error) {
    throw new Error("Failed to generate text content.");
  }
};

export const renderTextOverlay = async (
  baseImageBase64: string,
  textLayout: TextLayoutSchema,
  textContent: GeneratedTextContentSchema,
  language: 'sq' | 'en' = 'sq',
  addVibeElements: boolean = false,
  matchStyleBackground: boolean = false
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not set.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Overlay this text content onto the image using the provided layout. 
Language: ${language}. 
Brand Fonts: Montserrat (Headlines), Inter (Body).
${addVibeElements ? "Add matching decorative elements." : ""}
${matchStyleBackground ? "Match background tone to style." : ""}
Return ONLY the final image.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [fileToGenerativePart(baseImageBase64), { text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Overlay rendering failed.");
    return part.inlineData.data;
  } catch (error) {
    console.error("Rendering error:", error);
    throw new Error("Failed to render overlay.");
  }
};
