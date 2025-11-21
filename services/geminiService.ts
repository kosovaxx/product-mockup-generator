import { GoogleGenAI, Type, Modality } from '@google/genai';

// Utility to convert base64 data URL to a format Gemini API accepts
const fileToGenerativePart = (dataUrl: string) => {
  // e.g. "data:image/jpeg;base64,LzlqLzRBQ..."
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

export const getTextContent = async (productImageBase64: string): Promise<{ extractedText: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(productImageBase64);

  // Updated prompt to only extract text, no infotainment generation
  const prompt = `Extract the text exactly as it appears on the label of the provided product image. Do not alter, rewrite, or correct anything. Preserve all product text in its original form. Return ONLY a valid JSON object with one key: "extractedText".`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: { 
              type: Type.STRING,
              description: 'The verbatim text extracted from the product label.'
            },
          },
          required: ['extractedText'],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
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
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(styleReferenceBase64);

  const prompt = `Analyze this image to extract ONLY its aesthetic qualities. Do NOT describe any products, text, or brands from the image.
Focus strictly on:
- Lighting style
- Color palette
- Camera angle
- Depth of field
- Background structure
- Scene elements (excluding any products, text, or labels)

Rewrite the extracted style into a clean, safe, structured JSON object with the following keys. If a category is not discernible, use "N/A".
{
  "Environment": "Description of the background and overall setting",
  "Lighting": "Description of the lighting style and direction",
  "Colors": "Description of the main color palette and mood",
  "Camera framing": "Description of camera angle, depth of field, and composition",
  "Texture & materials": "Description of prominent textures and materials in the scene",
  "Atmosphere": "Description of the overall mood or feeling"
}
Return ONLY the JSON object.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Environment: { type: Type.STRING },
            Lighting: { type: Type.STRING },
            Colors: { type: Type.STRING },
            'Camera framing': { type: Type.STRING },
            'Texture & materials': { type: Type.STRING },
            Atmosphere: { type: Type.STRING },
          },
          required: ['Environment', 'Lighting', 'Colors', 'Camera framing', 'Texture & materials', 'Atmosphere'],
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error calling Gemini API for style analysis:", error);
    throw new Error("Failed to analyze style reference.");
  }
};

export const getProductVibePrompt = async (productImageBase64: string): Promise<string> => {
  // Fix: Changed process.env.env.API_KEY to process.env.API_KEY
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(productImageBase64);

  const prompt = `Analyze this product image and describe its inherent mood, theme, natural elements, and color emotions in 3-5 keywords or a very short phrase. Do NOT describe the product itself or any text/labels.
Examples:
- Aloe product: "fresh, nature, green, water droplets, soothing"
- Honey jar: "warm, golden, cozy, natural, sweet"
- Citrus drink: "bright, energetic, refreshing, vibrant"
- Vitamin bottle: "clean, clinical, minimal white, health"
Return ONLY the keywords/phrase, e.g., "fresh, nature, green, water droplets".`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text.trim();
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

    let styleInstructions = '';
    if (settings.styleReferenceBase64 && settings.styleReferencePrompt) {
        styleInstructions = `
**-- STYLE REFERENCE --**
A style reference image has been provided. You MUST adopt its lighting, composition, photographic angle, color palette, and overall mood. However, do NOT copy or recreate any text, graphics, logos, or product shapes from the style reference. Only copy the vibe. The reference is described as:
${settings.styleReferencePrompt}`;
    }

    let vibeInstructions = '';
    if (settings.matchProductVibe && settings.productVibePrompt) {
        vibeInstructions = `
**-- PRODUCT VIBE (Merge with Style Reference) --**
The original product has a vibe that can be described as: "${settings.productVibePrompt}".
The generated scene MUST match and complement this vibe. Do NOT make the scene contradict the product's natural essence. For example, if the product is 'aloe', ensure the scene suggests 'fresh, nature, green'. This vibe should intelligently merge with the style reference without contradicting it.`;
    }

    // Removed socialTextInstructions as per new requirements
    // let socialTextInstructions = '';
    // if (settings.addSocialText && settings.infotainmentText) {
    //     socialTextInstructions = `
    // **-- SOCIAL TEXT --**
    // Seamlessly integrate the following 3-line text into the image. The text should have a clean, modern, minimal layout and must NOT cover the product or its original label.
    // <infotainment_text>
    // ${settings.infotainmentText}
    // </infotainment_text>`;
    // }

    const sceneDescription: string[] = [];
    sceneDescription.push(`- **Camera & Composition:** An image captured from a ${settings.cameraAngle} with a ${settings.lens} lens at ${settings.depthOfField}. The product is framed using a ${settings.composition} composition.`);
    sceneDescription.push(`- **Lighting & Mood:** The scene uses ${settings.lightingType} with light coming from the ${settings.lightingDirection}. The shadows are ${settings.shadow.toLowerCase()}. ${settings.reflection !== "None" ? `The surface has ${settings.reflection.toLowerCase()}.` : ''} The color style is ${settings.colorStyle.toLowerCase()}.`);
    sceneDescription.push(`- **Environment:** The product is placed on a ${settings.surface.toLowerCase()} surface with a ${settings.background.toLowerCase()} background.`);
    if (settings.outputPng) {
      sceneDescription.push(`- **Output Format:** The output should have a transparent background (PNG).`);
    }

    const finalImagePrompt = `You are an expert AI Product Mockup Generator. Your job is to generate a clean, photorealistic product mockup.

**-- CRITICAL RULES (MUST be followed) --**
1.  **PRESERVE THE ORIGINAL PRODUCT:** Use automatic masking to perfectly isolate the product from the user-provided product image. The product's label, text, colors, geometry, cap, and logos MUST remain UNCHANGED. Do NOT alter, repaint, relabel, rewrite, or regenerate anything inside the product mask. The original product image must be the *only* product appearing in the final shot.
2.  **CREATE A NEW SCENE:** Place the preserved original product into a new, photorealistic scene based *only* on the Scene Description below. The product from the style reference image (if provided) MUST NOT appear in the final image. The scene should adopt the *style* of the reference, not its specific product content.
3.  **NEGATIVE PROMPT (Apply ALWAYS):** Do not alter or repaint any text or logos on the product. Do not distort the product. Do not generate multiple products, floating labels, warped geometry, artificial halos, noise, exaggerated glow, stickers, glitter, or hands. No extra objects or props, unless explicitly requested in scene description.
4.  **ASPECT RATIO:** The final image must have a ${settings.aspectRatio} aspect ratio.

**-- SCENE DESCRIPTION --**
${sceneDescription.join('\n')}
${styleInstructions}
${vibeInstructions}
Generate the final image based on all these instructions.`;

    const parts: any[] = [{ text: finalImagePrompt }];
    parts.push(fileToGenerativePart(settings.productImageBase64));
    if (settings.styleReferenceBase64) {
      parts.push(fileToGenerativePart(settings.styleReferenceBase64));
    }
    
    // Create JSON summary, excluding image data
    const { productImageBase64, styleReferenceBase64, ...summarySettings } = settings;
    const jsonSummary = JSON.stringify(summarySettings, null, 2);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) throw new Error("No image was generated in the response.");
        
        return { generatedImage: part.inlineData.data, finalImagePrompt, jsonSummary };
    } catch (error) {
        console.error("Error calling Gemini API for image generation:", error);
        throw new Error("Failed to generate product shot.");
    }
};

export const modifyImage = async (baseImageBase64: string, prompt: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY environment variable is not set.");
    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `${prompt}. Important: Preserve the core product and any text labels on it exactly as they are in the original image. Only modify the background or add elements as requested.`;

    const parts = [
        fileToGenerativePart(baseImageBase64),
        { text: fullPrompt }
    ];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) throw new Error("No modified image was generated in the response.");
        
        return part.inlineData.data;

    } catch (error) {
        console.error("Error calling Gemini API for image modification:", error);
        throw new Error("Failed to modify image.");
    }
};


// --- New Text Overlay Mode Functions ---

interface TextBlock {
  id: string;
  role: 'headline' | 'subheadline' | 'bullet_list' | 'specs_volume' | 'tagline' | 'background_headline'; // Added background_headline
  anchor_box: [number, number, number, number]; // [x1, y1, x2, y2] relative coords
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
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(styleReferenceImageBase64);

  const prompt = `Analyze the provided style reference image and extract ONLY the visual layout structure for text overlays.
You MUST detect:
- placement of headline
- placement of subheadline
- placement of bullet callouts
- placement of specs/badges
- text alignment and hierarchy
- approximate font style (e.g., geometric_sans_bold, thin_sans, serif_elegant)
- color palette (main text colors)
- spacing proportions
- approximate bounding boxes for each text block (as relative coordinates from 0 to 1, [x1, y1, x2, y2])
- If the style reference includes a large text behind the product, categorize it as 'background_headline'.

You MUST NOT:
- copy any words, letters, or text from the style reference, especially any foreign language text (e.g., Russian, Arabic, Greek, etc.). Treat all detected foreign text as layout placeholders, NOT as content.
- use any trademarked or copyrighted slogans
- infer product type from the style reference
- generate text in any language based on the style reference. Focus purely on layout.

Output ONLY JSON in this schema:
interface TextBlock {
  id: string; // Unique identifier for the block, e.g., "headline_main", "callouts_left"
  role: 'headline' | 'subheadline' | 'bullet_list' | 'specs_volume' | 'tagline' | 'background_headline';
  anchor_box: [number, number, number, number]; // [x1, y1, x2, y2] relative coords (0-1)
  align: 'left' | 'center' | 'right';
  size_hint: 'xl' | 'lg' | 'md' | 'sm' | 'xs'; // Relative size
  weight_hint: 'bold' | 'medium' | 'light'; // Relative font weight
}
interface TextLayoutSchema {
  font_hint: string; // e.g., "modern_sans_medium"
  color_palette: string[]; // Hex codes for text colors, e.g., ["#FFFFFF", "#000000"]
  blocks: TextBlock[];
}
Return ONLY the JSON object conforming to TextLayoutSchema. Ensure all coordinates are between 0 and 1.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            font_hint: { type: Type.STRING },
            color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  role: { type: Type.STRING, enum: ['headline', 'subheadline', 'bullet_list', 'specs_volume', 'tagline', 'background_headline'] },
                  anchor_box: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 4, maxItems: 4 },
                  align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                  size_hint: { type: Type.STRING, enum: ['xl', 'lg', 'md', 'sm', 'xs'] },
                  weight_hint: { type: Type.STRING, enum: ['bold', 'medium', 'light'] },
                },
                required: ['id', 'role', 'anchor_box', 'align', 'size_hint', 'weight_hint'],
              },
            },
          },
          required: ['font_hint', 'color_palette', 'blocks'],
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error calling Gemini API for text overlay style analysis:", error);
    throw new Error("Failed to analyze text overlay style reference.");
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
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(productImageBase64);

  const prompt = `Read ONLY the product image provided.
Extract:
- brand
- product name
- product type
- readable claims (short phrases or keywords)
- readable benefits (short phrases or keywords)
- readable volume (e.g., "250ml", "10 fl oz")
- readable text only
- detected language of label (ISO 639-1 code, e.g., "sq" for Albanian, "en" for English)

Rules:
- Never guess or hallucinate missing text.
- If unreadable or unclear -> use "null".
- Never change numbers.
- Do not infer extra ingredients or claims.

Output JSON:
interface ProductInfoSchema {
  brand: string | null;
  product_name: string | null;
  product_type: string | null;
  visible_claims: string[]; // List of claims/benefits
  volume: string | null;
  language_detected: string; // e.g., "sq", "en"
}
Return ONLY the JSON object conforming to ProductInfoSchema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING, nullable: true },
            product_name: { type: Type.STRING, nullable: true },
            product_type: { type: Type.STRING, nullable: true },
            visible_claims: { type: Type.ARRAY, items: { type: Type.STRING } },
            volume: { type: Type.STRING, nullable: true },
            language_detected: { type: Type.STRING },
          },
          required: ['brand', 'product_name', 'product_type', 'visible_claims', 'volume', 'language_detected'],
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error calling Gemini API for product info extraction:", error);
    throw new Error("Failed to extract product information.");
  }
};


interface GeneratedTextBlock extends TextBlock {
  text_sq?: string;
  text_en?: string;
  items_sq?: string[]; // For bullet_list role
  items_en?: string[]; // For bullet_list role
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
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const productInfoString = JSON.stringify(productInfo);
  const textLayoutString = JSON.stringify(textLayout);

  const prompt = `You are an advanced text generation engine for product overlays.
**-- CRITICAL RULES --**
1.  **Language Strictness (Always SHQIP Output):** All generated text must ALWAYS be produced in clean, correct Albanian (shqip) by default for 'text_sq' or 'items_sq'. English text ('text_en' or 'items_en') may only be produced as a secondary output. Ignore any languages detected in the style reference (e.g., Russian, Arabic, Greek). Never copy foreign words from the style reference into generated text.
2.  **Product Info Only:** Use ONLY the provided product data from <product_data> to generate content. Do NOT invent benefits, claims, or ingredients.
3.  **Layout Only:** Use ONLY the provided text layout structure from <text_layout_structure> to understand block roles and positions. Do NOT generate text for blocks that are not defined in the layout.
4.  **Auto-Simplification & Block Relevance:**
    *   If the text layout contains more blocks than the product information can reasonably support, keep ONLY the essential blocks: headline, subheadline, 1-2 bullet lists, 1 spec block.
    *   Automatically ignore (set 'text_sq': null or 'items_sq': []) irrelevant blocks such as: x30 badges, dosage circles, capsule icons, “95% absorption” text, supplement-only badges, scientific icons, or medical claims, ESPECIALLY if the 'product_type' is a 'drink' or 'cosmetic'.
    *   Do NOT display empty or null blocks in the final JSON output (by setting their content to null/empty array).
5.  **Anti-Repetition Rule:** Do NOT repeat the same fact, claim, or volume in multiple blocks. If "1 Litër" appears once, it must not appear again. Product name appears only once unless stylistically necessary.
6.  **Albanian Spelling & Grammar Guard:** Before finalizing text, auto-correct misspellings (e.g., "XLOE" → "XHEL", "Naturale" → "Natyrale", "Me Aloe Dhe Mango" → "Me Aloe dhe Mango" (correct casing)) and ensure grammar is clean and natural in Albanian. Pick the simplest grammatically correct form if uncertain.
7.  **Style Compatibility Logic:** If the product type is a 'drink', avoid generating text that belongs to 'capsules', 'mg dosage units', 'supplement cycles', 'bio-availability', or percentages not on the label. Only use visible label information or safe marketing language like: "Freski", "Natyrale", "Tropikale", "Pa konservues", "Me Aloe Vera", "Me Mango".
8.  **Fallback Content Logic:** If the product info is minimal or unclear, use safe, generic SHQIP phrases for applicable blocks like: "Pije Freskuese", "Me Aloe Vera", "Pa Konservues", "Shije Tropikale", "Për Çdo Ditë".

**-- SPECIFIC BLOCK GENERATION LOGIC --**
- **BACKGROUND HEADLINE (if present in layout):** Use product name, product range, or a key ingredient (e.g., "Aloe Vera") as a large, bold text. Keep it concise.
- **SUBHEADLINE (if present in layout):** Short (2-4 words), clean, always in SHQIP. Auto-chosen based on product info: if 'product_type' is visible, use it; if 'flavor' is visible, use it; if unclear, use neutral taglines (“Pije Freskuese”, “Me Aloe Vera”, “100% Natyrale”).
- **SIDE BULLET BLOCKS (for 'bullet_list' role):** Always include categories like: Ingredients (visible or known from product name), Product type or category, Target audience (e.g., “Për të gjithë”), Flavor, Claims (“Pa konservues”, “Natyrale”, etc.). Maximum 3 bullets per side.
- **GENERAL:** No emojis, no unnecessary decoration. For blocks where content cannot be generated relevantly (due to rules above), set 'text_sq': null, 'text_en': null, 'items_sq': [], or 'items_en': [].

**-- INPUTS --**
<product_data>
${productInfoString}
</product_data>
<text_layout_structure>
${textLayoutString}
</text_layout_structure>

**-- FINAL QUALITY CHECK --**
Before outputting, verify:
- No misspellings in SHQIP.
- No irrelevant supplement-style blocks for the product type.
- No duplicated text.
- Product name appears only once unless stylistically necessary (e.g., in headline and then in a background element, but not in two prominent foreground blocks).
- No hallucinated claims were added.
- Layout is simplified if too dense for the product type.
- All null or empty blocks are correctly marked.

Output the content in the SAME JSON structure as the Text Layout Schema, but fill in the 'text_sq', 'text_en', 'items_sq', or 'items_en' fields for each block.
Return ONLY the JSON object conforming to GeneratedTextContentSchema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            font_hint: { type: Type.STRING },
            color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  role: { type: Type.STRING, enum: ['headline', 'subheadline', 'bullet_list', 'specs_volume', 'tagline', 'background_headline'] },
                  text_sq: { type: Type.STRING, nullable: true },
                  text_en: { type: Type.STRING, nullable: true },
                  items_sq: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                  items_en: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                  anchor_box: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 4, maxItems: 4 },
                  align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                  size_hint: { type: Type.STRING, enum: ['xl', 'lg', 'md', 'sm', 'xs'] },
                  weight_hint: { type: Type.STRING, enum: ['bold', 'medium', 'light'] },
                },
                required: ['id', 'role', 'anchor_box', 'align', 'size_hint', 'weight_hint'],
              },
            },
          },
          required: ['font_hint', 'color_palette', 'blocks'],
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error calling Gemini API for text content generation:", error);
    throw new Error("Failed to generate text content for overlay.");
  }
};


export const renderTextOverlay = async (
  baseImageBase64: string,
  textLayout: TextLayoutSchema,
  textContent: GeneratedTextContentSchema,
  language: 'sq' | 'en' = 'sq',
  addVibeElements: boolean = false, // New parameter
  matchStyleBackground: boolean = false // New parameter
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = fileToGenerativePart(baseImageBase64);

  const layoutString = JSON.stringify(textLayout);
  const contentString = JSON.stringify(textContent);

  const vibeElementsInstruction = addVibeElements ? `
- **Vibe Elements Handling:** If the style reference includes decorative items (e.g., flowers, fruits, aloe leaves, herbs), you MUST add 1-2 matching, subtle, and realistic elements. Place them harmonically near the product, but NEVER block the product's label or overpower the composition. If the style reference has no such elements, add none.
` : '';

  const styleBackgroundInstruction = matchStyleBackground ? `
- **Match Style Background:** Adopt the color palette or a soft background tone from the style reference. However, you MUST NOT replace or regenerate the background fully. Preserve the main generator's existing background structure, shadows, and product realism, only subtly blending the style reference's background aesthetic.
` : '';


  const prompt = `You are a STRICT text overlay compositor and advanced design engine, operating in "TEXT OVERLAY DESIGN REFINEMENT MODE - FOREVER BRAND". Your ONLY job is to take the provided base product image and accurately place the given text content on top of it according to the specified layout, while applying brand-specific design refinements.

**-- CRITICAL RENDERING RULES --**
1.  **NO BASE IMAGE MODIFICATION:** DO NOT alter, repaint, modify, enhance, or change the original base product image in any way (including its product, label, colors, lighting, shadows, reflections, angle, or rotation). The base image is sacrosanct. Never distort, tilt, bend, warp, or rotate the user's product image. The product MUST remain upright if its angle cannot be replicated by the style reference.
2.  **FIXED BRAND FONTS:** Apply the following fonts consistently for ALL text overlays, overriding any 'font_hint' from the style reference:
    *   **Headline font:** Montserrat ExtraBold (or similar geometric sans bold, if Montserrat is unavailable)
    *   **Subheadline font:** Montserrat SemiBold (or similar)
    *   **Bullets:** Inter Regular (or similar)
    *   **Small info text (e.g., specs, volume, taglines):** Inter Light or Inter Regular (or similar)
3.  **LAYOUT HARMONIZATION & FOREVER BRAND GRAMMAR:** You must still follow the general structure and positions ('anchor_box', 'align', 'size_hint', 'weight_hint') extracted from the style reference. HOWEVER, you MUST also:
    *   Adjust spacing to look clean and professional.
    *   Fix any misalignment.
    *   Balance left and right text blocks.
    *   Ensure no text floats awkwardly.
    *   Make all block placements visually cohesive and avoid overcrowding.
    *   Never let text touch the product.
    *   **Fallback Layout Grammar:** If the style reference leads to an overcrowded or incompatible layout with the product content, stabilize it by adhering to this grammar:
        *   Headline: top-left or top-center
        *   Subheadline: above or near headline
        *   Bullet list (max 3 items): left side
        *   Secondary bullet list (max 3 items): right side
        *   Ingredients: bottom-left
        *   Volume: bottom-right
        *   Background text: ONLY if style reference includes it.
        *   Decorative elements: ONLY if style reference includes them (and 'Add Vibe Elements' is ON).
4.  **LANGUAGE STRICTNESS (SHQIP Only):** All rendered text MUST ONLY be in ALBANIAN (SHQIP), using the 'text_sq' or 'items_sq' fields from the <text_content_json>. DO NOT translate, rewrite, or infer any other language. Fix grammar and spelling automatically without changing meaning.
5.  **NO CREATIVE ELEMENTS (UNLESS TOGGLED):** DO NOT introduce new creative elements, shapes, icons, or graphics that are not part of the provided text content or layout, UNLESS the 'Vibe Elements Handling' instruction is active AND the conditions for adding elements are met.
6.  **TEXT STYLE & APPEARANCE:**
    *   Text MUST be rendered with clean, crisp, sharp edges.
    *   Text MUST be fully readable.
    *   DO NOT curve, bend, distort, or morph text.
    *   DO NOT add glow, shadows, gradients, textures, outlines, or 3D effects to the text.
    *   If needed for readability (e.g., light text on a light background or dark text on a dark background), apply ONLY a soft, subtle 10–20% white or black translucent panel behind the text, using the 'color_palette' as a guide for contrast.
7.  **BIG BACKGROUND HEADLINE:** If a block with 'role': 'background_headline' is present in the <text_content_json> and has content, render it as a large, bold text behind the product, using the specified text content (SHQIP).
8.  **TEXT DENSITY & STYLE REFERENCE FOLLOWING:** Follow the style reference layout but ensure the text content is relevant and clean. Never overcrowd or place text outside the harmonized anchor boxes.

**-- INPUTS --**
<base_image> (The product image on which to overlay text)
<text_layout_json> (Defines positions, sizes, alignments, and general text aesthetics)
${layoutString}
</text_layout_json>
<text_content_json> (Contains the actual text strings to be rendered)
${contentString}
</text_content_json>

**-- RENDERING INSTRUCTIONS --**
- Render the text content from <text_content_json> onto the <base_image>.
- For each block, use its 'id' to match content with layout.
- Apply the 'anchor_box' coordinates (relative 0-1), 'align', 'size_hint', and 'weight_hint' from <text_layout_json> to guide position and style, but prioritize layout harmonization rules.
- Use the 'color_palette' from <text_layout_json> as a guide for text colors.
- Ensure the text is placed cleanly and accurately.
- Maintain the original resolution of the base image.
- **IMPORTANT:** If 'text_sq' or 'items_sq' is null or an empty array for a block, that block MUST NOT be rendered.
${vibeElementsInstruction}
${styleBackgroundInstruction}

**-- FINAL QUALITY CHECK BEFORE RENDERING --**
You MUST verify:
- **No Visual Errors:**
    - Text fits inside its harmonized placement, respecting the general area of 'anchor_box'.
    - No text overlaps with other text blocks or the product's label/important features.
    - No duplicated facts (visually, if content somehow repeated, simplify presentation).
    - No supplement badges unless the product is classified as a supplement (visually).
    - No invented numbers or claims appear.
    - The product is untouched, undistorted, and its label is perfectly preserved.
    - Correct spacing between text blocks and from product edges.
    - Correct text alignment.
    - No broken text alignment.
    - No text covering the label or important product features.
    - All null or empty text blocks are correctly hidden (not rendered).
    - The final output is harmonized, professionally designed, feels natural and balanced, and matches the "Forever aesthetic".

Return ONLY the final harmonized image with the text overlay.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using image generation model for compositing
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("No image with text overlay was generated in the response.");

    return part.inlineData.data;
  } catch (error) {
    console.error("Error calling Gemini API for text overlay rendering:", error);
    throw new Error("Failed to render text overlay.");
  }
};