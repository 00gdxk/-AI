
import React, { useState, useEffect, useCallback } from 'react';
import { generateTravelPlan, generateLocationImage, compressUploadedImage, translateTripData, findRealImageOnWeb } from './services/geminiService';
import { TripData } from './types';
import PlanDisplay from './components/PlanDisplay';
import TravelMap from './components/TravelMap';
import TripGallery from './components/TripGallery';

type Language = 'en' | 'cn' | 'jp';

const translations = {
  en: {
    title: "ZenithTravel AI",
    tagline: "Where would you like to explore next?",
    planTitle: "Plan Your Zenith",
    destination: "Destination",
    destPlaceholder: "e.g. Patagonia, Iceland, or Tokyo",
    duration: "Duration",
    days: "Days",
    interests: "Your Interests",
    interestsPlaceholder: "e.g. Hiking, photography, street food...",
    buttonCraft: "Craft Itinerary",
    itinerary: "Itinerary",
    gallery: "Gallery",
    newTrip: "New Trip",
    savePlan: "Save Plan",
    saving: "Saving...",
    planSaved: "Plan Saved",
    savedTrips: "Saved Journeys",
    noSaved: "Your future adventures will appear here.",
    enriching: "Finding real photos",
    visualizing: "AI visualizing",
    translating: "Localizing itinerary...",
    rateLimitWarning: "API rate limit reached. Pausing image generation for 15s...",
    loading: ["Scouting locations...", "Consulting local experts...", "Mapping your journey...", "Finding the best views...", "Perfecting your itinerary..."]
  },
  cn: {
    title: "ZenithTravel 智行",
    tagline: "您的下一次探索是在哪里？",
    planTitle: "开启您的巅峰之旅",
    destination: "目的地",
    destPlaceholder: "例如：巴塔哥尼亚、冰岛或东京",
    duration: "行程天数",
    days: "天",
    interests: "您的兴趣",
    interestsPlaceholder: "例如：徒步、摄影、当地美食...",
    buttonCraft: "生成行程",
    itinerary: "行程安排",
    gallery: "图库",
    newTrip: "新行程",
    savePlan: "保存行程",
    saving: "正在保存...",
    planSaved: "已保存",
    savedTrips: "已保存的旅程",
    noSaved: "您未来的冒险将出现在这里。",
    enriching: "搜寻实景照片",
    visualizing: "AI 视觉渲染",
    translating: "正在翻译行程...",
    rateLimitWarning: "触发频率限制。图片生成暂停 15 秒...",
    loading: ["正在寻找地点...", "咨询当地专家...", "规划您的旅程...", "寻找最佳景观...", "正在完善行程..."]
  },
  jp: {
    title: "ZenithTravel AI",
    tagline: "次はどこを探索したいですか？",
    planTitle: "究極の旅を計画する",
    destination: "目的地",
    destPlaceholder: "例：パタゴニア、アイスランド、東京",
    duration: "期間",
    days: "日間",
    interests: "興味・関心",
    interestsPlaceholder: "例：ハイキング、写真、グルメ...",
    buttonCraft: "旅程を作成",
    itinerary: "旅程",
    gallery: "ギャラリー",
    newTrip: "新しい旅",
    savePlan: "プランを保存",
    saving: "保存中...",
    planSaved: "保存済み",
    savedTrips: "保存済みの旅",
    noSaved: "将来の冒険がここに表示されます。",
    enriching: "実景写真を検索中",
    visualizing: "AIビジュアル生成中",
    translating: "旅程を翻訳中...",
    rateLimitWarning: "制限に達しました。画像生成を15秒間停止します...",
    loading: ["場所をスカウト中...", "専門家に相談中...", "ルートをマッピング中...", "最高の景色を探しています...", "旅程を仕上げています..."]
  }
};

const STORAGE_KEY = 'zenith_travel_saved_trips';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState({ current: 0, total: 0 });
  const [imagePhase, setImagePhase] = useState<'searching' | 'generating'>('searching');
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const [tripCache, setTripCache] = useState<Partial<Record<Language, TripData>>>({});
  const [savedTrips, setSavedTrips] = useState<TripData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'itinerary' | 'gallery'>('itinerary');

  const tripData = tripCache[lang] || null;
  const isCurrentTripSaved = !!tripData && savedTrips.some(trip => trip.id === tripData.id);

  const detectLanguage = (text: string): Language | null => {
    if (!text || text.length < 1) return null;
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'jp';
    if (/[\u4E00-\u9FA5]/.test(text)) return 'cn';
    if (/[a-zA-Z]/.test(text)) return 'en';
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, setter: (val: string) => void) => {
    const value = e.target.value;
    setter(value);
    const detected = detectLanguage(value);
    if (detected && detected !== lang) {
      setLang(detected);
    }
  };

  const saveTripsToLocalStorage = useCallback((trips: TripData[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      return trips;
    } catch (e) {
      console.warn("Storage quota full, keeping current state only.");
      return trips;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedTrips(JSON.parse(stored));
      } catch (e) { console.error(e); }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn(err)
      );
    }
  }, []);

  const prefetchOtherLanguages = async (baseTrip: TripData, baseLang: Language) => {
    const others = (['en', 'cn', 'jp'] as Language[]).filter(l => l !== baseLang);
    for (const targetLang of others) {
      try {
        const translated = await translateTripData(baseTrip, targetLang);
        if (translated) {
          setTripCache(prev => ({ ...prev, [targetLang]: translated }));
        }
      } catch (err) { console.error(err); }
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);
    setTripCache({});
    setCurrentSlideIndex(0);
    setViewMode('itinerary');
    setImageGenProgress({ current: 0, total: 0 });
    setIsRateLimited(false);

    try {
      const result = await generateTravelPlan(destination, days, interests, lang, userLocation);
      if (result) {
        const base: TripData = { ...result, id: crypto.randomUUID(), timestamp: Date.now(), destination, days };
        setTripCache({ [lang]: base });
        populateImages(base);
        prefetchOtherLanguages(base, lang);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSwitch = async (newLang: Language) => {
    if (newLang === lang) return;
    if (tripCache[newLang]) {
      setLang(newLang);
      return;
    }
    if (tripData) {
      setLoading(true);
      try {
        const translated = await translateTripData(tripData, newLang);
        if (translated) {
          setTripCache(prev => ({ ...prev, [newLang]: translated }));
          setLang(newLang);
        } else {
          setLang(newLang);
        }
      } catch (err) { 
        console.error(err);
        setLang(newLang);
      }
      finally { setLoading(false); }
    } else {
      setLang(newLang);
    }
  };

  const populateImages = async (data: TripData) => {
    const total = data.slides.length;
    setImageGenProgress({ current: 0, total });
    
    // Phase 1: Try finding real images
    setImagePhase('searching');
    for (let i = 0; i < total; i++) {
      const slide = data.slides[i];
      if (slide.location) {
        const realImg = await findRealImageOnWeb(slide.location.name);
        if (realImg) {
          updateAllCaches(i, realImg.url, realImg.source, realImg.sourceTitle);
        }
      }
      setImageGenProgress(prev => ({ ...prev, current: i + 1 }));
    }

    // Phase 2: Fallback to generation for missing images
    setImagePhase('generating');
    setImageGenProgress({ current: 0, total });
    for (let i = 0; i < total; i++) {
      const slide = data.slides[i];
      // We check if it's still missing (wasn't found in Phase 1)
      if (!data.slides[i].imageUrl && slide.location) {
        try {
          setIsRateLimited(false);
          if (i > 0) await new Promise(r => setTimeout(r, 1500));
          const img = await generateLocationImage(slide.location.name, slide.location.description);
          if (img) {
            updateAllCaches(i, img);
          }
          setImageGenProgress(prev => ({ ...prev, current: i + 1 }));
        } catch (err: any) {
          if (err.message === 'RATE_LIMIT') {
            setIsRateLimited(true);
            await new Promise(r => setTimeout(r, 15000));
            i--; 
            continue;
          }
        }
      } else {
        setImageGenProgress(prev => ({ ...prev, current: i + 1 }));
      }
    }
    setIsRateLimited(false);
  };

  const updateAllCaches = (index: number, url: string, source?: string, sourceTitle?: string) => {
    setTripCache(prev => {
      const next = { ...prev };
      (Object.keys(next) as Language[]).forEach(l => {
        if (next[l] && next[l]!.slides[index]) {
          next[l]!.slides[index].imageUrl = url;
          next[l]!.slides[index].imageSource = source;
          next[l]!.slides[index].imageSourceTitle = sourceTitle;
        }
      });
      return next;
    });
  };

  const handleSaveTrip = async () => {
    if (!tripData || isSaving) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const newList = [tripData, ...savedTrips.filter(t => t.id !== tripData.id)].slice(0, 6);
    setSavedTrips(saveTripsToLocalStorage(newList));
    setIsSaving(false);
  };

  const deleteSavedTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newList = savedTrips.filter(t => t.id !== id);
    setSavedTrips(saveTripsToLocalStorage(newList));
  };

  const loadSavedTrip = (trip: TripData) => {
    setTripCache({ [lang]: trip });
    setCurrentSlideIndex(0);
    setViewMode('itinerary');
    prefetchOtherLanguages(trip, lang);
  };

  const handleImageUpdate = (index: number, newImageUrl: string) => {
    compressUploadedImage(newImageUrl).then(compressed => {
      updateAllCaches(index, compressed);
    });
  };

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(p => (p + 1) % t.loading.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loading, t.loading.length]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <header className={`bg-white border-b border-slate-200 shadow-sm transition-all duration-500 z-50 ${tripData ? 'h-16 flex items-center' : 'h-24 py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTripCache({})}>
             <div className="bg-indigo-600 rounded-lg p-1.5 shadow-md shadow-indigo-200">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <div className="flex flex-col">
               <h1 className={`font-outfit font-bold text-slate-900 leading-none ${tripData ? 'text-xl' : 'text-2xl'}`}>{t.title}</h1>
               {imageGenProgress.total > 0 && imageGenProgress.current < imageGenProgress.total && (
                 <span className="text-[10px] font-bold text-indigo-400 uppercase mt-1 animate-pulse">
                   {isRateLimited ? t.rateLimitWarning : `${imagePhase === 'searching' ? t.enriching : t.visualizing} (${imageGenProgress.current}/${imageGenProgress.total})`}
                 </span>
               )}
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              {(['en', 'cn', 'jp'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageSwitch(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {tripData && (
              <div className="flex items-center space-x-4">
                <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setViewMode('itinerary')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'itinerary' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.itinerary}</button>
                  <button onClick={() => setViewMode('gallery')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'gallery' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.gallery}</button>
                </nav>
                <button 
                  onClick={handleSaveTrip} 
                  disabled={isCurrentTripSaved || isSaving}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all ${isCurrentTripSaved ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70'}`}
                >
                  {isSaving ? t.saving : isCurrentTripSaved ? t.planSaved : t.savePlan}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {!tripData && !loading && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="relative h-[420px] w-full">
               <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=2021" className="w-full h-full object-cover" alt="Travel" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 to-transparent" />
            </div>
            <div className="max-w-6xl mx-auto px-6 -mt-64 relative z-10 pb-20 flex flex-col lg:flex-row gap-8">
              <div className="lg:w-1/2">
                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white">
                  <h2 className="text-4xl font-outfit font-bold text-slate-900 mb-2">{t.planTitle}</h2>
                  <p className="text-slate-500 mb-8">{t.tagline}</p>
                  <form onSubmit={handlePlanSubmit} className="space-y-6">
                    <div className="group">
                      <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">{t.destination}</label>
                      <input type="text" placeholder={t.destPlaceholder} value={destination} onChange={(e) => handleInputChange(e, setDestination)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg shadow-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">{t.duration}: {days} {t.days}</label>
                      <input type="range" min="1" max="14" value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">{t.interests}</label>
                      <textarea placeholder={t.interestsPlaceholder} value={interests} onChange={(e) => handleInputChange(e, setInterests)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all h-28 resize-none shadow-sm" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center text-lg">
                      {t.buttonCraft}
                    </button>
                  </form>
                  {error && <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">{error}</div>}
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/50 flex-1 min-h-[400px]">
                  <h3 className="text-2xl font-outfit font-bold text-slate-800 mb-6">{t.savedTrips}</h3>
                  {savedTrips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <p className="text-center font-medium">{t.noSaved}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedTrips.map((trip) => (
                        <div key={trip.id} onClick={() => loadSavedTrip(trip)} className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer relative">
                          <button onClick={(e) => deleteSavedTrip(trip.id, e)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          <h4 className="font-outfit font-bold text-slate-900 line-clamp-1">{trip.tripTitle}</h4>
                          <p className="text-xs text-slate-500 mt-1">{trip.days} {t.days} · {new Date(trip.timestamp).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-[500] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-10">
            <svg className="animate-spin h-12 w-12 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <h3 className="text-xl font-outfit font-bold text-slate-900 mb-2">{tripData ? t.translating : t.loading[loadingMsgIdx]}</h3>
          </div>
        )}

        {tripData && viewMode === 'itinerary' && (
          <div className="absolute inset-0 p-6 flex flex-col md:flex-row gap-6 animate-fadeIn">
            <div className="w-full md:w-1/3 lg:w-2/5 h-full z-20">
              <PlanDisplay slide={tripData.slides[currentSlideIndex]} currentIndex={currentSlideIndex} totalSlides={tripData.slides.length} onNext={() => setCurrentSlideIndex(p => p + 1)} onPrev={() => setCurrentSlideIndex(p => p - 1)} language={lang} />
            </div>
            <div className="w-full md:w-2/3 lg:w-3/5 h-full bg-white rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100">
              <div className="absolute top-6 right-6 z-[400] bg-white/80 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-lg border border-white">
                <h3 className="font-outfit font-bold text-slate-900 text-lg">{tripData.tripTitle}</h3>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{tripData.days} {t.days} in {tripData.destination}</p>
              </div>
              <TravelMap key={tripData.id + lang} slides={tripData.slides} currentSlideIndex={currentSlideIndex} onMarkerClick={(idx) => setCurrentSlideIndex(idx)} />
            </div>
          </div>
        )}

        {tripData && viewMode === 'gallery' && (
          <div className="absolute inset-0 z-30 animate-fadeIn overflow-y-auto custom-scrollbar">
            <TripGallery slides={tripData.slides} onNavigateToSlide={(idx) => { setCurrentSlideIndex(idx); setViewMode('itinerary'); }} onUpdateImage={handleImageUpdate} imageGenProgress={imageGenProgress} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
