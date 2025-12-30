
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

const isVal = (v: any): boolean => {
  if (v === null || v === undefined || v === '') return false;
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  return !isNaN(num) && isFinite(num);
};

const toLatLng = (lat: any, lng: any): L.LatLng | null => {
  if (!isVal(lat) || !isVal(lng)) return null;
  const nLat = parseFloat(String(lat));
  const nLng = parseFloat(String(lng));
  try {
    const l = L.latLng(nLat, nLng);
    if (isVal(l.lat) && isVal(l.lng)) return l;
  } catch (e) {
    console.warn("Invalid coordinates:", lat, lng);
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

const MapUpdater: React.FC<{ center: L.LatLng | null; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && isVal(center.lat) && isVal(center.lng)) {
      const lat = parseFloat(String(center.lat));
      const lng = parseFloat(String(center.lng));
      if (!isNaN(lat) && !isNaN(lng)) {
        try {
          map.flyTo([lat, lng], zoom, { duration: 1.8 });
        } catch (e) {
          console.error("FlyTo failed:", e);
        }
      }
    }
  }, [center, zoom, map]);
  return null;
};

const TravelMap: React.FC<TravelMapProps> = ({ slides, currentSlideIndex, onMarkerClick, darkMode = false }) => {
  const validLatLngs = useMemo(() => {
    return slides.map(s => s.location ? toLatLng(s.location.lat, s.location.lng) : null);
  }, [slides]);

  const validSlidesWithCoords = useMemo(() => {
    return slides
      .map((s, idx) => ({ slide: s, latlng: validLatLngs[idx], originalIdx: idx }))
      .filter(item => item.latlng !== null)
      .sort((a, b) => a.slide.dayNumber - b.slide.dayNumber);
  }, [slides, validLatLngs]);

  const currentSlideLatLng = validLatLngs[currentSlideIndex];
  const baseCenter = useMemo(() => {
    return validSlidesWithCoords.length > 0 ? validSlidesWithCoords[0].latlng : L.latLng(51.505, -0.09);
  }, [validSlidesWithCoords]);

  const activeCenter = currentSlideLatLng || baseCenter;
  const activeZoom = currentSlideLatLng ? 15 : 11;

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
        center={baseCenter || L.latLng(51.505, -0.09)} 
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
              <div className="font-outfit p-1 min-w-[120px] dark:text-slate-200">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{slide.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">{slide.location?.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: white;
          border: 1px solid #334155;
        }
        .dark-popup .leaflet-popup-tip {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default TravelMap;
