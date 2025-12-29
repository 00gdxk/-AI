
import React, { useState, useEffect } from 'react';
import { generateTravelPlan, generateLocationImage } from './services/geminiService';
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
    loading: ["場所をスカウト中...", "専門家に相談中...", "ルートをマッピング中...", "最高の景色を探しています...", "旅程を仕上げています..."]
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'itinerary' | 'gallery'>('itinerary');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => console.warn("Location access denied", err)
      );
    }
  }, []);

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);
    setTripData(null);
    setCurrentSlideIndex(0);
    setViewMode('itinerary');

    try {
      const result = await generateTravelPlan(destination, days, interests, lang, userLocation);
      if (result) {
        setTripData(result);
        generateImagesForSlides(result);
      } else {
        throw new Error("No plan was generated.");
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const generateImagesForSlides = async (data: TripData) => {
    data.slides.forEach(async (slide, index) => {
      if (slide.location) {
        await new Promise(resolve => setTimeout(resolve, index * 800));
        const imageUrl = await generateLocationImage(slide.location.name, slide.location.description);
        if (imageUrl) {
          setTripData(prev => {
            if (!prev) return null;
            const newSlides = [...prev.slides];
            if (!newSlides[index].imageUrl) {
              newSlides[index] = { ...newSlides[index], imageUrl };
            }
            return { ...prev, slides: newSlides };
          });
        }
      }
    });
  };

  const handleImageUpdate = (index: number, newImageUrl: string) => {
    setTripData(prev => {
      if (!prev) return null;
      const newSlides = [...prev.slides];
      newSlides[index] = { ...newSlides[index], imageUrl: newImageUrl };
      return { ...prev, slides: newSlides };
    });
  };

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % t.loading.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading, t.loading.length]);

  const isPresentationMode = !!tripData;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <header className={`bg-white border-b border-slate-200 shadow-sm transition-all duration-500 z-50 ${isPresentationMode ? 'h-16 flex items-center' : 'h-24 py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTripData(null)}>
             <div className="bg-indigo-600 rounded-lg p-1.5 shadow-md shadow-indigo-200">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <h1 className={`font-outfit font-bold text-slate-900 ${isPresentationMode ? 'text-xl' : 'text-2xl'}`}>
               {t.title}
             </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              {(['en', 'cn', 'jp'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {isPresentationMode && (
              <div className="flex items-center space-x-6">
                <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setViewMode('itinerary')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'itinerary' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.itinerary}</button>
                  <button onClick={() => setViewMode('gallery')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'gallery' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.gallery}</button>
                </nav>
                <button onClick={() => setTripData(null)} className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center group transition-colors">
                  <svg className="w-5 h-5 mr-1 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  {t.newTrip}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {!isPresentationMode && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="relative h-[360px] w-full">
               <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=2021" className="w-full h-full object-cover" alt="Travel" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 to-transparent" />
            </div>
            <div className="max-w-3xl mx-auto px-6 -mt-48 relative z-10 pb-20">
              <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white">
                <h2 className="text-4xl font-outfit font-bold text-slate-900 mb-2 text-center">{t.planTitle}</h2>
                <p className="text-slate-500 text-center mb-10">{t.tagline}</p>
                <form onSubmit={handlePlanSubmit} className="space-y-8">
                  <div className="group">
                    <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 px-1">{t.destination}</label>
                    <input type="text" placeholder={t.destPlaceholder} value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg shadow-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 px-1">{t.duration}: {days} {t.days}</label>
                    <input type="range" min="1" max="14" value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 px-1">{t.interests}</label>
                    <textarea placeholder={t.interestsPlaceholder} value={interests} onChange={(e) => setInterests(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all h-32 resize-none shadow-sm" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center text-lg">
                    {loading ? (
                      <span className="flex items-center space-x-3">
                        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>{t.loading[loadingMsgIdx]}</span>
                      </span>
                    ) : t.buttonCraft}
                  </button>
                </form>
                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center text-red-700 animate-fadeIn">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isPresentationMode && viewMode === 'itinerary' && tripData && (
          <div className="absolute inset-0 p-6 flex flex-col md:flex-row gap-6 animate-fadeIn">
            <div className="w-full md:w-1/3 lg:w-2/5 h-full z-20">
              <PlanDisplay 
                slide={tripData.slides[currentSlideIndex]} 
                currentIndex={currentSlideIndex} 
                totalSlides={tripData.slides.length} 
                onNext={() => setCurrentSlideIndex(prev => prev + 1)} 
                onPrev={() => setCurrentSlideIndex(prev => prev - 1)} 
                language={lang}
              />
            </div>
            <div className="w-full md:w-2/3 lg:w-3/5 h-full bg-white rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100">
              <div className="absolute top-6 right-6 z-[400] bg-white/80 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-lg border border-white">
                <h3 className="font-outfit font-bold text-slate-900 text-lg">{tripData.tripTitle}</h3>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{days} {t.days} in {destination}</p>
              </div>
              <TravelMap slides={tripData.slides} currentSlideIndex={currentSlideIndex} />
            </div>
          </div>
        )}

        {isPresentationMode && viewMode === 'gallery' && tripData && (
          <div className="absolute inset-0 z-30 animate-fadeIn">
            <TripGallery slides={tripData.slides} onNavigateToSlide={(idx) => { setCurrentSlideIndex(idx); setViewMode('itinerary'); }} onUpdateImage={handleImageUpdate} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
