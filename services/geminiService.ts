
import { GoogleGenAI, Type } from "@google/genai";
import { TripData, Slide } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJson = (text: string): string => {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
};

/**
 * Compresses a base64 image string to a smaller JPEG to save localStorage space.
 */
const compressImage = (base64Str: string, quality: number = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Crucial for external images
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

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
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (e) {
        // Fallback for CORS issues
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

/**
 * Tries to find a real-world image URL for a specific location using Google Search.
 */
export const findRealImageOnWeb = async (locationName: string): Promise<{ url: string; source: string; sourceTitle: string } | null> => {
  try {
    const prompt = `Find a direct link to a high-quality, public web image of the landmark or location: "${locationName}". 
    Focus on finding a specific image file (jpg, png, webp).
    Respond with JSON only. 
    Include: "imageUrl" (the direct link) and "sourceUrl" (the website it came from).
    If no direct image link is certain, set imageUrl to null.`;

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
    
    // Extract grounding chunks for compliance and verification
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
    console.warn(`Failed to fetch real image for ${locationName}:`, error);
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
  const langMap: Record<string, string> = {
    en: "English",
    cn: "Chinese (Simplified)",
    jp: "Japanese"
  };
  const targetLanguage = langMap[language] || "English";

  const prompt = `Plan a detailed ${days}-day travel itinerary for ${destination} based on interests: ${interests}.
  STRICT REQUIREMENT: The itinerary MUST span exactly ${days} days.
  For each activity, provide a "dayNumber" (1 to ${days}).
  All text in the JSON response MUST be in ${targetLanguage}.
  `;

  const slideSchema = {
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
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      tripTitle: { type: Type.STRING },
      tripSummary: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: slideSchema
      }
    },
    required: ["tripTitle", "slides"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(cleanJson(text)) as TripData;
      if (parsed.slides) {
        // Fix for coordinate handling and ensuring Slide typing
        parsed.slides = parsed.slides.map(s => ({
          ...s,
          location: s.location ? {
            name: s.location.name,
            lat: Number(s.location.lat),
            lng: Number(s.location.lng),
            description: s.location.description
          } : undefined
        }) as Slide);
        parsed.slides.sort((a, b) => a.dayNumber - b.dayNumber);
      }
      return parsed;
    }
  } catch (error: any) {
    console.error("Error generating travel plan:", error);
    throw new Error(error.message || "Failed to generate travel plan.");
  }
  return null;
};

export const translateTripData = async (
  sourceData: TripData,
  targetLangCode: string
): Promise<TripData | null> => {
  const langMap: Record<string, string> = {
    en: "English",
    cn: "Chinese (Simplified)",
    jp: "Japanese"
  };
  const targetLanguage = langMap[targetLangCode] || "English";

  const prompt = `Translate this travel itinerary into ${targetLanguage}. Keep the exact same JSON structure. 
  Do not change any IDs, coordinates, or numbers. Only translate the text fields.
  JSON: ${JSON.stringify(sourceData)}`;

  // Enforce schema during translation to avoid missing properties
  const translationSchema = {
    type: Type.OBJECT,
    properties: {
      tripTitle: { type: Type.STRING },
      tripSummary: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            location: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              }
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
          }
        }
      }
    },
    required: ["tripTitle", "slides"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: translationSchema
      },
    });

    const text = response.text;
    if (text) {
      const translated = JSON.parse(cleanJson(text)) as TripData;
      
      // Defensive check to prevent "Cannot read properties of undefined (reading 'map')"
      if (!translated || !Array.isArray(translated.slides)) {
        console.error("Translation returned invalid structure", translated);
        return null;
      }

      translated.id = sourceData.id;
      translated.timestamp = sourceData.timestamp;
      translated.destination = sourceData.destination;
      translated.days = sourceData.days;

      // Ensure each slide is correctly typed and merges original non-translated data
      translated.slides = translated.slides.map((s, idx) => {
        const originalSlide = sourceData.slides[idx];
        if (!originalSlide) return s as Slide;
        
        // Fix: Explicitly reconstruct the slide to satisfy the Slide interface and restore coords/name
        const updatedSlide: Slide = {
          ...s,
          id: originalSlide.id,
          dayNumber: originalSlide.dayNumber, // Ensure day numbers are preserved
          imageUrl: originalSlide.imageUrl,
          imageSource: originalSlide.imageSource,
          imageSourceTitle: originalSlide.imageSourceTitle,
          location: originalSlide.location ? {
            name: s.location?.name || originalSlide.location.name,
            description: s.location?.description || originalSlide.location.description,
            lat: Number(originalSlide.location.lat),
            lng: Number(originalSlide.location.lng)
          } : undefined
        };
        return updatedSlide;
      });
      return translated;
    }
  } catch (error) {
    console.error("Translation failed:", error);
  }
  return null;
};

export const generateLocationImage = async (locationName: string, description: string = ''): Promise<string | null> => {
  const prompt = `Photorealistic travel image of ${locationName}. ${description}. Scenic, cinematic lighting, 4k.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
        return await compressImage(rawBase64, 0.6);
      }
    }
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("QUOTA") || error.message?.includes("RATE_LIMIT") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("RATE_LIMIT");
    }
    console.error(`Failed to generate image`, error);
  }
  return null;
};

export const compressUploadedImage = async (base64Str: string): Promise<string> => {
  return await compressImage(base64Str, 0.6);
};
