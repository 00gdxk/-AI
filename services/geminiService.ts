
import { GoogleGenAI, Type } from "@google/genai";
import { TripData, Slide } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJson = (text: string): string => {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
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
          required: ["title", "bullets"]
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
      return JSON.parse(cleanJson(text)) as TripData;
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
  const prompt = `Photorealistic travel image of ${locationName}. ${description}. Scenic, professional photography, high resolution, 4k, cinematic lighting.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error(`Failed to generate image`, error);
  }
  return null;
};
