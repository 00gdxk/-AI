import React, { useRef } from 'react';
import { Slide } from '../types';

interface TripGalleryProps {
  slides: Slide[];
  onNavigateToSlide: (index: number) => void;
  onUpdateImage: (index: number, newImageUrl: string) => void;
  imageGenProgress?: { current: number; total: number };
}

const TripGallery: React.FC<TripGalleryProps> = ({ 
  slides, 
  onNavigateToSlide, 
  onUpdateImage,
  imageGenProgress
}) => {
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

  const isComplete = imageGenProgress && imageGenProgress.current >= imageGenProgress.total;

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 p-8 lg:p-14 transition-colors duration-700">
      <div className="max-w-7xl mx-auto">
        <header className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-8 animate-fadeIn">
          <div className="space-y-3">
            <h2 className="text-5xl font-outfit font-bold text-slate-900 dark:text-slate-50 tracking-tighter">Journey Vision</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-md">The visual story of your upcoming exploration.</p>
          </div>
          
          {!isComplete && imageGenProgress && (
            <div className="glass px-6 py-4 rounded-[2rem] flex items-center space-x-4 shadow-xl shadow-brand-500/5">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest">
                Visualizing Experience: {imageGenProgress.current} / {imageGenProgress.total}
              </span>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20">
          {slides.map((slide, index) => {
            const isGenerating = imageGenProgress && index >= imageGenProgress.current && !slide.imageUrl;
            
            return (
              <div key={index} className="group flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100 dark:border-slate-800/80 animate-fadeIn" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800/50">
                  {slide.imageUrl ? (
                    <>
                      <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                      {slide.imageSource && (
                        <div className="absolute top-4 left-4 z-20">
                          <a 
                            href={slide.imageSource} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-slate-950/40 backdrop-blur-xl text-[9px] font-black text-white px-2.5 py-1.5 rounded-xl border border-white/10 hover:bg-slate-950/70 transition-colors uppercase tracking-widest"
                          >
                            Source: {slide.imageSourceTitle || 'Web'}
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/20 text-slate-300 dark:text-slate-700 p-8">
                      {isGenerating ? (
                        <div className="text-center space-y-4">
                          <div className="w-10 h-10 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-500/60">Processing</span>
                        </div>
                      ) : (
                        <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-4 backdrop-blur-sm">
                    <button onClick={() => onNavigateToSlide(index)} className="bg-white text-slate-900 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl active:scale-90">
                      View Itinerary
                    </button>
                    <button onClick={() => fileInputRefs.current[index]?.click()} className="bg-brand-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all transform translate-y-4 group-hover:translate-y-0 delay-75 shadow-xl active:scale-90">
                      Swap
                    </button>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-outfit font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight line-clamp-2">{slide.title}</h3>
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg ml-3 whitespace-nowrap uppercase tracking-widest">Day {slide.dayNumber}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-500 text-xs font-bold flex items-center uppercase tracking-widest">
                      <svg className="w-3.5 h-3.5 mr-1.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {slide.location?.name || 'Local Route'}
                    </p>
                  </div>
                </div>
                <input type="file" ref={el => { fileInputRefs.current[index] = el; }} onChange={e => handleFileUpload(index, e)} accept="image/*" className="hidden" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TripGallery;