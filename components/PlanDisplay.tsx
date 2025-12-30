import React from 'react';
import { Slide } from '../types';

interface PlanDisplayProps {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
  language?: string;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ 
  slide, 
  currentIndex, 
  totalSlides, 
  onNext, 
  onPrev,
  language = 'en'
}) => {
  const sectionLabels = {
    en: { log: "Tactics", exp: "Exploration", food: "Refuel", info: "Essentials", day: "Day" },
    cn: { log: "行程动线", exp: "深度发现", food: "餐饮推荐", info: "出行备忘", day: "第" },
    jp: { log: "移動戦略", exp: "スポット探索", food: "食事・休憩", info: "実用情報", day: "日目" }
  }[language as 'en'|'cn'|'jp'] || { log: "Tactics", exp: "Exploration", food: "Refuel", info: "Essentials", day: "Day" };

  const dayLabel = language === 'cn' ? `${sectionLabels.day}${slide.dayNumber}天` : 
                   language === 'jp' ? `${slide.dayNumber}${sectionLabels.day}` : 
                   `${sectionLabels.day} ${slide.dayNumber}`;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-500 overflow-hidden">
      {/* Visual Header */}
      <div className="relative h-56 flex-shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {slide.imageUrl ? (
          <>
            <img 
              src={slide.imageUrl} 
              alt={slide.title} 
              className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-900 opacity-90" />
        )}
        
        <div className="absolute bottom-6 left-8 right-8 z-10 space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="bg-brand-500/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-widest uppercase text-white border border-white/15">
              {dayLabel}
            </span>
            {slide.logistics?.timeSlot && (
              <span className="bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-tight text-white/90 border border-white/10 flex items-center">
                <svg className="w-2.5 h-2.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {slide.logistics.timeSlot}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-outfit font-bold text-white leading-tight tracking-tight drop-shadow-md">{slide.title}</h2>
          {slide.imageSource && (
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-tighter truncate max-w-[200px]">Photo: {slide.imageSourceTitle || 'Global Web'}</p>
          )}
        </div>
      </div>

      {/* Structured Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-white dark:bg-slate-900">
        
        {/* Pillar: Logistics/Tactics */}
        <div className="space-y-4">
          <header className="flex items-center space-x-3">
             <div className="w-1.5 h-5 bg-brand-500 rounded-full"></div>
             <h3 className="text-[11px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-widest">{sectionLabels.log}</h3>
          </header>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 transition-colors">
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Movement</p>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-snug">{slide.logistics?.transport || "Exploratory"}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 transition-colors">
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Navigation</p>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-snug">{slide.logistics?.directions || "Visual cues"}</p>
            </div>
          </div>
        </div>

        {/* Pillar: Exploration Discovery */}
        <div className="space-y-4">
          <header className="flex items-center space-x-3">
             <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
             <h3 className="text-[11px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">{sectionLabels.exp}</h3>
          </header>
          <div className="space-y-5">
            <ul className="grid grid-cols-1 gap-3">
              {slide.experience?.mustDos.map((item, i) => (
                <li key={i} className="flex items-start text-[14px] text-slate-700 dark:text-slate-300 font-medium group">
                  <div className="mt-1.5 w-2 h-2 rounded-full border-2 border-emerald-500 dark:border-emerald-600 mr-4 flex-shrink-0 group-hover:bg-emerald-500 transition-colors" />
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-amber-50/40 dark:bg-amber-900/10 p-5 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
               <div className="flex items-center space-x-2 mb-2">
                 <span className="text-xs">✨</span>
                 <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Discovery Insight</p>
               </div>
               <p className="text-[13px] text-amber-900/90 dark:text-amber-200/80 italic font-medium leading-relaxed leading-snug">"{slide.experience?.funFact}"</p>
            </div>
          </div>
        </div>

        {/* Pillar: Bottom Grid (Food & Info) */}
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            <header className="flex items-center space-x-3">
               <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
               <h3 className="text-[10px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-widest">{sectionLabels.food}</h3>
            </header>
            <div className="bg-rose-50/40 dark:bg-rose-900/10 p-4 rounded-3xl border border-rose-100 dark:border-rose-900/20">
              <p className="text-[11px] text-rose-900 dark:text-rose-200 font-black leading-tight tracking-tight">🍽️ {slide.dining?.recommendation}</p>
              <p className="text-[9px] text-rose-700/60 dark:text-rose-500/60 font-bold mt-1.5 uppercase tracking-tighter">Backup: {slide.dining?.fallback}</p>
            </div>
          </div>
          <div className="space-y-4">
            <header className="flex items-center space-x-3">
               <div className="w-1 h-4 bg-slate-400 rounded-full"></div>
               <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{sectionLabels.info}</h3>
            </header>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50">
              <p className="text-[11px] text-slate-800 dark:text-slate-200 font-black leading-tight tracking-tight">🕒 {slide.practical?.hours}</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-500 font-bold mt-1.5 uppercase tracking-tighter">🎫 {slide.practical?.tickets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fluid Controls */}
      <footer className="px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-100/80 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
        <button 
          onClick={onPrev} 
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all disabled:opacity-0 active:scale-90"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <div className="flex space-x-2">
          {Array.from({length: Math.min(totalSlides, 8)}).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-brand-600' : 'w-1.5 bg-slate-200 dark:bg-slate-800'}`} />
          ))}
        </div>

        <button 
          onClick={onNext} 
          disabled={currentIndex === totalSlides - 1}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all disabled:opacity-0 active:scale-90"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
        </button>
      </footer>
    </div>
  );
};

export default PlanDisplay;