
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LocationData, Slide } from '../types';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const customIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface TravelMapProps {
  slides: Slide[];
  currentSlideIndex: number;
}

const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

const TravelMap: React.FC<TravelMapProps> = ({ slides, currentSlideIndex }) => {
  const currentSlide = slides[currentSlideIndex];
  
  // Default to a world view or the first location found
  const firstLocation = slides.find(s => s.location)?.location;
  const defaultCenter: [number, number] = firstLocation 
    ? [firstLocation.lat, firstLocation.lng] 
    : [20, 0];
  const defaultZoom = firstLocation ? 10 : 2;

  const activeCenter: [number, number] = currentSlide?.location 
    ? [currentSlide.location.lat, currentSlide.location.lng] 
    : defaultCenter;

  const activeZoom = currentSlide?.location ? 13 : defaultZoom;

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
          slide.location && (
            <Marker 
              key={idx} 
              position={[slide.location.lat, slide.location.lng]}
              icon={customIcon}
              opacity={idx === currentSlideIndex ? 1 : 0.6}
            >
              <Popup>
                <div className="font-outfit">
                  <h3 className="font-bold text-indigo-600">{slide.title}</h3>
                  <p>{slide.location.name}</p>
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
