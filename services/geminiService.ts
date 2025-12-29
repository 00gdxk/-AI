
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
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // Max width for storage images
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with reduced quality
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(base64Str);
  });
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
  
  STRICT REQUIREMENT: The itinerary MUST span exactly ${days} days. Do not generate more or fewer days than requested.
  
  For each activity (Slide), you MUST provide a "dayNumber" (from 1 to ${days}).
  Aim for 2-4 key destination points per day.
  
  IMPORTANT: All text in the JSON response MUST be in ${targetLanguage}.
  
  For each destination point (Slide), you MUST provide:
  1. CORE LOGISTICS: A time slot (e.g. 09:00 - 11:00), specific transport time, and clear directions (metro line/exit).
  2. EXPERIENCE: 2-3 must-do items, a "Did you know?" history story/fun fact, and the best photo spot.
  3. REFUEL: A specific recommended restaurant, a quick fallback option, and a nearby rest stop.
  4. PRACTICAL: Ticket/reservation info, opening hours, local tips (warnings/advice), and a "Plan B" alternative for bad weather.

  Generate a JSON response following the responseSchema.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      tripTitle: { type: Type.STRING },
      tripSummary: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            dayNumber: { type: Type.INTEGER, description: "The day of the trip this activity occurs on (1-indexed)" },
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
          required: ["title", "bullets", "dayNumber"]
        }
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

export const fetchActivitiesWithSearch = async (locationName: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `What are the top 3 activities or hidden gems in ${locationName}? Be extremely concise.`,
      config: { tools: [{ googleSearch: {} }] },
    });
    return response.text ? [response.text] : [];
  } catch (error) {
    return [];
  }
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
        // Compress immediately to save memory and storage space
        return await compressImage(rawBase64, 0.6);
      }
    }
  } catch (error) {
    console.error(`Failed to generate image`, error);
  }
  return null;
};

export const compressUploadedImage = async (base64Str: string): Promise<string> => {
  return await compressImage(base64Str, 0.6);
};
