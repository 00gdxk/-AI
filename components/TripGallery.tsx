
import React, { useRef } from 'react';
import { Slide } from '../types';

interface TripGalleryProps {
  slides: Slide[];
  onNavigateToSlide: (index: number) => void;
  onUpdateImage: (index: number, newImageUrl: string) => void;
}

const TripGallery: React.FC<TripGalleryProps> = ({ slides, onNavigateToSlide, onUpdateImage }) => {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onUpdateImage(index, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h2 className="text-4xl font-outfit font-bold text-slate-900">Journey Gallery</h2>
          <p className="text-slate-500 mt-2 text-lg">Your itinerary, captured in visuals.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {slides.map((slide, index) => (
            <div key={index} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-slate-100 flex flex-col">
              <div className="relative aspect-video w-full overflow-hidden bg-slate-200">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                  <button onClick={() => onNavigateToSlide(index)} className="bg-white/90 hover:bg-white text-slate-800 px-4 py-2 rounded-lg text-sm font-bold transition-all transform translate-y-2 group-hover:translate-y-0">
                    View Day {index + 1}
                  </button>
                  <button onClick={() => fileInputRefs.current[index]?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all transform translate-y-2 group-hover:translate-y-0 delay-75">
                    Upload
                  </button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-outfit font-bold text-slate-900 mb-1">{slide.title}</h3>
                <p className="text-slate-500 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {slide.location?.name || 'Multiple Locations'}
                </p>
              </div>
              {/* Fix: Wrapped assignment in braces to return void and satisfy the Ref type requirement */}
              <input type="file" ref={el => { fileInputRefs.current[index] = el; }} onChange={e => handleFileUpload(index, e)} accept="image/*" className="hidden" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TripGallery;
