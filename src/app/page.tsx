'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Home, Search, Clock, Send, MapPin, CheckCircle2, Activity, ChevronLeft, ReceiptText, BellRing, Navigation2, LogOut, Package, Zap, BarChart3, Languages, XCircle, Cpu, Settings, Info, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import OrchestratorMap from './components/OrchestratorMap';
import { createClientAsync } from '@/lib/supabase';
import { signInWithEmailPassword, signUpWithEmailPassword, signOut } from './actions/auth';

const AGENT_META: Record<string, { label: string; icon: React.ReactNode; color: string; accent: string }> = {
  linguistic: { label: 'Linguistic Agent', icon: <Languages className="w-4 h-4" />, color: 'text-violet-400', accent: 'bg-violet-500/10 border-violet-500/20 shadow-[inset_0_0_20px_rgba(167,139,250,0.08)]' },
  logistics: { label: 'Logistics Agent', icon: <MapPin className="w-4 h-4" />, color: 'text-sky-400', accent: 'bg-sky-500/10 border-sky-500/20 shadow-[inset_0_0_20px_rgba(56,189,248,0.08)]' },
  discovery: { label: 'Discovery Agent', icon: <Search className="w-4 h-4" />, color: 'text-amber-400', accent: 'bg-amber-500/10 border-amber-500/20 shadow-[inset_0_0_20px_rgba(251,191,36,0.08)]' },
  ranking: { label: 'Ranking Agent', icon: <BarChart3 className="w-4 h-4" />, color: 'text-orange-400', accent: 'bg-orange-500/10 border-orange-500/20 shadow-[inset_0_0_20px_rgba(251,146,60,0.08)]' },
  transaction: { label: 'Transaction Agent', icon: <ReceiptText className="w-4 h-4" />, color: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(52,211,153,0.08)]' },
  followup: { label: 'Follow-up Agent', icon: <BellRing className="w-4 h-4" />, color: 'text-blue-400', accent: 'bg-blue-500/10 border-blue-500/20 shadow-[inset_0_0_20px_rgba(96,165,250,0.08)]' },
  success: { label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(52,211,153,0.08)]' },
  error: { label: 'Error', icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', accent: 'bg-red-500/10 border-red-500/20 shadow-[inset_0_0_20px_rgba(248,113,113,0.08)]' },
};

// Snappier hardware-accelerated mobile WebView animation physics
const SPRING_SNAPPY = { type: 'spring', stiffness: 380, damping: 38, mass: 1 } as const;
const SPRING_TACTILE = { type: 'spring', stiffness: 300, damping: 28, mass: 1 } as const;
const SPRING_DRAWER = { type: 'spring', stiffness: 400, damping: 40, mass: 1 } as const;
const TRANSITION_FAST = { type: 'tween', ease: 'easeOut', duration: 0.15 } as const;

// Variants for staggered container entrances
const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING_TACTILE,
  },
};

function AgentTraceCard({ trace, isLast, isActive }: { trace: { step: string; message: string }; isLast: boolean; isActive: boolean }) {
  const meta = AGENT_META[trace.step] ?? { label: 'Supervisor', icon: <Cpu className="w-4 h-4" />, color: 'text-stone-400', accent: 'bg-white/5 border-white/10' };
  const isSuccess = trace.step === 'success';
  const isError = trace.step === 'error';

  return (
    <div className="relative flex gap-4">
      {/* Connector line (GPU dynamic pipeline) */}
      {!isLast && (
        <div className="absolute left-[1.375rem] top-12 bottom-0 w-px bg-white/5 overflow-hidden">
          {isActive && (
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-accent to-transparent animate-pulse-packet will-change-[top]" />
          )}
        </div>
      )}

      {/* Icon node */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`relative z-10 flex-shrink-0 mt-3 w-11 h-11 rounded-2xl border flex items-center justify-center ${meta.accent} ${meta.color} transition-all duration-500`}
      >
        {isActive && (
          <span className="absolute -inset-1.5 rounded-2xl animate-ping opacity-40 bg-accent/40" />
        )}
        {meta.icon}
      </motion.div>

      {/* Card body */}
      <motion.div
        initial={{ opacity: 0, x: -12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`flex-1 mb-3 relative p-4 rounded-2xl border backdrop-blur-3xl ${isError
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
        <p className={`text-sm tracking-tight leading-relaxed ${isSuccess ? 'text-emerald-300/90 font-medium' : isError ? 'text-red-300/90' : 'text-stone-200/90'
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
  const [traces, setTraces] = useState<{ step: string, message: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [locationAccessGranted, setLocationAccessGranted] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string>('Confirmed');
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showMenu, setShowMenu] = useState(false);
  const [resultSourceTab, setResultSourceTab] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Flagship Haptic Engine setup with pre-cached instances
  const hapticsRef = useRef<any>(null);
  
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics').then((module) => {
        hapticsRef.current = module.Haptics;
      }).catch(err => {
        console.warn('Failed to initialize Capacitor Haptics module', err);
      });
    }
  }, []);

  // Client-safe haptic vibration engine fallback for mobile environments
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'warning') => {
    const Haptics = hapticsRef.current;
    if (!Haptics) return;
    
    try {
      if (type === 'light') {
        // Soft organic micro-click (5ms is extremely premium and subtle on flagship LRAs)
        void Haptics.vibrate({ duration: 5 });
      } else if (type === 'medium') {
        // Soft but distinct tick (11ms)
        void Haptics.vibrate({ duration: 11 });
      } else if (type === 'success') {
        // Premium soft double click confirmation pattern
        void Haptics.vibrate({ duration: 8 });
        setTimeout(() => {
          if (hapticsRef.current) {
            void hapticsRef.current.vibrate({ duration: 12 });
          }
        }, 60);
      } else if (type === 'warning') {
        // Soft warning double tap
        void Haptics.vibrate({ duration: 15 });
        setTimeout(() => {
          if (hapticsRef.current) {
            void hapticsRef.current.vibrate({ duration: 8 });
          }
        }, 80);
      }
    } catch (err) {
      console.warn('Failed to trigger native haptic click', err);
    }
  }, []);

  // Pick up login errors from the auth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('login_error');
    if (err) {
      setLoginError(decodeURIComponent(err));
      // Clean the URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    createClientAsync().then((supabase) => {
      // Initial check
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });

      // Listen for changes
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });
      subscription = data.subscription;
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'orders') {
      fetchHistory();
    }
  }, [user, activeTab]);

  const fetchHistory = async () => {
    const supabase = await createClientAsync();
    const { data } = await supabase
      .from('service_bookings')
      .select('*, service_providers(name, location, rating, hourly_rate_pkr)')
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const handleViewPastBooking = (item: any) => {
    void triggerHaptic('light');
    setResult({
      status: 'success',
      insight: `Viewing past booking for ${item.service_type}. This service was previously coordinated by the AISO agents.`,
      actionChainExecuted: ['find_providers', 'rank_providers', 'book_provider'],
      targetLocation: item.customer_location,
      userLocation: item.customer_location,
      providers: [],
      rankingReasoning: `Historical record: ${item.service_providers?.name} was selected based on proximity and rating (${item.service_providers?.rating || 4.5}★).`,
      bookingDetails: {
        confirmationCode: item.id.slice(0, 8).toUpperCase(),
        provider: item.service_providers?.name,
        providerName: item.service_providers?.name,
        providerLocation: item.service_providers?.location,
        bookingId: item.id,
        scheduledTime: item.scheduled_time,
        message: 'This is a past booking retrieved from your history.',
        status: item.status,
        pricePerHour: item.service_providers?.hourly_rate_pkr || item.total_cost_pkr,
      },
      metrics: {
        latencyMs: 0,
        providerFound: true,
        bookingConfirmed: true,
      },
    });
    setResultSourceTab('orders');
    setActiveTab('home');
  };

  const handleCloseResult = useCallback(() => {
    void triggerHaptic('light');
    if (resultSourceTab) {
      setActiveTab(resultSourceTab);
      setResultSourceTab(null);
    }
    setResult(null);
    setUserInput('');
  }, [resultSourceTab, triggerHaptic]);

  useEffect(() => {
    const configureStatusBar = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });

        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#00000000' });
        }
      } catch (err) {
        console.error('Failed to configure status bar overlay', err);
      }
    };

    void configureStatusBar();
  }, []);

  // Handle Android system back button navigation to prevent app closing abruptly
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: Promise<any> | null = null;

    const setupBackButton = async () => {
      const { App } = await import('@capacitor/app');
      if (!active) return;

      listener = App.addListener('backButton', async () => {
        void triggerHaptic('light');
        if (showMenu) {
          setShowMenu(false);
        } else if (result) {
          handleCloseResult();
        } else if (activeTab !== 'home') {
          setActiveTab('home');
        } else {
          await App.exitApp();
        }
      });
    };

    void setupBackButton();

    return () => {
      active = false;
      if (listener) {
        listener.then((l) => l.remove()).catch((err) => console.error('Failed to remove back button listener', err));
      }
    };
  }, [showMenu, result, activeTab, resultSourceTab, handleCloseResult]);

  const requestLocationAccess = async (): Promise<boolean> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permissions = await Geolocation.checkPermissions();

        if (permissions.location !== 'granted') {
          const requested = await Geolocation.requestPermissions();
          if (requested.location !== 'granted') {
            setLocationAccessGranted(false);
            return false;
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        setUserLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        setLocationAccessGranted(true);
        return true;
      }

      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        setUserLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        setLocationAccessGranted(true);
        return true;
      }

      setLocationAccessGranted(false);
      return false;
    } catch (err) {
      console.error('Failed to resolve user location', err);
      setLocationAccessGranted(false);
      return false;
    }
  };

  useEffect(() => {
    void requestLocationAccess();
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
    setError(null);

    if (!locationAccessGranted || !userLocation) {
      const granted = await requestLocationAccess();
      if (!granted) {
        setError('Location access is required before sending a request. Please allow location permission and try again.');
        void triggerHaptic('warning');
        return;
      }
    }

    void triggerHaptic('medium');
    setLoading(true);
    setResult(null);
    setResultSourceTab(null);
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
                void triggerHaptic('light');
                setTraces(prev => [...prev, { step: data.step, message: data.message }]);
              } else if (data.type === 'result') {
                setResult(data.data);
                setLoading(false);
                if (data.data.bookingDetails) {
                  void triggerHaptic('success');
                } else {
                  void triggerHaptic('warning');
                }
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
      void triggerHaptic('warning');
    }
  };

  const showNav = !!result && !loading;
  const showInput = !result && !loading;

  if (authLoading) {
    return (
      <div className="min-h-screen spot-gradient-bg flex items-center justify-center">
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
      <div className="relative h-[100dvh] w-full overflow-hidden spot-gradient-bg font-sans text-foreground selection:bg-accent/30 flex flex-col items-center justify-center p-6">
        {/* Dynamic Cosmic Aurora Background (GPU Accelerated with zero-blur GPU radial gradients) */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-transparent">
          {/* Aurora Circle 1 (Accent Golden/Amber) */}
          <div 
            className="absolute -top-1/4 -left-1/4 w-[85%] aspect-square rounded-full animate-aurora-1 will-change-transform" 
            style={{ background: 'radial-gradient(circle, rgba(202, 138, 4, 0.08) 0%, transparent 70%)' }}
          />
          {/* Aurora Circle 2 (Indigo/Violet Deep Tech) */}
          <div 
            className="absolute -bottom-1/4 -right-1/4 w-[80%] aspect-square rounded-full animate-aurora-2 will-change-transform" 
            style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.07) 0%, transparent 70%)' }}
          />
          {/* Aurora Circle 3 (Sky Blue Ambient Flow) */}
          <div 
            className="absolute top-1/3 left-1/3 w-[65%] aspect-square rounded-full animate-aurora-3 will-change-transform" 
            style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)' }}
          />
          {/* Fine Noise Texture Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-35 mix-blend-overlay" />
        </div>
        <div className="absolute inset-0 z-0 bg-stone-950/45 backdrop-blur-[2px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-[32px] rounded-[3rem] p-10 text-center relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="w-20 h-20 bg-accent/10 border border-accent/20 rounded-[1.75rem] flex items-center justify-center mx-auto mb-6 shadow-[inset_0_0_30px_rgba(202,138,4,0.1)] relative">
            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
            <Zap className="w-10 h-10 text-accent relative z-10 animate-pulse" />
          </div>

          <h1 className="text-3xl font-serif text-white mb-2 tracking-tight">AISO</h1>
          <p className="text-white/40 mb-8 text-base font-light tracking-wide">
            Secure agentic service <br />
            <span className="italic font-serif text-accent/80">orchestration for Karachi</span>
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim() || !password.trim()) {
                setLoginError('Email and Password are required.');
                return;
              }
              if (isSignUp && !fullName.trim()) {
                setLoginError('Full name is required to create an account.');
                return;
              }
              setLoginError(null);
              setLoginLoading(true);
              try {
                if (isSignUp) {
                  await signUpWithEmailPassword(email, password, fullName);
                  setLoginError('Account created successfully! Please check your email for a verification link or sign in.');
                  setIsSignUp(false);
                } else {
                  await signInWithEmailPassword(email, password);
                }
              } catch (err: any) {
                setLoginError(err?.message || String(err));
              } finally {
                setLoginLoading(false);
              }
            }}
            className="space-y-4 text-left"
          >
            {/* Input field wrapper */}
            <div className="space-y-3.5">
              <AnimatePresence initial={false} mode="popLayout">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-stone-900/30 border border-white/[0.08] text-white placeholder-stone-500 rounded-2xl py-4 pl-12 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all font-sans text-sm"
                      required
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-stone-900/30 border border-white/[0.08] text-white placeholder-stone-500 rounded-2xl py-4 pl-12 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all font-sans text-sm"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-stone-900/30 border border-white/[0.08] text-white placeholder-stone-500 rounded-2xl py-4 pl-12 pr-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all font-sans text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-stone-400 hover:text-stone-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className={`p-4 border rounded-2xl text-xs break-all leading-relaxed ${loginError.includes('successfully')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                {loginError}
              </div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={loginLoading}
              className="w-full h-14 mt-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-stone-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(202,138,4,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-stone-950 border-t-transparent animate-spin" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLoginError(null);
              }}
              className="text-xs text-stone-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-bold">#AISeekho2026 Challenge 2</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-accent/40 font-bold">Secure Orchestration Layer</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden spot-gradient-bg font-sans text-foreground selection:bg-accent/30">
      {/* Dynamic Cosmic Aurora Background (GPU Accelerated with zero-blur GPU radial gradients) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-transparent">
        {/* Aurora Circle 1 (Accent Golden/Amber) */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-[85%] aspect-square rounded-full animate-aurora-1 will-change-transform" 
          style={{ background: 'radial-gradient(circle, rgba(202, 138, 4, 0.08) 0%, transparent 70%)' }}
        />
        {/* Aurora Circle 2 (Indigo/Violet Deep Tech) */}
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-[80%] aspect-square rounded-full animate-aurora-2 will-change-transform" 
          style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.07) 0%, transparent 70%)' }}
        />
        {/* Aurora Circle 3 (Sky Blue Ambient Flow) */}
        <div 
          className="absolute top-1/3 left-1/3 w-[65%] aspect-square rounded-full animate-aurora-3 will-change-transform" 
          style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)' }}
        />
        {/* Fine Noise Texture Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-35 mix-blend-overlay" />
      </div>
      <div className="absolute inset-0 z-0 bg-stone-950/45 backdrop-blur-[2px] transition-all duration-700" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        {/* Premium Liquid Glass Background */}
        <div
          className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          {/* Main Translucent Blur Layer */}
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[32px] saturate-[180%] [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]" />
          {/* Subtle Inner Glow & Noise (Overlay) */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent mix-blend-overlay [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]" />
          {/* Dynamic Top Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-50" />
        </div>

        <div className="relative flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-8 pointer-events-auto">
          <div className="flex items-center gap-3">
            {(result || activeTab !== 'home') && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { if (result) { handleCloseResult(); } else { setActiveTab('home'); } }}
                className="p-2 -ml-2 rounded-full bg-stone-900/30 hover:bg-stone-800/50 backdrop-blur-2xl saturate-[1.5] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300"
              >
                <ChevronLeft size={20} className="text-white/90" />
              </motion.button>
            )}
            <h1 className="text-xl font-serif tracking-tight text-white/90 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
              {result ? 'Booking Details' : activeTab === 'orders' ? 'Past Orders' : activeTab === 'alerts' ? 'Notifications' : activeTab === 'settings' ? 'Discovery & Settings' : 'AISO'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {user && activeTab === 'home' && !result && (
              <div className="relative w-10 h-10 rounded-full border border-white/[0.15] p-0.5 overflow-hidden backdrop-blur-2xl bg-stone-900/30 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay" />
                <img
                  src={user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  className="w-full h-full rounded-full object-cover relative z-10"
                  alt="profile"
                />
              </div>
            )}
            {!result && activeTab === 'home' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMenu(true)}
                className="p-2.5 rounded-full bg-stone-900/30 hover:bg-stone-800/50 backdrop-blur-2xl saturate-[1.5] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 group"
              >
                <Menu size={20} className="text-white/80 group-hover:text-white transition-colors" />
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 20)}
        className="relative z-10 flex flex-col h-full pt-32 pb-40 px-6 overflow-y-auto custom-scrollbar"
      >

        {/* Orders History Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <motion.div
              key="orders-tab"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={TRANSITION_FAST}
              className="flex flex-col space-y-4 pb-20"
            >
              {/* Header title now handles "Past Orders" */}
              {/* Header title now handles "Past Orders" */}
              {history.length > 0 ? history.map((item) => {
                const isExpanded = expandedOrderId === item.id;
                return (
                  <div
                    key={item.id}
                    className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-xl overflow-hidden transition-all duration-300"
                  >
                    {/* Header bar click toggle */}
                    <button
                      onClick={() => {
                        void triggerHaptic('light');
                        setExpandedOrderId(isExpanded ? null : item.id);
                      }}
                      className="w-full text-left p-5 flex items-center justify-between hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent/10 rounded-2xl group-hover:scale-105 transition-transform">
                          <Package size={22} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-stone-200 font-semibold text-sm">{item.service_providers?.name || 'Technician'}</p>
                          <p className="text-[10px] text-stone-500 font-medium">{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-accent font-bold text-sm">PKR {item.total_cost_pkr}</p>
                          <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-semibold">{item.status}</p>
                        </div>
                        <ChevronLeft
                          size={16}
                          className={`text-stone-600 transition-transform duration-300 ${isExpanded ? '-rotate-90 text-accent' : 'rotate-180'}`}
                        />
                      </div>
                    </button>

                    {/* Sliding Details Accordion */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="overflow-hidden border-t border-white/5 bg-white/[0.01]"
                        >
                          <div className="p-5 space-y-4 text-xs text-stone-300">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-stone-500 text-[10px] uppercase tracking-wider mb-0.5 font-bold">Booking Type</p>
                                <p className="text-stone-200 font-medium">{item.service_type}</p>
                              </div>
                              <div>
                                <p className="text-stone-500 text-[10px] uppercase tracking-wider mb-0.5 font-bold">Confirmation Code</p>
                                <p className="text-stone-200 font-mono tracking-wider font-semibold">{item.id.slice(0, 8).toUpperCase()}</p>
                              </div>
                              {item.scheduled_time && (
                                <div className="col-span-2">
                                  <p className="text-stone-500 text-[10px] uppercase tracking-wider mb-0.5 font-bold">Scheduled Time</p>
                                  <p className="text-stone-200">
                                    {item.scheduled_time === 'Now'
                                      ? 'Immediate Arrival'
                                      : isNaN(new Date(item.scheduled_time).getTime())
                                        ? item.scheduled_time
                                        : new Date(item.scheduled_time).toLocaleDateString() + ' at ' + new Date(item.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    }
                                  </p>
                                </div>
                              )}
                              <div className="col-span-2">
                                <p className="text-stone-500 text-[10px] uppercase tracking-wider mb-0.5 font-bold">Customer Location</p>
                                <p className="text-stone-200 leading-relaxed truncate">{item.customer_location}</p>
                              </div>
                            </div>

                            {/* Full View navigation link */}
                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => handleViewPastBooking(item)}
                                className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-stone-950 font-bold px-4 py-2.5 rounded-2xl transition-all active:scale-95 cursor-pointer shadow-lg shadow-accent/10"
                              >
                                <span>Open Full Trace & Map</span>
                                <ChevronLeft size={14} className="rotate-180 text-stone-950" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }) : (
                <div className="text-center py-20 text-stone-500">
                  <Clock size={40} className="mx-auto mb-4 opacity-20" />
                  <p>No past orders found.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerts & Notifications Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'alerts' && (
            <motion.div
              key="alerts-tab"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={TRANSITION_FAST}
              className="flex flex-col pb-20"
            >
              <div className="flex justify-end mb-6">
                <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-widest">
                  {result?.followUpDetails ? '1 New' : 'Inbox'}
                </span>
              </div>

              <div className="space-y-4">
                {/* AI-Generated Booking Alert (Dynamic) */}
                {result?.followUpDetails && (
                  <NotificationItem
                    icon={<BellRing className="w-5 h-5 text-blue-400" />}
                    title="Follow-up Scheduled"
                    message={result.followUpDetails.message}
                    time="Just now"
                    type="ai"
                  />
                )}

                {/* Safety/System Alerts (Static but themed) */}
                <NotificationItem
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  title="Welcome to AISO"
                  message="Your secure AISO orchestration layer is active. We're ready to find your first provider."
                  time="2h ago"
                />

                <NotificationItem
                  icon={<Zap className="w-5 h-5 text-amber-400" />}
                  title="Safety Tip"
                  message="Always ask for the provider's verification code before allowing them to start work."
                  time="5h ago"
                />

                {!result?.followUpDetails && (
                  <div className="pt-10 text-center opacity-20">
                    <BellRing size={40} className="mx-auto mb-4" />
                    <p className="text-sm font-light">No other notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings & Discovery Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={TRANSITION_FAST}
              className="flex flex-col pb-20"
            >
              {/* Header title now handles "Discovery & Settings" */}

              {/* Category Grid */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <CategoryCard icon={<Zap className="w-6 h-6" />} label="Electrician" color="bg-amber-500/10 text-amber-400" onClick={() => { void triggerHaptic('light'); setUserInput("I need an electrician near me"); setActiveTab('home'); }} />
                <CategoryCard icon={<MapPin className="w-6 h-6" />} label="Plumber" color="bg-blue-500/10 text-blue-400" onClick={() => { void triggerHaptic('light'); setUserInput("Find a plumber in my area"); setActiveTab('home'); }} />
                <CategoryCard icon={<Cpu className="w-6 h-6" />} label="AC Repair" color="bg-sky-500/10 text-sky-400" onClick={() => { void triggerHaptic('light'); setUserInput("Need AC technician for G-13"); setActiveTab('home'); }} />
                <CategoryCard icon={<Activity className="w-6 h-6" />} label="Gas Fitter" color="bg-red-500/10 text-red-400" onClick={() => { void triggerHaptic('light'); setUserInput("Gas fitter required for kitchen stove"); setActiveTab('home'); }} />
              </div>

              {/* Discovery Prompts */}
              <div className="space-y-4 mb-10">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold px-1">Try Asking</h3>
                <div className="flex flex-col gap-3">
                  <PromptButton text="“Kal subah plumber bhej dein”" onClick={() => { void triggerHaptic('light'); setUserInput("Kal subah plumber bhej dein"); setActiveTab('home'); }} />
                  <PromptButton text="“AC service near DHA Phase 6”" onClick={() => { void triggerHaptic('light'); setUserInput("AC service near DHA Phase 6"); setActiveTab('home'); }} />
                  <PromptButton text="“Emergency electrician needed now”" onClick={() => { void triggerHaptic('light'); setUserInput("Emergency electrician needed now"); setActiveTab('home'); }} />
                </div>
              </div>

              {/* Profile & Account Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold px-1">Account</h3>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={user?.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                      className="w-12 h-12 rounded-full border border-white/10 shadow-lg"
                      alt="profile"
                    />
                    <div className="overflow-hidden">
                      <p className="text-base font-medium text-white truncate">{user?.user_metadata.full_name}</p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <button
                    onClick={() => signOut()}
                    className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    <LogOut size={20} />
                    <span className="text-sm font-bold">Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Language Support Badge */}
              <div className="mt-10 p-6 rounded-3xl bg-accent/5 border border-accent/10 flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-2xl">
                  <Languages className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-stone-200 text-sm font-medium">Multilingual Support</p>
                  <p className="text-stone-500 text-xs">Chat in Urdu, Roman Urdu, or English.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Home Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={TRANSITION_FAST}
              className="flex-1 flex flex-col"
            >
              {/* Initial Clean State */}
              <AnimatePresence>
                {!loading && !result && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={SPRING_TACTILE}
                    className="flex-1 flex flex-col justify-center pb-8"
                  >
                    <div className="flex-1 flex flex-col justify-center pb-20 text-center items-center">
                      <p className="font-serif text-foreground/80 text-lg mb-2 tracking-widest uppercase">
                        Hello, {(() => {
                          const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'human';
                          const firstWord = fullName.trim().split(/\s+/)[0];
                          const cleaned = firstWord.replace(/[^a-zA-Z]/g, '');
                          const displayName = cleaned || firstWord || 'HUMAN';
                          return displayName.toUpperCase();
                        })()}
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
                    variants={STAGGER_CONTAINER}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    className="flex flex-col space-y-6 pb-20"
                  >
                    {/* Map Card */}
                    <motion.div variants={STAGGER_ITEM} className="w-full h-[320px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-stone-900/50 backdrop-blur-xl">
                      <OrchestratorMap
                        userLocation={result.userLocation || userLocation}
                        providerLocation={result.bookingDetails?.providerLocation}
                        providerName={result.bookingDetails?.providerName || result.bookingDetails?.provider || 'Provider'}
                        bookingConfirmed={!!result.bookingDetails}
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
                    </motion.div>

                    {/* Booking Receipt Card (Tactile Serrated Ticket Layout) */}
                    {result.bookingDetails && (
                      <motion.div variants={STAGGER_ITEM} className="ticket-card bg-white/5 backdrop-blur-3xl border border-white/10 p-7 pb-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        {/* Half-circle ticket cuts */}
                        <div className="absolute left-0 right-0 top-[55%] -translate-y-1/2 flex justify-between pointer-events-none z-20">
                          <div className="w-3 h-6 bg-[#0c0a09] -ml-1.5 rounded-r-full border-y border-r border-white/10 shadow-[inset_1px_0_3px_rgba(0,0,0,0.6)]" />
                          <div className="w-3 h-6 bg-[#0c0a09] -mr-1.5 rounded-l-full border-y border-l border-white/10 shadow-[inset_-1px_0_3px_rgba(0,0,0,0.6)]" />
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                          <ReceiptText size={80} />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4 flex items-center gap-2">
                          <ReceiptText size={14} /> Booking Confirmed
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm relative z-10">
                          <div>
                            <p className="text-stone-500 text-xs mb-1 font-medium">Confirmation Code</p>
                            <div className="flex items-center gap-2">
                              <p className="text-stone-200 font-mono font-bold tracking-wider">{result.bookingDetails.confirmationCode}</p>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  void triggerHaptic('light');
                                  await navigator.clipboard.writeText(result.bookingDetails.confirmationCode);
                                }}
                                className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 text-stone-400 hover:text-accent hover:border-accent/40 px-2 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-stone-500 text-xs mb-1 font-medium">Provider</p>
                            <p className="text-stone-200 font-semibold">{result.bookingDetails.providerName || result.bookingDetails.provider}</p>
                          </div>
                          {(result.scheduledTime || result.bookingDetails.scheduledTime) && (
                            <div className="col-span-2 mt-1">
                              <p className="text-stone-500 text-xs mb-1 font-medium">Scheduled Time</p>
                              <p className="text-stone-200">
                                {(() => {
                                  const timeVal = result.scheduledTime || result.bookingDetails.scheduledTime;
                                  return timeVal === 'Now'
                                    ? 'Immediate Arrival'
                                    : isNaN(new Date(timeVal).getTime())
                                      ? timeVal
                                      : new Date(timeVal).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
                                })()}
                              </p>
                            </div>
                          )}

                          {/* Serrated dashed division line right above the message */}
                          <div className="col-span-2 my-2 border-t border-dashed border-white/20 z-10" />

                          {result.bookingDetails.pricePerHour && (
                            <div className="col-span-2 mt-1">
                              <p className="text-stone-500 text-xs mb-1 font-medium">Price per Hour</p>
                              <p className="text-stone-200 font-semibold">PKR {result.bookingDetails.pricePerHour}/hr</p>
                            </div>
                          )}
                          {result.rankingReasoning && (
                            <div className="col-span-2 mt-1">
                              <p className="text-stone-500 text-xs mb-1 font-medium">Selection Reason</p>
                              <p className="text-stone-300 text-xs leading-relaxed">{result.rankingReasoning}</p>
                            </div>
                          )}

                          <div className="col-span-2">
                            <p className="text-stone-500 text-xs mb-1 font-medium">Message</p>
                            <p className="text-stone-300 italic text-xs leading-relaxed">"{result.bookingDetails.message}"</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Follow-up Card */}
                    {result.followUpDetails && (
                      <motion.div variants={STAGGER_ITEM} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl flex items-center gap-5">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                          <BellRing size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-1">Follow-up Scheduled</p>
                          <p className="text-stone-200 text-sm">{result.followUpDetails.message}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Ranking Decision Card */}
                    {result.rankingReasoning && (
                      <motion.div variants={STAGGER_ITEM} className="bg-white/5 backdrop-blur-3xl border border-accent/20 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400/60" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-4 flex items-center gap-2">
                          <BarChart3 size={14} /> Ranking Decision
                        </h3>
                        <p className="text-stone-300 leading-relaxed text-sm">
                          {result.rankingReasoning}
                        </p>
                      </motion.div>
                    )}

                    {/* Agent Insight Card */}
                    <motion.div variants={STAGGER_ITEM} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent/40" />
                      <h3 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4 flex items-center gap-2">
                        <Activity size={14} /> Agent Reasoning
                      </h3>
                      <p className="text-stone-300 leading-relaxed text-base font-serif italic">
                        "{result.insight}"
                      </p>
                    </motion.div>

                    {/* Metrics Grid */}
                    <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-4">
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
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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
            className="absolute bottom-0 left-0 right-0 z-30 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          >
            <div className="max-w-lg mx-auto space-y-3">
              <form onSubmit={handleRunAgent} className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <MapPin size={18} className="text-accent/60" />
                </div>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={loading || !locationAccessGranted}
                  placeholder={locationAccessGranted ? "Type your request here..." : "Allow location access to continue..."}
                  className="w-full bg-stone-900/30 backdrop-blur-[32px] saturate-[180%] border border-white/[0.08] text-white placeholder-stone-500 rounded-3xl py-5 pl-14 pr-16 shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all disabled:opacity-50 font-sans tracking-tight"
                />
                {locationAccessGranted ? (
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.85 }}
                    disabled={loading || !userInput.trim()}
                    className="absolute inset-y-2.5 right-2.5 aspect-square bg-accent hover:bg-accent/90 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 rounded-2xl flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(202,138,4,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] disabled:shadow-none"
                  >
                    <Send size={18} className={userInput.trim() ? "ml-0.5" : ""} />
                  </motion.button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const granted = await requestLocationAccess();
                      if (!granted) {
                        setError('Location access is required before sending a request. Please allow location permission and try again.');
                      } else {
                        setError(null);
                      }
                    }}
                    className="absolute inset-y-2.5 right-2.5 px-4 bg-accent/15 border border-accent/40 text-accent rounded-2xl text-xs font-semibold tracking-wide hover:bg-accent/20 transition-colors"
                  >
                    Allow
                  </button>
                )}
              </form>
              {!locationAccessGranted && (
                <p className="text-center text-[11px] text-stone-400">
                  Location permission is required to start a request.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING_DRAWER}
              className="absolute top-0 right-0 bottom-0 w-[80%] max-w-sm z-[101] bg-stone-950/80 backdrop-blur-3xl border-l border-white/10 p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-2xl font-serif text-white">Navigation</h2>
                <button onClick={() => setShowMenu(false)} className="p-2 rounded-full bg-white/5 border border-white/10">
                  <XCircle size={20} className="text-white/40" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <MenuItem icon={<Home className="w-5 h-5" />} label="Home Chat" active={activeTab === 'home'} onClick={() => { void triggerHaptic('light'); setActiveTab('home'); setShowMenu(false); }} />
                <MenuItem icon={<Package className="w-5 h-5" />} label="Booking History" active={activeTab === 'orders'} onClick={() => { void triggerHaptic('light'); setActiveTab('orders'); setShowMenu(false); }} />
                <MenuItem icon={<BellRing className="w-5 h-5" />} label="Notifications" active={activeTab === 'alerts'} onClick={() => { void triggerHaptic('light'); setActiveTab('alerts'); setShowMenu(false); }} />
                <MenuItem icon={<Settings className="w-5 h-5" />} label="Discovery & Settings" active={activeTab === 'settings'} onClick={() => { void triggerHaptic('light'); setActiveTab('settings'); setShowMenu(false); }} />
              </div>

              <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
                  <img
                    src={user?.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                    className="w-10 h-10 rounded-full border border-white/10 shadow-lg"
                    alt="profile"
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user?.user_metadata.full_name}</p>
                    <p className="text-[10px] text-stone-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { signOut(); setShowMenu(false); }}
                  className="flex items-center gap-3 p-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={20} />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
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
function MenuItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98, x: -4 }}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${active ? 'bg-accent/10 text-accent shadow-[inset_0_0_20px_rgba(202,138,4,0.05)]' : 'text-stone-400 hover:text-white hover:bg-white/5'}`}
    >
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-accent/10' : 'bg-white/5 group-hover:bg-accent/10 group-hover:text-accent'}`}>
        {icon}
      </div>
      <span className="font-medium tracking-tight">{label}</span>
    </motion.button>
  );
}


function CategoryCard({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all active:scale-95 group"
    >
      <div className={`p-4 rounded-2xl ${color} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-stone-400 group-hover:text-stone-200">{label}</span>
    </button>
  );
}

function PromptButton({ text, onClick }: { text: string, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/30 transition-all flex items-center justify-between group"
    >
      <span className="text-sm text-stone-300 group-hover:text-white transition-colors">{text}</span>
      <ChevronLeft className="w-4 h-4 text-stone-600 rotate-180 group-hover:text-accent transition-colors" />
    </button>
  );
}

function NotificationItem({ icon, title, message, time, type = 'system' }: { icon: React.ReactNode, title: string, message: string, time: string, type?: 'ai' | 'system' }) {
  return (
    <div className={`p-5 rounded-3xl border backdrop-blur-3xl transition-all ${type === 'ai' ? 'bg-accent/5 border-accent/20 shadow-[inset_0_0_20px_rgba(202,138,4,0.05)]' : 'bg-white/5 border-white/10'}`}>
      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${type === 'ai' ? 'bg-accent/10 border-accent/20' : 'bg-white/5 border-white/10'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-sm font-semibold truncate ${type === 'ai' ? 'text-accent' : 'text-stone-200'}`}>{title}</h4>
            <span className="text-[10px] text-stone-500 font-medium">{time}</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">{message}</p>
        </div>
      </div>
    </div>
  );
}



