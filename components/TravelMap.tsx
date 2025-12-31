
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { Slide } from '../types';
import L from 'leaflet';

interface TravelMapProps {
  slides: Slide[];
  currentSlideIndex: number;
  onMarkerClick: (index: number) => void;
  darkMode?: boolean;
}

/**
 * Validates if a value is a finite number.
 */
const isFiniteNumber = (v: any): boolean => {
  if (v === null || v === undefined || v === '') return false;
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  return !isNaN(num) && isFinite(num);
};

/**
 * Validates a LatLng object or array.
 */
const isValidCoordinate = (lat: any, lng: any): boolean => {
  return isFiniteNumber(lat) && isFiniteNumber(lng);
};

/**
 * Converts coordinates to a Leaflet LatLng object, returning null if invalid.
 */
const toLatLng = (lat: any, lng: any): L.LatLng | null => {
  if (!isValidCoordinate(lat, lng)) return null;
  try {
    const nLat = parseFloat(String(lat));
    const nLng = parseFloat(String(lng));
    const l = L.latLng(nLat, nLng);
    // Double check the internal properties just in case
    if (isFinite(l.lat) && isFinite(l.lng)) return l;
  } catch (e) {
    console.warn("Leaflet LatLng construction failed:", e);
  }
  return null;
};

const createMarkerIcon = (isActive: boolean, isDark: boolean) => {
  const primaryColor = isDark ? 'bg-indigo-500' : 'bg-indigo-600';
  const shadowColor = isDark ? 'shadow-indigo-500/40' : 'shadow-indigo-400';
  const borderColor = isDark ? 'border-slate-900' : 'border-white';
  const inactiveColor = isDark ? 'bg-slate-700' : 'bg-slate-500';
  const inactiveBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="transition-all duration-700 ease-out transform ${isActive ? 'scale-150 z-[1000]' : 'scale-100 z-[100]'}">
          <div class="w-10 h-10 ${isActive ? `${primaryColor} ${shadowColor} ${borderColor}` : `${inactiveColor} ${inactiveBorder}`} rounded-full border-4 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
        </div>
        ${isActive ? `<div class="absolute w-14 h-14 ${isDark ? 'bg-indigo-500/30' : 'bg-indigo-500/20'} rounded-full animate-ping pointer-events-none"></div>` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -45]
  });
};

/**
 * Handles map movement when the center coordinate changes.
 */
const MapUpdater: React.FC<{ center: L.LatLng | null; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && isFiniteNumber(center.lat) && isFiniteNumber(center.lng)) {
      try {
        map.flyTo(center, zoom, { duration: 1.8 });
      } catch (e) {
        console.error("FlyTo failed:", e);
      }
    }
  }, [center, zoom, map]);
  
  return null;
};

const TravelMap: React.FC<TravelMapProps> = ({ slides, currentSlideIndex, onMarkerClick, darkMode = false }) => {
  // Pre-validate all coordinates
  const validLatLngs = useMemo(() => {
    return slides.map(s => s.location ? toLatLng(s.location.lat, s.location.lng) : null);
  }, [slides]);

  // Filter slides to only those with truly valid coordinates
  const validSlidesWithCoords = useMemo(() => {
    return slides
      .map((s, idx) => ({ slide: s, latlng: validLatLngs[idx], originalIdx: idx }))
      .filter(item => item.latlng !== null)
      .sort((a, b) => a.slide.dayNumber - b.slide.dayNumber);
  }, [slides, validLatLngs]);

  // Determine current active center or fallback to default
  const DEFAULT_CENTER = L.latLng(51.505, -0.09);
  
  const currentSlideLatLng = validLatLngs[currentSlideIndex];
  
  const baseCenter = useMemo(() => {
    if (validSlidesWithCoords.length > 0) {
      const first = validSlidesWithCoords[0].latlng;
      if (first && isFiniteNumber(first.lat) && isFiniteNumber(first.lng)) return first;
    }
    return DEFAULT_CENTER;
  }, [validSlidesWithCoords]);

  const activeCenter = currentSlideLatLng || baseCenter;
  const activeZoom = currentSlideLatLng ? 15 : 11;

  // Path for polyline
  const pathPositions = useMemo(() => 
    validSlidesWithCoords.map(item => item.latlng as L.LatLng),
  [validSlidesWithCoords]);

  const tileUrl = darkMode 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const polylineColor = darkMode ? '#818cf8' : '#4f46e5';

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      <MapContainer 
        center={baseCenter} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
      >
        <TileLayer url={tileUrl} />
        <MapUpdater center={activeCenter} zoom={activeZoom} />
        
        {pathPositions.length > 1 && (
          <Polyline 
            positions={pathPositions} 
            pathOptions={{ color: polylineColor, weight: 4, opacity: 0.7, dashArray: '10, 10' }} 
          />
        )}

        {validSlidesWithCoords.map(({ slide, latlng, originalIdx }) => (
          <Marker 
            key={`${slide.id}-${originalIdx}`} 
            position={latlng!} 
            icon={createMarkerIcon(originalIdx === currentSlideIndex, darkMode)} 
            eventHandlers={{ click: () => onMarkerClick(originalIdx) }}
          >
            <Popup closeButton={false} className={darkMode ? 'dark-popup' : ''}>
              <div className="font-outfit p-1 min-w-[160px] max-w-[240px]">
                {slide.imageUrl && (
                  <div className="w-full h-24 mb-2 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
                    <img 
                      src={slide.imageUrl} 
                      alt={slide.title} 
                      className="w-full h-full object-cover"
                      onLoad={(e) => {
                        // Leaflet popups sometimes need a nudge to update their size if an image loads after opening
                        const target = e.target as HTMLImageElement;
                        const popup = target.closest('.leaflet-popup');
                        if (popup) {
                          const contentWrapper = popup.querySelector('.leaflet-popup-content-wrapper');
                          contentWrapper?.dispatchEvent(new Event('resize'));
                        }
                      }}
                    />
                  </div>
                )}
                <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 leading-tight">{slide.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] mb-1 font-semibold uppercase tracking-wider">{slide.location?.name}</p>
                {slide.location?.description && (
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2 leading-snug border-t border-slate-50 dark:border-slate-800 mt-1.5 pt-1.5">
                    {slide.location.description}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                   <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Day {slide.dayNumber}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <style>{`
        .leaflet-popup-content {
          margin: 12px !important;
        }
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .dark-popup .leaflet-popup-tip {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default TravelMap;
