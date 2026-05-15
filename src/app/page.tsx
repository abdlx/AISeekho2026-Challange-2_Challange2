'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Home, Search, Clock, User, Send, MapPin, CheckCircle2, Activity, ChevronLeft, ReceiptText, BellRing, Navigation2, LogIn, LogOut, Package } from 'lucide-react';
import OrchestratorMap from './components/OrchestratorMap';
import { createClient } from '@/lib/supabase';
import { signInWithGoogle, signOut } from './actions/auth';

export default function MobileHome() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [userLocation, setUserLocation] = useState("33.6844, 73.0479");
  const [bookingStatus, setBookingStatus] = useState<string>('Confirmed');
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'orders') {
      fetchHistory();
    }
  }, [user, activeTab]);

  const fetchHistory = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('service_bookings')
      .select('*, service_providers(name)')
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
      });
    }
  }, []);

  useEffect(() => {
    if (result && result.bookingDetails) {
      setBookingStatus('Confirmed');
      const t1 = setTimeout(() => setBookingStatus('Provider En Route'), 3000);
      const t2 = setTimeout(() => setBookingStatus('Service Completed'), 6000);
      const t3 = setTimeout(() => setBookingStatus('Follow-up Reminder Sent'), 9000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [result]);

  const handleRunAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          userInput: userInput,
          userLocation: userLocation
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to run agent');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const mapProviders = result?.providers || [];
  const showNav = !!result && !loading;
  const showInput = !result && !loading;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background font-sans text-foreground selection:bg-accent/30">
      {/* Background Image & Blur */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: 'url("/bg-mountains.png")' }}
      />
      <div className="absolute inset-0 z-0 bg-stone-950/40 backdrop-blur-[2px] transition-all duration-700" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 pt-12">
        <div className="flex items-center gap-3">
          {result && (
            <button onClick={() => { setResult(null); setUserInput(''); }} className="p-2 -ml-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 transition-all active:scale-95">
              <ChevronLeft size={20} className="text-foreground" />
            </button>
          )}
          <h1 className="text-xl font-serif tracking-tight text-foreground/90">
            {result ? 'Booking Details' : 'Antigravity'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button onClick={() => signOut()} className="p-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 transition-all active:scale-95 shadow-2xl group relative">
              {user.user_metadata.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-5 h-5 rounded-full" alt="profile" />
              ) : (
                <User size={20} className="text-foreground/80" />
              )}
            </button>
          ) : (
            <button onClick={() => signInWithGoogle()} className="px-4 py-2 rounded-full bg-accent text-stone-950 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-xl">
              <LogIn size={14} /> Login
            </button>
          )}
          <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 transition-all active:scale-95 shadow-2xl">
            <Menu size={20} className="text-foreground/80" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col h-full pt-32 pb-40 px-6 overflow-y-auto custom-scrollbar">

        {/* Orders History Tab */}
        <AnimatePresence>
          {activeTab === 'orders' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col space-y-4 pb-20"
            >
              <h2 className="text-3xl font-serif text-foreground mb-4">Past Orders</h2>
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-5 rounded-3xl shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-2xl">
                      <Package size={24} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-stone-200 font-medium">{item.service_providers?.name || 'Technician'}</p>
                      <p className="text-xs text-stone-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-accent font-bold">PKR {item.total_cost_pkr}</p>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400">{item.status}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-stone-500">
                  <Clock size={40} className="mx-auto mb-4 opacity-20" />
                  <p>No past orders found.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Home Tab */}
        <AnimatePresence>
          {activeTab === 'home' && (
            <div className="flex-1 flex flex-col">
              {/* Initial Clean State */}
              <AnimatePresence>
                {!loading && !result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(15px)' }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="flex-1 flex flex-col justify-center pb-8"
                  >
                    <div className="flex-1 flex flex-col justify-center pb-20 text-center items-center">
                      <p className="font-serif text-foreground/80 text-lg mb-2 tracking-widest uppercase">
                        Hello, {user?.user_metadata.full_name?.split(' ')[0] || 'human'}
                      </p>
                      <h2 className="text-5xl sm:text-7xl font-light leading-tight mb-2 text-foreground tracking-tighter">
                        What do you <br />
                        <span className="font-serif italic font-normal text-accent">need today?</span>
                      </h2>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading State */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center space-y-8"
                  >
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-[3px] border-accent/10 rounded-full"></div>
                      <div className="absolute inset-0 border-[3px] border-accent rounded-full border-t-transparent animate-spin-slow"></div>
                      <div className="absolute inset-4 border border-accent/20 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-accent/80 animate-pulse font-serif italic text-lg tracking-wider">Orchestrating logistics...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result Screen */}
              <AnimatePresence>
                {result && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="flex flex-col space-y-6 pb-20"
                  >
                    {/* ... rest of result UI ... */}
                    {/* Map Card */}
                    <div className="w-full h-[320px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-stone-900/50 backdrop-blur-xl">
                      <OrchestratorMap
                        warehouseLocation={result.targetLocation || userLocation}
                        suppliers={mapProviders}
                        selectedSupplierId={null}
                      />
                      <div className="absolute bottom-4 left-4 right-4 bg-stone-950/90 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl transition-all duration-500">
                        <div className={`p-2.5 rounded-full border ${bookingStatus === 'Confirmed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : bookingStatus === 'Provider En Route' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                          {bookingStatus === 'Confirmed' ? <CheckCircle2 size={18} /> : bookingStatus === 'Provider En Route' ? <Navigation2 size={18} /> : bookingStatus === 'Follow-up Reminder Sent' ? <BellRing size={18} /> : <CheckCircle2 size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold transition-all duration-500">Status Tracker</p>
                          <p className={`text-sm font-medium transition-all duration-500 ${bookingStatus === 'Confirmed' ? 'text-blue-400/90' : bookingStatus === 'Provider En Route' ? 'text-amber-400/90' : 'text-emerald-400/90'}`}>{bookingStatus}</p>
                        </div>
                      </div>
                    </div>

                    {/* Booking Receipt Card */}
                    {result.bookingDetails && (
                      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <ReceiptText size={80} />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4 flex items-center gap-2">
                          <ReceiptText size={14} /> Booking Confirmed
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-stone-500 text-xs mb-1">Confirmation Code</p>
                            <p className="text-stone-200 font-mono">{result.bookingDetails.confirmationCode}</p>
                          </div>
                          <div>
                            <p className="text-stone-500 text-xs mb-1">Provider</p>
                            <p className="text-stone-200">{result.bookingDetails.provider}</p>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-white/5">
                            <p className="text-stone-500 text-xs mb-1">Message</p>
                            <p className="text-stone-300 italic">{result.bookingDetails.message}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agent Insight Card */}
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent/40" />
                      <h3 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4 flex items-center gap-2">
                        <Activity size={14} /> Agent Reasoning
                      </h3>
                      <p className="text-stone-300 leading-relaxed text-base font-serif italic">
                        "{result.insight}"
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-2">Latency</p>
                        <p className="text-2xl font-light text-foreground">{result.metrics.latencyMs} <span className="text-sm font-normal text-stone-600">ms</span></p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-3">Actions Taken</p>
                        <div className="flex -space-x-3">
                          {result.actionChainExecuted.map((_: any, i: number) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-stone-800 border-2 border-stone-950 flex items-center justify-center text-xs font-bold text-accent shadow-lg">
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 backdrop-blur-md text-red-200 rounded-2xl text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Input Area (Fades away when results appear) */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="absolute bottom-0 left-0 right-0 z-30 p-6 pb-12"
          >
            <form onSubmit={handleRunAgent} className="relative group max-w-lg mx-auto">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <MapPin size={18} className="text-accent/60" />
              </div>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={loading}
                placeholder="Type your request here..."
                className="w-full bg-white/5 backdrop-blur-[32px] border border-white/10 text-foreground placeholder-stone-500 rounded-3xl py-5 pl-14 pr-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all disabled:opacity-50 font-sans tracking-tight"
              />
              <button
                type="submit"
                disabled={loading || !userInput.trim()}
                className="absolute inset-y-2.5 right-2.5 aspect-square bg-accent hover:bg-accent/90 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xl"
              >
                <Send size={18} className={userInput.trim() ? "ml-0.5" : ""} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navbar */}
      <AnimatePresence>
        {showNav && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 150 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-1 px-2 py-2 bg-stone-900/40 backdrop-blur-[32px] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <NavButton icon={<Home size={20} />} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
              <NavButton icon={<Search size={20} />} />
              <NavButton icon={<Package size={20} />} active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
              <NavButton icon={<Clock size={20} />} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function NavButton({ icon, active = false, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-500 cursor-pointer ${active ? 'bg-accent/10 text-accent shadow-[inset_0_0_20px_rgba(202,138,4,0.1)]' : 'text-stone-500 hover:text-stone-200 hover:bg-white/5'}`}>
      {icon}
    </button>
  );
}
