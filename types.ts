
export interface LocationData {
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  dayNumber: number; // New field to track which day this activity belongs to
  bullets: string[];
  location?: LocationData;
  imageUrl?: string;
  // New detailed fields
  logistics?: {
    timeSlot: string;
    transport: string;
    directions: string;
    address: string;
  };
  experience?: {
    mustDos: string[];
    funFact: string;
    photoSpots: string;
  };
  dining?: {
    recommendation: string;
    fallback: string;
    restArea: string;
  };
  practical?: {
    tickets: string;
    hours: string;
    tips: string;
    planB: string;
  };
}

export interface TripData {
  id: string; // Unique identifier for saving
  timestamp: number; // When it was created
  destination: string; // The search term used
  days: number;
  tripTitle: string;
  tripSummary: string;
  slides: Slide[];
}

export interface TravelPlace {
  title: string;
  uri: string;
  description?: string;
}
