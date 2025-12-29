
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Slide } from '../types';
import L from 'leaflet';

interface TravelMapProps {
  slides: Slide[];
  currentSlideIndex: number;
  onMarkerClick: (index: number) => void;
}

/**
 * Validates if coordinates are proper numbers.
 */
const isValidCoordinate = (lat: any, lng: any): boolean => {
  return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
};

/**
 * Creates a custom Leaflet DivIcon using Tailwind CSS classes.
 * Enhanced with higher z-index and larger scale for active markers.
 */
const createMarkerIcon = (isActive: boolean) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="transition-all duration-700 ease-out transform ${isActive ? 'scale-150 z-[1000]' : 'scale-100 z-[100]'}">
          <div class="w-10 h-10 ${isActive ? 'bg-indigo-600 shadow-indigo-400 shadow-2xl border-white' : 'bg-slate-500 shadow-md border-slate-200'} rounded-full border-4 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 ${isActive ? 'bg-indigo-600' : 'bg-slate-500'} rotate-45 border-r-2 border-b-2 border-white"></div>
        </div>
        ${isActive ? '<div class="absolute w-14 h-14 bg-indigo-500/20 rounded-full animate-ping pointer-events-none"></div>' : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -45]
  });
};

/**
 * Fixes map rendering issues (shifted center, gray tiles) by forcing 
 * Leaflet to recalculate container size after mounting.
 */
const MapInvalidator: React.FC<{ trigger: any }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    // Small delay to ensure CSS transitions and layout are finalized
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map, trigger]);
  return null;
};

/**
 * Internal component to handle programmatic map movements.
 */
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (isValidCoordinate(center[0], center[1])) {
      // flyTo provides a smooth cinematic zoom and pan effect
      map.flyTo(center, zoom, {
        duration: 1.8,
        easeLinearity: 0.2,
        noMoveStart: true
      });
    }
  }, [center, zoom, map]);

  return null;
};

const TravelMap: React.FC<TravelMapProps> = ({ slides, currentSlideIndex, onMarkerClick }) => {
  const currentSlide = slides[currentSlideIndex];
  
  // Find valid coordinates for initial view and individual markers
  const validSlides = slides.filter(s => s.location && isValidCoordinate(s.location.lat, s.location.lng));
  const firstLocation = validSlides.length > 0 ? validSlides[0].location : null;
  
  // Base configuration for the map center
  const baseCenter: [number, number] = firstLocation 
    ? [firstLocation!.lat, firstLocation!.lng] 
    : [20, 0];
  const baseZoom = firstLocation ? 11 : 2;

  // Configuration for the active focal point
  const hasValidActiveLoc = currentSlide?.location && isValidCoordinate(currentSlide.location.lat, currentSlide.location.lng);
  
  const activeCenter: [number, number] = hasValidActiveLoc
    ? [currentSlide.location!.lat, currentSlide.location!.lng] 
    : baseCenter;

  const activeZoom = hasValidActiveLoc ? 16 : baseZoom;

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-50">
      <MapContainer 
        center={baseCenter} 
        zoom={baseZoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Ensures the map draws correctly even if the container size was 0 on init */}
        <MapInvalidator trigger={slides} />
        
        {/* Cinematic map transitions */}
        <MapUpdater center={activeCenter} zoom={activeZoom} />

        {slides.map((slide, idx) => {
          const lat = slide.location?.lat;
          const lng = slide.location?.lng;
          
          if (!isValidCoordinate(lat, lng)) return null;

          const isActive = idx === currentSlideIndex;

          return (
            <Marker 
              key={`${slide.id}-${idx}`} 
              position={[lat!, lng!]}
              icon={createMarkerIcon(isActive)}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{
                click: (e) => {
                  onMarkerClick(idx);
                },
              }}
            >
              <Popup closeButton={false} className="custom-map-popup">
                <div className="font-outfit p-1 min-w-[120px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">Day {slide.dayNumber}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mb-0.5">{slide.title}</h3>
                  <p className="text-slate-500 text-[10px] flex items-center">
                    <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    {slide.location?.name}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TravelMap;
