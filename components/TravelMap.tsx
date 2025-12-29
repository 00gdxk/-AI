
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Slide } from '../types';
import L from 'leaflet';

interface TravelMapProps {
  slides: Slide[];
  currentSlideIndex: number;
  onMarkerClick: (index: number) => void;
}

/**
 * Robust numeric check to prevent NaN/Infinity from reaching Leaflet.
 */
const isVal = (v: any): v is number => {
  const num = typeof v === 'string' ? parseFloat(v) : v;
  return typeof num === 'number' && !isNaN(num) && isFinite(num);
};

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
        </div>
        ${isActive ? '<div class="absolute w-14 h-14 bg-indigo-500/20 rounded-full animate-ping pointer-events-none"></div>' : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -45]
  });
};

const MapInvalidator: React.FC<{ trigger: any }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map, trigger]);
  return null;
};

const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (isVal(center[0]) && isVal(center[1])) {
      map.flyTo(center, zoom, { duration: 1.8 });
    }
  }, [center, zoom, map]);
  return null;
};

const TravelMap: React.FC<TravelMapProps> = ({ slides, currentSlideIndex, onMarkerClick }) => {
  const validSlides = useMemo(() => slides.filter(s => s.location && isVal(s.location.lat) && isVal(s.location.lng)), [slides]);
  
  const currentSlide = slides[currentSlideIndex];
  const firstValid = validSlides[0];
  
  const baseCenter: [number, number] = firstValid ? [Number(firstValid.location!.lat), Number(firstValid.location!.lng)] : [20, 0];
  const baseZoom = firstValid ? 11 : 2;

  const hasActive = currentSlide?.location && isVal(currentSlide.location.lat) && isVal(currentSlide.location.lng);
  const activeCenter: [number, number] = hasActive ? [Number(currentSlide.location!.lat), Number(currentSlide.location!.lng)] : baseCenter;
  const activeZoom = hasActive ? 16 : baseZoom;

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-50">
      <MapContainer 
        key={`map-container-${validSlides.length}-${firstValid?.location?.lat}`} // Force re-mount if base center changes significantly
        center={baseCenter} 
        zoom={baseZoom} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapInvalidator trigger={slides} />
        <MapUpdater center={activeCenter} zoom={activeZoom} />
        {validSlides.map((slide, idx) => {
          // Double check despite validSlides filtering
          if (!slide.location || !isVal(slide.location.lat) || !isVal(slide.location.lng)) return null;
          
          const pos: [number, number] = [Number(slide.location.lat), Number(slide.location.lng)];
          const slideIdx = slides.indexOf(slide); // Get original index for parent interaction

          return (
            <Marker 
              key={`${slide.id}-${idx}`} 
              position={pos} 
              icon={createMarkerIcon(slideIdx === currentSlideIndex)} 
              eventHandlers={{ click: () => onMarkerClick(slideIdx) }}
            >
              <Popup closeButton={false}>
                <div className="font-outfit p-1 min-w-[120px]">
                  <h3 className="font-bold text-slate-900 text-sm">{slide.title}</h3>
                  <p className="text-slate-500 text-[10px]">{slide.location.name}</p>
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
