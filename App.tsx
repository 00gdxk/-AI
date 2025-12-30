
import React, { useState, useEffect, useCallback } from 'react';
import { generateTravelPlan, generateLocationImage, compressUploadedImage, translateTripData, findRealImageOnWeb } from './services/geminiService';
import { TripData } from './types';
import PlanDisplay from './components/PlanDisplay';
import TravelMap from './components/TravelMap';
import TripGallery from './components/TripGallery';

type Language = 'en' | 'cn' | 'jp';

const translations = {
  en: {
    title: "ZenithTravel",
    tagline: "Intelligent travel design for the modern explorer",
    planTitle: "Design Your Escape",
    destination: "Destination",
    destPlaceholder: "Where's your heart leading?",
    duration: "Pace",
    days: "Days",
    interests: "Passions",
    interestsPlaceholder: "Hidden cafés, brutalist architecture, street food...",
    buttonCraft: "Curate Itinerary",
    itinerary: "Explorer",
    gallery: "Gallery",
    newTrip: "New Plan",
    savePlan: "Capture",
    saving: "Syncing...",
    planSaved: "Captured",
    savedTrips: "Collection",
    noSaved: "Your future adventures will appear here.",
    enriching: "Gathering visuals...",
    visualizing: "Rendering scenes...",
    translating: "Localizing details...",
    rateLimitWarning: "Sync Cooling Down...",
    loading: ["Mapping routes...", "Scouting horizons...", "Consulting local guides...", "Perfecting views..."]
  },
  cn: {
    title: "ZenithTravel 智行",
    tagline: "以前瞻智能，绘世界之境",
    planTitle: "定制您的旷野",
    destination: "目的地",
    destPlaceholder: "灵感此刻飘向何方？",
    duration: "行程步调",
    days: "天",
    interests: "您的喜好",
    interestsPlaceholder: "隐世咖啡, 极简建筑, 地道食肆...",
    buttonCraft: "生成行程",
    itinerary: "行程助手",
    gallery: "视觉图库",
    newTrip: "新行程",
    savePlan: "收藏",
    saving: "同步中...",
    planSaved: "已收藏",
    savedTrips: "我的合集",
    noSaved: "收藏的旅途将出现在这里。",
    enriching: "正在搜集视觉素材...",
    visualizing: "正在进行AI渲染...",
    translating: "正在翻译行程详情...",
    rateLimitWarning: "API 正在冷却中...",
    loading: ["正在规划线路...", "正在搜寻地道体验...", "咨询当地专家中...", "寻找最佳景观..."]
  },
  jp: {
    title: "ZenithTravel",
    tagline: "知性のレンズを通して世界を再定義する",
    planTitle: "旅をデザインする",
    destination: "目的地",
    destPlaceholder: "心はどこへ向かっていますか？",
    duration: "ペース",
    days: "日間",
    interests: "こだわり",
    interestsPlaceholder: "隠れ家カフェ, 建築, ローカルフード...",
    buttonCraft: "プランを作成",
    itinerary: "プランナー",
    gallery: "ギャラリー",
    newTrip: "新規作成",
    savePlan: "保存",
    saving: "保存中...",
    planSaved: "保存済み",
    savedTrips: "マイコレクション",
    noSaved: "保存された冒険がここに表示されます。",
    enriching: "ビジュアル取得中...",
    visualizing: "AI描画中...",
    translating: "翻訳・ローカライズ中...",
    rateLimitWarning: "API冷却中...",
    loading: ["ルートをマッピング中...", "秘密のスポットを探索中...", "ガイドをコンサル中...", "絶景を選別中..."]
  }
};

const STORAGE_KEY = 'zenith_travel_saved_trips';
const THEME_KEY = 'zenith_travel_dark_mode';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const t = translations[lang];

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(4);
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, String(darkMode));
  }, [darkMode]);

  const detectLanguage = (text: string): Language | null => {
    if (!text) return null;
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'jp';
    if (/[\u4E00-\u9FA5]/.test(text)) return 'cn';
    if (/[a-zA-Z]/.test(text)) return 'en';
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, setter: (val: string) => void) => {
    const value = e.target.value;
    setter(value);
    const detected = detectLanguage(value);
    if (detected && detected !== lang) setLang(detected);
  };

  const saveTripsToLocalStorage = useCallback((trips: TripData[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      return trips;
    } catch (e) {
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

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);
    setTripCache({});
    setCurrentSlideIndex(0);
    setViewMode('itinerary');
    setImageGenProgress({ current: 0, total: 0 });

    try {
      const result = await generateTravelPlan(destination, days, interests, lang, userLocation);
      if (result) {
        const base: TripData = { ...result, id: crypto.randomUUID(), timestamp: Date.now(), destination, days };
        setTripCache({ [lang]: base });
        populateImages(base);
      }
    } catch (err: any) {
      setError(err.message || 'Error crafting plan');
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
        setLang(newLang);
      } finally { setLoading(false); }
    } else {
      setLang(newLang);
    }
  };

  const populateImages = async (data: TripData) => {
    const total = data.slides.length;
    setImageGenProgress({ current: 0, total });
    setImagePhase('searching');
    const results: (string | null)[] = new Array(total).fill(null);

    for (let i = 0; i < total; i++) {
      const slide = data.slides[i];
      if (slide.location) {
        const realImg = await findRealImageOnWeb(slide.location.name);
        if (realImg) {
          results[i] = realImg.url;
          updateAllCaches(i, realImg.url, realImg.source, realImg.sourceTitle);
        }
      }
      setImageGenProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setImagePhase('generating');
    setImageGenProgress({ current: 0, total });
    for (let i = 0; i < total; i++) {
      if (!results[i] && data.slides[i].location) {
        try {
          setIsRateLimited(false);
          const img = await generateLocationImage(data.slides[i].location!.name, data.slides[i].location!.description);
          if (img) updateAllCaches(i, img);
          setImageGenProgress(prev => ({ ...prev, current: i + 1 }));
        } catch (err: any) {
          if (err.message?.includes('429')) {
            setIsRateLimited(true);
            await new Promise(r => setTimeout(r, 12000));
            i--; continue;
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

  // Fix: Added handleImageUpdate to handle user-uploaded image updates and compression
  const handleImageUpdate = async (index: number, newImageUrl: string) => {
    const compressed = await compressUploadedImage(newImageUrl);
    updateAllCaches(index, compressed, undefined, 'User Uploaded');
  };

  const handleSaveTrip = async () => {
    if (!tripData || isSaving) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const newList = [tripData, ...savedTrips.filter(t => t.id !== tripData.id)].slice(0, 15);
    setSavedTrips(saveTripsToLocalStorage(newList));
    setIsSaving(false);
  };

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => setLoadingMsgIdx(p => (p + 1) % t.loading.length), 2200);
      return () => clearInterval(interval);
    }
  }, [loading, t.loading.length]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-700 select-none">
      {/* Dynamic Header */}
      <header className="h-16 flex-shrink-0 flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 z-50">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3.5 cursor-pointer group" onClick={() => setTripCache({})}>
            <div className="w-9 h-9 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200/50 dark:shadow-none transition-all group-hover:rotate-6 group-active:scale-95">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="font-outfit font-bold text-slate-900 dark:text-slate-50 text-xl tracking-tight leading-none">{t.title}</h1>
              {imageGenProgress.total > 0 && imageGenProgress.current < imageGenProgress.total && (
                <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mt-0.5 animate-pulse">
                  {isRateLimited ? t.rateLimitWarning : `${imagePhase === 'searching' ? t.enriching : t.visualizing} ${imageGenProgress.current}/${imageGenProgress.total}`}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              {(['en', 'cn', 'jp'] as Language[]).map(l => (
                <button key={l} onClick={() => handleLanguageSwitch(l)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${lang === l ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              {darkMode ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {tripData && (
              <div className="flex items-center space-x-3 ml-3 border-l border-slate-200/60 dark:border-slate-800/60 pl-3">
                <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <button onClick={() => setViewMode('itinerary')} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewMode === 'itinerary' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t.itinerary}</button>
                  <button onClick={() => setViewMode('gallery')} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewMode === 'gallery' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t.gallery}</button>
                </div>
                <button onClick={handleSaveTrip} disabled={isCurrentTripSaved || isSaving} className={`px-5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all active:scale-95 ${isCurrentTripSaved ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20 dark:shadow-none disabled:opacity-50'}`}>
                  {isSaving ? t.saving : isCurrentTripSaved ? t.planSaved : t.savePlan}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {/* Landing Page */}
        {!tripData && !loading && (
          <div className="h-full flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-2xl w-full text-center space-y-4 mb-14 animate-fadeIn">
              <h2 className="text-6xl font-outfit font-bold text-slate-900 dark:text-slate-50 tracking-tighter leading-tight drop-shadow-sm">{t.planTitle}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xl max-w-lg mx-auto leading-relaxed">{t.tagline}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full max-w-7xl items-start animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              {/* Main Planning Hub */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-10 lg:p-14 border border-slate-100 dark:border-slate-800/80">
                <form onSubmit={handlePlanSubmit} className="space-y-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-widest ml-1">{t.destination}</label>
                    <input type="text" placeholder={t.destPlaceholder} value={destination} onChange={e => handleInputChange(e, setDestination)} className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-3xl px-8 py-5 text-slate-900 dark:text-slate-50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-2xl font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600" required />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex justify-between items-end px-1">
                        <label className="text-[11px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-widest">{t.duration}</label>
                        <span className="text-2xl font-outfit font-bold text-slate-800 dark:text-slate-200">{days} {t.days}</span>
                      </div>
                      <input type="range" min="1" max="14" value={days} onChange={e => setDays(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-brand-600" />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-widest ml-1">{t.interests}</label>
                      <input type="text" placeholder={t.interestsPlaceholder} value={interests} onChange={e => handleInputChange(e, setInterests)} className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-3xl px-8 py-4.5 text-slate-900 dark:text-slate-50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-brand-500/25 dark:shadow-none transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center text-xl space-x-3">
                    <span>{t.buttonCraft}</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </form>
                {error && <div className="mt-8 p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-3xl text-red-700 dark:text-red-400 text-sm font-bold animate-fadeIn">{error}</div>}
              </div>

              {/* Collections Sidebar */}
              <div className="lg:col-span-5 bg-slate-100/30 dark:bg-slate-900/20 rounded-[3rem] p-10 border border-slate-200/60 dark:border-slate-800/40 flex flex-col min-h-[460px]">
                <h3 className="text-xl font-outfit font-bold text-slate-900 dark:text-slate-50 mb-8 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  </div>
                  <span>{t.savedTrips}</span>
                </h3>
                {savedTrips.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400/80 text-center px-6 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center">
                       <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                    </div>
                    <p className="text-sm font-medium tracking-tight">{t.noSaved}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    {savedTrips.map(trip => (
                      <div key={trip.id} onClick={() => { setTripCache({ [lang]: trip }); setCurrentSlideIndex(0); setViewMode('itinerary'); }} className="group bg-white dark:bg-slate-800 hover:shadow-lg hover:shadow-brand-100/10 dark:hover:shadow-none hover:-translate-y-0.5 p-5 rounded-3xl border border-slate-100/80 dark:border-slate-700/40 transition-all cursor-pointer flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-slate-50 line-clamp-1 text-base tracking-tight">{trip.tripTitle}</h4>
                          <p className="text-[10px] text-slate-500 font-black uppercase mt-1.5 tracking-widest flex items-center space-x-2">
                             <span className="text-brand-600 dark:text-brand-500">{trip.days} {t.days}</span>
                             <span className="opacity-20">•</span>
                             <span className="truncate">{trip.destination}</span>
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-700/40 text-slate-300 dark:text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Loading View */}
        {loading && (
          <div className="absolute inset-0 z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl flex flex-col items-center justify-center p-12 animate-fadeIn">
            <div className="relative w-32 h-32 mb-10">
              <div className="absolute inset-0 rounded-[2.5rem] border-4 border-slate-100 dark:border-slate-800/50"></div>
              <div className="absolute inset-0 rounded-[2.5rem] border-4 border-t-brand-600 animate-spin" style={{ animationDuration: '0.8s' }}></div>
              <div className="absolute inset-4 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800/50"></div>
              <div className="absolute inset-4 rounded-[1.5rem] border-2 border-b-brand-400 animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-3xl font-outfit font-bold text-slate-900 dark:text-slate-50 tracking-tighter">{t.loading[loadingMsgIdx]}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg italic opacity-80">{tripData ? t.translating : "Drafting your ultimate experience..."}</p>
            </div>
          </div>
        )}

        {/* Core Application View */}
        {tripData && viewMode === 'itinerary' && (
          <div className="h-full p-4 lg:p-6 flex flex-col lg:flex-row gap-6 animate-fadeIn">
            {/* Left Column: Itinerary Details */}
            <div className="w-full lg:w-96 xl:w-[440px] h-full flex flex-col">
              <PlanDisplay slide={tripData.slides[currentSlideIndex]} currentIndex={currentSlideIndex} totalSlides={tripData.slides.length} onNext={() => setCurrentSlideIndex(p => p + 1)} onPrev={() => setCurrentSlideIndex(p => p - 1)} language={lang} />
            </div>
            
            {/* Right Column: Map Visualization */}
            <div className="flex-1 rounded-[3rem] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
               {/* Map Status Bar */}
               <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
                 <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/60 dark:border-slate-700/60 shadow-xl pointer-events-auto flex flex-col">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-none">{tripData.tripTitle}</h3>
                    <div className="flex items-center mt-2 space-x-3">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{tripData.destination}</span>
                      </div>
                      <span className="text-[10px] text-slate-300 dark:text-slate-700 font-bold">•</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{tripData.days} {t.days} Journey</span>
                    </div>
                 </div>
               </div>
               
               <TravelMap slides={tripData.slides} currentSlideIndex={currentSlideIndex} onMarkerClick={setCurrentSlideIndex} darkMode={darkMode} />
            </div>
          </div>
        )}

        {/* Gallery Mode */}
        {tripData && viewMode === 'gallery' && (
          <div className="absolute inset-0 z-10 animate-fadeIn overflow-y-auto custom-scrollbar">
            <TripGallery slides={tripData.slides} onNavigateToSlide={idx => { setCurrentSlideIndex(idx); setViewMode('itinerary'); }} onUpdateImage={handleImageUpdate} imageGenProgress={imageGenProgress} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
