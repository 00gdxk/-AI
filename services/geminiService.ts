
import { GoogleGenAI, Type } from "@google/genai";
import { TripData, Slide } from "../types";

const cleanJson = (text: string): string => {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
};

/**
 * Parses a coordinate value safely. 
 * Handles cases where the AI returns comma-separated pairs, nested objects, or malformed strings.
 */
const parseSafeCoord = (v: any, fallback: number): number => {
  if (v === null || v === undefined || v === '') return fallback;
  
  let val = v;
  
  // Case: Model returned an object like { lat: 39, lng: 116 } inside the lat field
  if (typeof v === 'object' && v !== null) {
    val = v.lat ?? v.lng ?? v.value ?? v.coord ?? Object.values(v).find(x => typeof x === 'number') ?? fallback;
  }
  
  // Case: Model returned a string like "39.905, 116.397"
  if (typeof val === 'string' && val.includes(',')) {
    val = val.split(',')[0];
  }

  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return (isNaN(n) || !isFinite(n)) ? fallback : n;
};

/**
 * Compresses a base64 image string to a smaller JPEG.
 */
const compressImage = (base64Str: string, quality: number = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      try {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const findRealImageOnWeb = async (locationName: string): Promise<{ url: string; source: string; sourceTitle: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Find a high-quality, direct public image URL for: "${locationName}". 
    Focus on specific landmark photography.
    Respond with JSON: {"imageUrl": "string", "sourceUrl": "string", "sourceTitle": "string"}. 
    If not found, set imageUrl to null.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            imageUrl: { type: Type.STRING, nullable: true },
            sourceUrl: { type: Type.STRING, nullable: true },
            sourceTitle: { type: Type.STRING, nullable: true }
          }
        }
      },
    });

    const data = JSON.parse(cleanJson(response.text));
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceInfo = chunks.find(c => c.web)?.web || { uri: data.sourceUrl, title: data.sourceTitle || locationName };

    if (data.imageUrl && data.imageUrl.startsWith('http')) {
      return {
        url: data.imageUrl,
        source: sourceInfo.uri || data.sourceUrl || '',
        sourceTitle: sourceInfo.title || data.sourceTitle || 'Web Image'
      };
    }
  } catch (error) {
    console.warn(`Image search failed for ${locationName}`, error);
  }
  return null;
};

export const generateTravelPlan = async (
  destination: string,
  days: number,
  interests: string,
  language: string,
  location?: { latitude: number; longitude: number }
): Promise<TripData | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langMap: Record<string, string> = { en: "English", cn: "Chinese (Simplified)", jp: "Japanese" };
  const targetLanguage = langMap[language] || "English";

  const prompt = `Plan a ${days}-day itinerary for ${destination} (Interests: ${interests}).
  
  STRICT GEOGRAPHIC ROUTING:
  1. Neighborhood Clustering: Group all activities for a single day within the same neighborhood.
  2. Sequential Logic: Order locations North-to-South or Center-to-Outskirts to avoid zig-zagging.
  
  Format: JSON only. Language: ${targetLanguage}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tripTitle: { type: Type.STRING },
            tripSummary: { type: Type.STRING },
            slides: { 
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                  location: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    },
                    required: ["name", "lat", "lng"]
                  },
                  logistics: {
                    type: Type.OBJECT,
                    properties: {
                      timeSlot: { type: Type.STRING },
                      transport: { type: Type.STRING },
                      directions: { type: Type.STRING },
                      address: { type: Type.STRING }
                    }
                  },
                  experience: {
                    type: Type.OBJECT,
                    properties: {
                      mustDos: { type: Type.ARRAY, items: { type: Type.STRING } },
                      funFact: { type: Type.STRING },
                      photoSpots: { type: Type.STRING }
                    }
                  },
                  dining: {
                    type: Type.OBJECT,
                    properties: {
                      recommendation: { type: Type.STRING },
                      fallback: { type: Type.STRING },
                      restArea: { type: Type.STRING }
                    }
                  },
                  practical: {
                    type: Type.OBJECT,
                    properties: {
                      tickets: { type: Type.STRING },
                      hours: { type: Type.STRING },
                      tips: { type: Type.STRING },
                      planB: { type: Type.STRING }
                    }
                  }
                },
                required: ["title", "bullets", "dayNumber", "location"]
              }
            }
          },
          required: ["tripTitle", "slides"]
        }
      },
    });

    const parsed = JSON.parse(cleanJson(response.text)) as TripData;
    if (parsed.slides) {
      parsed.slides = parsed.slides.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        location: s.location ? {
          ...s.location,
          lat: parseSafeCoord(s.location.lat, 51.505),
          lng: parseSafeCoord(s.location.lng, -0.09)
        } : undefined
      } as Slide));
      parsed.slides.sort((a, b) => a.dayNumber - b.dayNumber);
    }
    return parsed;
  } catch (error: any) {
    throw new Error(error.message || "Plan generation failed.");
  }
};

export const translateTripData = async (sourceData: TripData, targetLangCode: string): Promise<TripData | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langMap: Record<string, string> = { en: "English", cn: "Chinese (Simplified)", jp: "Japanese" };
  const targetLanguage = langMap[targetLangCode] || "English";

  const prompt = `Translate this travel itinerary to ${targetLanguage}. Preserve JSON structure and coordinates EXACTLY.
  JSON: ${JSON.stringify(sourceData)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const translated = JSON.parse(cleanJson(response.text)) as TripData;
    translated.id = sourceData.id;
    translated.timestamp = sourceData.timestamp;
    translated.destination = sourceData.destination;
    translated.days = sourceData.days;

    translated.slides = translated.slides.map((s, idx) => {
      const orig = sourceData.slides[idx];
      if (!orig) return s as Slide;
      return {
        ...s,
        id: orig.id,
        dayNumber: orig.dayNumber,
        imageUrl: orig.imageUrl,
        imageSource: orig.imageSource,
        imageSourceTitle: orig.imageSourceTitle,
        location: orig.location ? {
          ...s.location,
          name: s.location?.name || orig.location.name,
          lat: parseSafeCoord(orig.location.lat, 51.505),
          lng: parseSafeCoord(orig.location.lng, -0.09)
        } : undefined
      } as Slide;
    });
    return translated;
  } catch (error) {
    return null;
  }
};

export const generateLocationImage = async (locationName: string, description: string = ''): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Hyper-realistic travel photo of ${locationName}. ${description}. 8k, professional photography. Direct front view, no text or watermarks.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return await compressImage(`data:image/png;base64,${part.inlineData.data}`, 0.6);
      }
    }
    
    // Fallback search if generation didn't yield an image part
    console.warn("No inlineData found in image generation response parts.");
  } catch (error) {
    console.error(`Image generation failed for ${locationName}:`, error);
  }
  return null;
};

export const compressUploadedImage = async (base64Str: string): Promise<string> => {
  return await compressImage(base64Str, 0.6);
};
