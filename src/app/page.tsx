'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Home, Search, Clock, Send, MapPin, CheckCircle2, Activity, ChevronLeft, ReceiptText, BellRing, Navigation2, LogOut, Package, Zap, BarChart3, Languages, XCircle, Cpu } from 'lucide-react';
import OrchestratorMap from './components/OrchestratorMap';
import { createClient } from '@/lib/supabase';
import { signInWithGoogle, signOut } from './actions/auth';

const AGENT_META: Record<string, { label: string; icon: React.ReactNode; color: string; accent: string }> = {
  linguistic:  { label: 'Linguistic Agent',  icon: <Languages className="w-4 h-4" />,    color: 'text-violet-400',  accent: 'bg-violet-500/10 border-violet-500/20 shadow-[inset_0_0_20px_rgba(167,139,250,0.08)]' },
  logistics:   { label: 'Logistics Agent',   icon: <MapPin className="w-4 h-4" />,       color: 'text-sky-400',     accent: 'bg-sky-500/10 border-sky-500/20 shadow-[inset_0_0_20px_rgba(56,189,248,0.08)]' },
  discovery:   { label: 'Discovery Agent',   icon: <Search className="w-4 h-4" />,       color: 'text-amber-400',   accent: 'bg-amber-500/10 border-amber-500/20 shadow-[inset_0_0_20px_rgba(251,191,36,0.08)]' },
  ranking:     { label: 'Ranking Agent',     icon: <BarChart3 className="w-4 h-4" />,    color: 'text-orange-400',  accent: 'bg-orange-500/10 border-orange-500/20 shadow-[inset_0_0_20px_rgba(251,146,60,0.08)]' },
  transaction: { label: 'Transaction Agent', icon: <ReceiptText className="w-4 h-4" />,  color: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(52,211,153,0.08)]' },
  followup:    { label: 'Follow-up Agent',   icon: <BellRing className="w-4 h-4" />,     color: 'text-blue-400',    accent: 'bg-blue-500/10 border-blue-500/20 shadow-[inset_0_0_20px_rgba(96,165,250,0.08)]' },
  success:     { label: 'Completed',         icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(52,211,153,0.08)]' },
  error:       { label: 'Error',             icon: <XCircle className="w-4 h-4" />,      color: 'text-red-400',     accent: 'bg-red-500/10 border-red-500/20 shadow-[inset_0_0_20px_rgba(248,113,113,0.08)]' },
};

function AgentTraceCard({ trace, isLast, isActive }: { trace: { step: string; message: string }; isLast: boolean; isActive: boolean }) {
  const meta = AGENT_META[trace.step] ?? { label: 'Supervisor', icon: <Cpu className="w-4 h-4" />, color: 'text-stone-400', accent: 'bg-white/5 border-white/10' };
  const isSuccess = trace.step === 'success';
  const isError = trace.step === 'error';

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[1.375rem] top-12 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
      )}

      {/* Icon node */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`relative z-10 flex-shrink-0 mt-3 w-11 h-11 rounded-2xl border flex items-center justify-center ${meta.accent} ${meta.color} transition-all duration-500`}
      >
        {isActive && (
          <span className="absolute -inset-1 rounded-2xl animate-ping opacity-30" style={{ background: 'currentColor' }} />
        )}
        {meta.icon}
      </motion.div>

      {/* Card body */}
      <motion.div
        initial={{ opacity: 0, x: -12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`flex-1 mb-3 relative p-4 rounded-2xl border backdrop-blur-3xl ${
          isError
            ? 'bg-red-500/5 border-red-500/20'
            : isSuccess
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-white/[0.04] border-white/8 hover:bg-white/[0.06]'
        } transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)]`}
      >
        {/* Top accent bar */}
        <div className={`absolute top-0 left-4 right-4 h-px rounded-full opacity-60 bg-gradient-to-r from-transparent ${isSuccess ? 'via-emerald-500/50' : isError ? 'via-red-500/50' : 'via-white/20'} to-transparent`} />

        <div className="flex items-center justify-between mb-1">
          <span className={`text-[9px] uppercase tracking-[0.25em] font-bold ${meta.color} opacity-70`}>
            {meta.label}
          </span>
          {isActive && (
            <span className="flex gap-1 items-center">
              <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {isSuccess && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </div>
        <p className={`text-sm tracking-tight leading-relaxed ${
          isSuccess ? 'text-emerald-300/90 font-medium' : isError ? 'text-red-300/90' : 'text-stone-200/90'
        }`}>
          {trace.message}
        </p>
      </motion.div>
    </div>
  );
}

export default function MobileHome() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<{step: string, message: string}[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userLocation, setUserLocation] = useState("33.6844, 73.0479");
  const [bookingStatus, setBookingStatus] = useState<string>('Confirmed');
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
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
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [result]);

  const handleRunAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setTraces([]);

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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run agent');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'trace') {
                setTraces(prev => [...prev, { step: data.step, message: data.message }]);
              } else if (data.type === 'result') {
                setResult(data.data);
                setLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const mapProviders = result?.providers || [];
  const showNav = !!result && !loading;
  const showInput = !result && !loading;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-accent/20 rounded-full blur-xl"
        />
        <Zap className="w-8 h-8 text-accent absolute animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-background font-sans text-foreground selection:bg-accent/30 flex flex-col items-center justify-center p-6">
        {/* Background Image & Blur */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{ backgroundImage: 'url("/bg-mountains.png")' }}
        />
        <div className="absolute inset-0 z-0 bg-stone-950/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-[32px] rounded-[3rem] p-12 text-center relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="w-24 h-24 bg-accent/10 border border-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-[inset_0_0_30px_rgba(202,138,4,0.1)] relative">
             <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
             <Zap className="w-12 h-12 text-accent relative z-10" />
          </div>
          
          <h1 className="text-4xl font-serif text-white mb-4 tracking-tight">Antigravity</h1>
          <p className="text-white/40 mb-12 text-lg font-light tracking-wide">
            Secure agentic service <br />
            <span className="italic font-serif text-accent/80">orchestration for Karachi</span>
          </p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full h-16 bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-xl text-white rounded-[1.5rem] font-medium text-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] group"
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            </div>
            Continue with Google
          </button>
          
          <div className="mt-12 pt-10 border-t border-white/5 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">#AISeekho2026 Challenge 2</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent/40 font-bold">Secure Orchestration Layer</span>
          </div>
        </motion.div>
      </div>
    );
  }

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
          {user && (
            <>
              <button 
                onClick={() => signOut()} 
                className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 backdrop-blur-xl border border-white/10 transition-all active:scale-95 group"
                title="Logout"
              >
                <LogOut size={18} className="text-white/40 group-hover:text-red-400 transition-colors" />
              </button>
              <div className="w-10 h-10 rounded-full border border-white/10 p-0.5 overflow-hidden backdrop-blur-xl bg-white/5">
                <img 
                  src={user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  className="w-full h-full rounded-full object-cover" 
                  alt="profile" 
                />
              </div>
            </>
          )}
          <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 transition-all active:scale-95">
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

              {/* Loading State & Traces */}
              <AnimatePresence>
                {loading && traces.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-6"
                  >
                    {/* Orbital spinner */}
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border border-white/5" />
                      <div className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin" style={{ animationDuration: '1.4s' }} />
                      <div className="absolute inset-3 rounded-full border border-white/5" />
                      <div className="absolute inset-3 rounded-full border border-accent/10 border-b-accent/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-accent/60" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-serif italic text-foreground/70 text-base tracking-wider">Initializing agents</p>
                      <p className="text-stone-600 text-xs tracking-widest uppercase mt-1">Multi-agent orchestration</p>
                    </div>
                  </motion.div>
                )}
                {loading && traces.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col w-full pb-20"
                  >
                    {/* Header bar */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600 font-bold">Agent Pipeline</p>
                        <h3 className="font-serif text-lg text-foreground/80 mt-0.5">Orchestrating request</h3>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Live</span>
                      </div>
                    </div>

                    {/* Trace cards with connector */}
                    <div className="flex flex-col">
                      {traces.map((trace, i) => (
                        <AgentTraceCard
                          key={i}
                          trace={trace}
                          isLast={i === traces.length - 1}
                          isActive={i === traces.length - 1}
                        />
                      ))}
                    </div>
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
                    {/* Map Card */}
                    <div className="w-full h-[320px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-stone-900/50 backdrop-blur-xl">
                      <OrchestratorMap
                        warehouseLocation={result.targetLocation || userLocation}
                        suppliers={mapProviders}
                        selectedSupplierId={null}
                      />
                      {/* Only show status overlay when a booking actually exists */}
                      {result.bookingDetails && (
                        <div className="absolute bottom-4 left-4 right-4 bg-stone-950/90 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl transition-all duration-500">
                          <div className={`p-2.5 rounded-full border ${bookingStatus === 'Confirmed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : bookingStatus === 'Provider En Route' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                            {bookingStatus === 'Confirmed' ? <CheckCircle2 size={18} /> : bookingStatus === 'Provider En Route' ? <Navigation2 size={18} /> : bookingStatus === 'Follow-up Reminder Sent' ? <BellRing size={18} /> : <CheckCircle2 size={18} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold transition-all duration-500">Status Tracker</p>
                            <p className={`text-sm font-medium transition-all duration-500 ${bookingStatus === 'Confirmed' ? 'text-blue-400/90' : bookingStatus === 'Provider En Route' ? 'text-amber-400/90' : 'text-emerald-400/90'}`}>{bookingStatus}</p>
                          </div>
                        </div>
                      )}
                      {/* Show warning overlay when no booking was made */}
                      {!result.bookingDetails && (
                        <div className="absolute bottom-4 left-4 right-4 bg-stone-950/90 backdrop-blur-2xl p-4 rounded-2xl border border-red-500/20 flex items-center gap-4 shadow-2xl">
                          <div className="p-2.5 rounded-full border bg-red-500/10 border-red-500/20 text-red-400">
                            <XCircle size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold">No Match Found</p>
                            <p className="text-sm font-medium text-red-400/90">No providers available in this area</p>
                          </div>
                        </div>
                      )}
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
                          {result.scheduledTime && (
                            <div className="col-span-2 mt-1">
                              <p className="text-stone-500 text-xs mb-1">Scheduled Time</p>
                              <p className="text-stone-200">{new Date(result.scheduledTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          )}
                          <div className="col-span-2 pt-2 border-t border-white/5">
                            <p className="text-stone-500 text-xs mb-1">Message</p>
                            <p className="text-stone-300 italic">{result.bookingDetails.message}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Card */}
                    {result.followUpDetails && (
                      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl flex items-center gap-5">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                          <BellRing size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-1">Follow-up Scheduled</p>
                          <p className="text-stone-200 text-sm">{result.followUpDetails.message}</p>
                        </div>
                      </div>
                    )}

                    {/* Ranking Decision Card */}
                    {result.rankingReasoning && (
                      <div className="bg-white/5 backdrop-blur-3xl border border-accent/20 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400/60" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-4 flex items-center gap-2">
                          <BarChart3 size={14} /> Ranking Decision
                        </h3>
                        <p className="text-stone-300 leading-relaxed text-sm">
                          {result.rankingReasoning}
                        </p>
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
