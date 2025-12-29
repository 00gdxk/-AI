
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Slide } from '../types';
import L from 'leaflet';

interface TravelMapProps {
  slides: Slide[];
  currentSlideIndex: number;
  onMarkerClick: (index: number) => void;
}

// Utility to validate coordinates
const isValidCoordinate = (lat: any, lng: any): boolean => {
  return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
};

// Function to create a custom Tailwind-styled marker icon
const createMarkerIcon = (isActive: boolean) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="transition-all duration-500 transform ${isActive ? 'scale-125 z-50' : 'scale-100 z-10'}">
          <div class="w-10 h-10 ${isActive ? 'bg-indigo-600 shadow-indigo-300 shadow-xl' : 'bg-slate-500 shadow-md'} rounded-full border-4 border-white flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 ${isActive ? 'bg-indigo-600' : 'bg-slate-500'} rotate-45 border-r-2 border-b-2 border-white"></div>
        </div>
        ${isActive ? '<div class="absolute w-12 h-12 bg-indigo-400/30 rounded-full animate-ping"></div>' : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -45]
  });
};

const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    // Only attempt to fly if center is valid
    if (isValidCoordinate(center[0], center[1])) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);
  return null;
};

const TravelMap: React.FC<TravelMapProps> = ({ slides, currentSlideIndex, onMarkerClick }) => {
  const currentSlide = slides[currentSlideIndex];
  
  // Default to a world view or the first valid location found
  const validSlides = slides.filter(s => s.location && isValidCoordinate(s.location.lat, s.location.lng));
  const firstLocation = validSlides.length > 0 ? validSlides[0].location : null;
  
  const defaultCenter: [number, number] = firstLocation 
    ? [firstLocation!.lat, firstLocation!.lng] 
    : [20, 0];
  const defaultZoom = firstLocation ? 10 : 2;

  // Validate active center before passing to map
  const hasValidActiveLoc = currentSlide?.location && isValidCoordinate(currentSlide.location.lat, currentSlide.location.lng);
  const activeCenter: [number, number] = hasValidActiveLoc
    ? [currentSlide.location!.lat, currentSlide.location!.lng] 
    : defaultCenter;

  const activeZoom = hasValidActiveLoc ? 14 : defaultZoom;

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={activeCenter} zoom={activeZoom} />

        {slides.map((slide, idx) => (
          slide.location && isValidCoordinate(slide.location.lat, slide.location.lng) && (
            <Marker 
              key={`${slide.id}-${idx}`} 
              position={[slide.location.lat, slide.location.lng]}
              icon={createMarkerIcon(idx === currentSlideIndex)}
              eventHandlers={{
                click: () => onMarkerClick(idx),
              }}
            >
              <Popup closeButton={false} className="custom-map-popup">
                <div className="font-outfit p-1">
                  <h3 className="font-bold text-indigo-600 text-sm leading-tight">{slide.title}</h3>
                  <p className="text-slate-500 text-[10px] mt-0.5">{slide.location.name}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default TravelMap;
