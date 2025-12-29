
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
    en: { log: "Logistics", exp: "Experience", food: "Refuel", info: "Practical", day: "Day" },
    cn: { log: "动线安排", exp: "深度游玩", food: "餐饮补给", info: "出行备忘", day: "第" },
    jp: { log: "移動・物流", exp: "体験・観光", food: "食事・休憩", info: "実用情報", day: "日目" }
  }[language as 'en'|'cn'|'jp'] || { log: "Logistics", exp: "Experience", food: "Refuel", info: "Practical", day: "Day" };

  const dayLabel = language === 'cn' ? `${sectionLabels.day}${slide.dayNumber}天` : 
                   language === 'jp' ? `${slide.dayNumber}${sectionLabels.day}` : 
                   `${sectionLabels.day} ${slide.dayNumber}`;

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative">
      {/* Slide Header */}
      <div className="relative bg-indigo-600 p-6 text-white overflow-hidden min-h-[140px] flex flex-col justify-end">
        {slide.imageUrl && (
          <>
            <img 
              src={slide.imageUrl} 
              alt={slide.title} 
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply transition-opacity duration-700 ease-in-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        )}
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-1">
            <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase text-white border border-white/20">
              {dayLabel}
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-90 text-indigo-100">
              {currentIndex + 1} / {totalSlides}
            </span>
          </div>
          <h2 className="text-2xl font-outfit font-bold leading-tight drop-shadow-md">{slide.title}</h2>
          {slide.logistics?.timeSlot && (
            <div className="flex items-center text-xs mt-1 text-indigo-100 font-medium">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {slide.logistics.timeSlot}
            </div>
          )}
        </div>
      </div>

      {/* Slide Content */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-slate-50 space-y-4">
        
        {/* Pillar 1: Logistics */}
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            {sectionLabels.log}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Transport</p>
              <p className="text-slate-700 font-medium leading-tight">{slide.logistics?.transport || "Walkable"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Directions</p>
              <p className="text-slate-700 font-medium leading-tight">{slide.logistics?.directions || "Follow map"}</p>
            </div>
          </div>
          {slide.logistics?.address && (
            <div className="mt-3 pt-3 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
              <p className="text-indigo-600 font-medium text-xs break-words">{slide.logistics.address}</p>
            </div>
          )}
        </section>

        {/* Pillar 2: Experience */}
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
            {sectionLabels.exp}
          </h3>
          <ul className="space-y-2 mb-3">
            {slide.experience?.mustDos.map((item, i) => (
              <li key={i} className="flex items-center text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
                {item}
              </li>
            ))}
          </ul>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center mb-1">
              <span className="mr-1">💡</span> {language === 'cn' ? '你知道吗？' : (language === 'jp' ? 'ご存知ですか？' : 'Did you know?')}
            </p>
            <p className="text-xs text-amber-900 italic leading-relaxed">{slide.experience?.funFact}</p>
          </div>
          {slide.experience?.photoSpots && (
            <div className="mt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Best Shot</p>
              <p className="text-xs text-slate-600">📸 {slide.experience.photoSpots}</p>
            </div>
          )}
        </section>

        {/* Pillar 3: Dining */}
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {sectionLabels.food}
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Best Pick</p>
              <p className="text-slate-700 font-medium">🍽️ {slide.dining?.recommendation}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Fallback</p>
                <p className="text-xs text-slate-600">{slide.dining?.fallback}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Rest Point</p>
                <p className="text-xs text-slate-600">☕ {slide.dining?.restArea}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pillar 4: Practical */}
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {sectionLabels.info}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tickets</p>
              <p className="text-slate-700">{slide.practical?.tickets}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Hours</p>
              <p className="text-slate-700">{slide.practical?.hours}</p>
            </div>
            <div className="col-span-2 bg-slate-100 p-2 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Pro Tip</p>
              <p className="text-slate-700 text-[11px] leading-tight">{slide.practical?.tips}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Plan B (Weather/Crowds)</p>
              <p className="text-slate-600 italic">☔ {slide.practical?.planB}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Controls */}
      <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-sm">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex items-center px-4 py-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          {language === 'cn' ? '上一个' : (language === 'jp' ? '戻る' : 'Prev')}
        </button>
        <button
          onClick={onNext}
          disabled={currentIndex === totalSlides - 1}
          className="flex items-center px-4 py-1 text-indigo-600 font-bold hover:text-indigo-800 disabled:opacity-30 transition-colors"
        >
          {language === 'cn' ? '下一个' : (language === 'jp' ? '次へ' : 'Next')}
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default PlanDisplay;
