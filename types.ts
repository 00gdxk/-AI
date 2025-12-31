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
  dayNumber: number;
  bullets: string[];
  location?: LocationData;
  imageUrl?: string;
  imageSource?: string;
  imageSourceTitle?: string;
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
  id: string;
  timestamp: number;
  destination: string;
  days: number;
  tripTitle: string;
  tripSummary: string;
  slides: Slide[];
  groundingSources?: { title: string; uri: string }[];
}

export interface TravelPlace {
  title: string;
  uri: string;
  description?: string;
}