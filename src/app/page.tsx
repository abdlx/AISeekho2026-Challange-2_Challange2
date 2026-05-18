'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Home, Search, Clock, Send, MapPin, CheckCircle2, Activity, ChevronLeft, ReceiptText, BellRing, Navigation2, LogOut, Package, Zap, BarChart3, Languages, XCircle, Cpu, Settings, Mail, Lock, User, Eye, EyeOff, Star } from 'lucide-react';
import OrchestratorMap from './components/OrchestratorMap';
import { createClientAsync } from '@/lib/supabase';
import { signInWithEmailPassword, signUpWithEmailPassword, signOut } from './actions/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface RankedProvider {
  id: string;
  name: string;
  location: string;
  rating?: number;
  hourly_rate_pkr?: number;
  distanceKm?: number;
  totalScore?: number;
}

export interface BookingHistoryItem {
  id: string;
  service_type: string;
  customer_location: string;
  scheduled_time: string;
  total_cost_pkr: number;
  status: string;
  created_at: string;
  service_providers?: {
    name: string;
    location: string;
    rating?: number;
    hourly_rate_pkr?: number;
  };
}

export interface BookingResult {
  status: string;
  insight?: string;
  actionChainExecuted: string[];
  targetLocation?: string;
  userLocation?: string;
  providers?: RankedProvider[];
  rankingReasoning?: string;
  bookingDetails?: {
    confirmationCode: string;
    provider?: string;
    providerName?: string;
    providerLocation?: string;
    bookingId: string;
    scheduledTime?: string;
    message: string;
    status: string;
    pricePerHour?: number;
    totalCostPkr?: number;
  };
  followUpDetails?: {
    message: string;
  };
  metrics: {
    latencyMs: number;
    providerFound?: boolean;
    bookingConfirmed?: boolean;
  };
  sessionId?: string;
  scheduledTime?: string;
}

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
  const displayMessage = trace.message || `Processing details via ${meta.label}...`;

  return (
    <div className="relative flex gap-4">
      {/* Connector line (GPU dynamic pipeline) */}
      {!isLast && (
        <div className="absolute left-[1.375rem] top-12 bottom-0 w-px bg-white/5 overflow-hidden">
          {isActive && (
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-accent to-transparent animate-pulse-packet will-change-transform" />
          )}
        </div>
      )}

      {/* Icon node - Hardware-Accelerated Native CSS */}
      <div
        className={`relative z-10 flex-shrink-0 mt-3 w-11 h-11 rounded-2xl border flex items-center justify-center ${meta.accent} ${meta.color} transition-all duration-500 animate-scale-in`}
      >
        {isActive && (
          <span className="absolute -inset-1.5 rounded-2xl animate-ping opacity-40 bg-accent/40" />
        )}
        {meta.icon}
      </div>

      {/* Card body - Hardware-Accelerated Native CSS */}
      <div
        className={`flex-1 mb-3 relative p-4 rounded-2xl border backdrop-blur-md ${isError
          ? 'bg-red-950/40 border-red-500/20'
          : isSuccess
            ? 'bg-emerald-950/40 border-emerald-500/20'
            : 'bg-stone-900/80 border-white/10 hover:bg-stone-800/80'
          } transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] animate-fade-in-left`}
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
          {displayMessage}
        </p>
      </div>
    </div>
  );
}

export default function MobileHome() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<{ step: string, message: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [locationAccessGranted, setLocationAccessGranted] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string>('Confirmed');
  const [etaCountdown, setEtaCountdown] = useState<string>('15 mins');
  const [isConfirmingIntent, setIsConfirmingIntent] = useState(false);
  const [sessionIdState, setSessionIdState] = useState<string>('');
  const [confirmedDetails, setConfirmedDetails] = useState<{
    intent: string;
    serviceType: string;
    locationName: string | null;
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    scheduledTime: string | null;
    priority: 'cheapest' | 'fastest' | 'nearest' | 'balanced';
  } | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [history, setHistory] = useState<BookingHistoryItem[]>([]);
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
  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? navigator.onLine : true);

  // Agent Trace drawer states
  const [showTraceDrawer, setShowTraceDrawer] = useState(false);
  const [drawerTraces, setDrawerTraces] = useState<{ step: string, message: string }[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamically resize prompt input textarea as the user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Cap maximum height at 120px (exactly 5 lines of text + padding)
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;

      // Hide scrollbar until content exceeds 5 lines
      if (scrollHeight > 120) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [userInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, insert newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleRunAgent();
    }
  };

  // Monitor network connection status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Flagship Haptic Engine setup with pre-cached instances
  const hapticsRef = useRef<{ vibrate: (options: { duration: number }) => Promise<void> } | null>(null);

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
      const decodedErr = decodeURIComponent(err);
      setTimeout(() => {
        setLoginError(decodedErr);
      }, 0);
      // Clean the URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    // Register Service Worker for offline availability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[ServiceWorker] Active with scope:', reg.scope);
      }).catch((err) => {
        console.error('[ServiceWorker] Registration failed:', err);
      });
    }

    let subscription: { unsubscribe: () => void } | null = null;

    createClientAsync().then((supabase) => {
      // Initial check
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }).catch((err) => {
        console.warn('Supabase getSession failed, likely offline:', err);
        setAuthLoading(false);
      });

      // Listen for changes
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });
      subscription = data.subscription;
    }).catch((err) => {
      console.warn('createClientAsync failed, likely offline:', err);
      setAuthLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const fetchHistory = async () => {
    const supabase = await createClientAsync();
    const { data } = await supabase
      .from('service_bookings')
      .select('*, service_providers(name, location, rating, hourly_rate_pkr)')
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  useEffect(() => {
    if (user && activeTab === 'orders') {
      const timer = setTimeout(() => {
        void fetchHistory();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, activeTab]);

  const handleViewPastBooking = (item: BookingHistoryItem) => {
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
    setTraces([]);
    setDrawerTraces([]);
  }, [resultSourceTab, triggerHaptic]);

  const handleOpenTraceDrawer = async () => {
    // Clear old drawer traces to prevent screen-flashing layout jumps
    setDrawerTraces([]);
    setDrawerError(null);
    setShowTraceDrawer(true);

    const isHistorical = resultSourceTab === 'orders';
    const bookingId = result?.bookingDetails?.bookingId;
    const sessionId = result?.sessionId;

    // Use live in-memory trace logs ONLY if this is not a historical past order view
    if (!isHistorical && traces.length > 0) {
      setDrawerTraces(traces);
      return;
    }

    if (!bookingId && !sessionId) {
      setDrawerError('Unable to resolve traces: missing booking or session ID.');
      return;
    }

    setDrawerLoading(true);
    try {
      const url = bookingId
        ? `/api/traces?bookingId=${bookingId}`
        : `/api/traces?sessionId=${sessionId}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch historical traces');
      }
      const data = await res.json();

      // 1. Deduplicate: keep only the latest trace for each step/tool type in the session
      interface TraceRow {
        tool_name?: string;
        step_type?: string;
        agent_name?: string;
        payload?: unknown;
      }
      const uniqueTracesMap = new Map<string, TraceRow>();
      for (const t of (data.traces || []) as TraceRow[]) {
        const key = t.tool_name || t.step_type || 'unknown';
        uniqueTracesMap.set(key, t);
      }
      const uniqueTraces = Array.from(uniqueTracesMap.values());

      // 2. Sort logically: map trace step order deterministically
      const getTraceWeight = (t: { tool_name?: string; step_type?: string }) => {
        if (t.step_type === 'linguistic_analysis') return 1;
        if (t.tool_name === 'geocode_location') return 2;
        if (t.tool_name === 'find_providers') return 3;
        if (t.tool_name === 'rank_providers') return 4;
        if (t.tool_name === 'calculate_travel') return 5;
        if (t.tool_name === 'book_provider') return 6;
        if (t.tool_name === 'schedule_followup') return 7;
        return 8;
      };
      
      const sortedTraces = uniqueTraces.sort((a, b) => getTraceWeight(a) - getTraceWeight(b));

      // 3. Map API database traces array into local descriptive timeline format
      const formatted = sortedTraces.map((t: { tool_name?: string; step_type?: string; agent_name?: string; payload?: unknown }) => {
        let msg = '';
        const payload = (t.payload || {}) as Record<string, unknown>;

        if (t.step_type === 'linguistic_analysis') {
          const service = payload.serviceType || 'service';
          const loc = payload.locationName || 'current coordinates';
          const urgency = payload.urgency || 'medium';
          msg = `Linguistic Agent: Decoded request for ${service} in "${loc}" with urgency profile: ${urgency}.`;
        } else if (t.tool_name === 'geocode_location') {
          const args = (payload.args || {}) as Record<string, unknown>;
          const addr = args.address || 'specified area';
          const coords = payload.result || 'coordinates';
          msg = `Logistics Agent: Geocoded "${addr}" to coordinates [${coords}].`;
        } else if (t.tool_name === 'find_providers') {
          const resultObj = (payload.result || {}) as Record<string, unknown>;
          const count = Array.isArray(resultObj.data) ? resultObj.data.length : 0;
          msg = `Discovery Agent: Scanned database and matched ${count} nearby service specialists.`;
        } else if (t.tool_name === 'rank_providers') {
          const resultObj = (payload.result || {}) as Record<string, unknown>;
          const bestMatch = (resultObj.bestMatch || {}) as Record<string, unknown>;
          const best = bestMatch.name || 'Top Technician';
          const rate = bestMatch.hourly_rate_pkr || 2000;
          const dist = typeof bestMatch.distanceKm === 'number' ? bestMatch.distanceKm : 0;
          msg = `Ranking Agent: Completed scoring metrics. Selected ${best} (PKR ${rate}/hr, ${dist.toFixed(1)}km away) as optimal option.`;
        } else if (t.tool_name === 'calculate_travel') {
          const eta = payload.result || '15 mins';
          msg = `Logistics Agent: Calculated driving route. Technician estimated arrival ETA is ${eta}.`;
        } else if (t.tool_name === 'book_provider') {
          const resultObj = (payload.result || {}) as Record<string, unknown>;
          const rawId = String(resultObj.bookingId || '');
          const code = rawId ? rawId.slice(0, 8).toUpperCase() : 'CONFIRMED';
          msg = `Transaction Agent: Secured booking confirmation in database. Created order receipt #${code}.`;
        } else if (t.tool_name === 'schedule_followup') {
          msg = `Follow-up Agent: Registered automated appointment review triggers in database.`;
        }

        // Fallbacks if custom mapping isn't hit
        if (!msg) {
          const payloadObj = payload as { text?: string };
          msg = payloadObj.text || '';
        }
        if (!msg) {
          msg = `Executed ${t.tool_name || t.step_type || 'unattributed action'}`;
        }

        // Match the trace steps to our visual steps
        let step = 'linguistic';
        if (t.tool_name === 'find_providers') step = 'discovery';
        else if (t.tool_name === 'rank_providers') step = 'ranking';
        else if (t.tool_name === 'geocode_location' || t.tool_name === 'calculate_travel') step = 'logistics';
        else if (t.tool_name === 'book_provider') step = 'transaction';
        else if (t.tool_name === 'schedule_followup') step = 'followup';

        return { step, message: msg };
      });

      if (formatted.length === 0) {
        // Mock a simple timeline if empty (e.g. past seed data or old logs)
        setDrawerTraces([
          { step: 'linguistic', message: 'Linguistic Agent: Decoded historical intent for past booking.' },
          { step: 'discovery', message: `Discovery Agent: Searched and retrieved historical service providers.` },
          { step: 'ranking', message: `Ranking Agent: Scorecard populated: ${result?.bookingDetails?.providerName || 'Technician'} ranked #1.` },
          { step: 'transaction', message: `Transaction Agent: Secured booking confirmation ${result?.bookingDetails?.confirmationCode || 'BK-1024'}.` },
          { step: 'followup', message: 'Follow-up Agent: Registered notification triggers for appointment.' },
          { step: 'success', message: 'Supervisor: Successfully retrieved and parsed complete agent history.' }
        ]);
      } else {
        setDrawerTraces(formatted);
      }
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Unknown network error';
      setDrawerError(`Failed to load agent timeline: ${errMsg}`);
    } finally {
      setDrawerLoading(false);
    }
  };

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
    let listener: Promise<{ remove: () => Promise<void> }> | null = null;

    const setupBackButton = async () => {
      const { App } = await import('@capacitor/app');
      if (!active) return;

      listener = App.addListener('backButton', async () => {
        void triggerHaptic('light');
        if (showTraceDrawer) {
          setShowTraceDrawer(false);
        } else if (showMenu) {
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
  }, [showTraceDrawer, showMenu, result, activeTab, resultSourceTab, handleCloseResult, triggerHaptic]);

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
    const timer = setTimeout(() => {
      void requestLocationAccess();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (result && result.bookingDetails) {
      const t0 = setTimeout(() => setBookingStatus('Confirmed'), 0);
      const t1 = setTimeout(() => setBookingStatus('Provider En Route'), 3000);
      const t2 = setTimeout(() => setBookingStatus('Service Completed'), 23000);
      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [result]);

  useEffect(() => {
    if (bookingStatus === 'Provider En Route') {
      const etaTimeouts = [
        setTimeout(() => setEtaCountdown('15 mins'), 0),
        setTimeout(() => setEtaCountdown('12 mins'), 3000),
        setTimeout(() => setEtaCountdown('9 mins'), 6000),
        setTimeout(() => setEtaCountdown('6 mins'), 9000),
        setTimeout(() => setEtaCountdown('3 mins'), 12000),
        setTimeout(() => setEtaCountdown('1 min'), 15000),
        setTimeout(() => setEtaCountdown('Arrived!'), 18000),
      ];
      return () => {
        etaTimeouts.forEach(clearTimeout);
      };
    }
  }, [bookingStatus]);

  const handleRunAgent = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = (overrideInput || userInput).trim();
    if (!finalInput) return;
    setUserInput(finalInput);
    setError(null);

    if (!navigator.onLine) {
      setError('You are offline. Please connect to the internet to run the service orchestrator.');
      void triggerHaptic('warning');
      return;
    }

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
    setIsConfirmingIntent(false);
    setConfirmedDetails(null);

    try {
      const currentSessionId = crypto.randomUUID();
      setSessionIdState(currentSessionId);

      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          userInput: finalInput,
          userLocation: userLocation,
          analyzeOnly: true
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
              } else if (data.type === 'analyze_result') {
                setConfirmedDetails(data.data);
                setIsConfirmingIntent(true);
                setLoading(false);
                void triggerHaptic('medium');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      void triggerHaptic('warning');
    }
  };

  const handleRunConfirmed = async (details: typeof confirmedDetails) => {
    if (!details) return;
    void triggerHaptic('medium');
    setLoading(true);
    setIsConfirmingIntent(false);
    setTraces([{ step: 'linguistic', message: 'Linguistic Agent: Confirmed intent loaded.' }]);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdState || crypto.randomUUID(),
          userLocation: userLocation,
          confirmedDetails: details
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to execute booking');
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
                setTraces(prev => {
                  if (data.step === 'linguistic' && prev.some(t => t.step === 'linguistic')) return prev;
                  return [...prev, { step: data.step, message: data.message }];
                });
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      void triggerHaptic('warning');
    }
  };

  const showInput = !result && !loading && !isConfirmingIntent;

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
        {/* Offline Status Premium Banner */}
        {!isOnline && (
          <div className="absolute top-[calc(env(safe-area-inset-top)+1.5rem)] left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-xl flex items-center gap-2 shadow-2xl animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] tracking-widest uppercase font-bold text-red-200">Connect to Internet</span>
          </div>
        )}

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
            <span className="italic font-serif text-accent/80">orchestration for Pakistan</span>
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!navigator.onLine) {
                setLoginError('You are offline. Please connect to the internet to sign in.');
                return;
              }
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
              } catch (err: unknown) {
                setLoginError(err instanceof Error ? err.message : String(err));
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
      {/* Offline Status Premium Banner */}
      {!isOnline && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-xl flex items-center gap-2 shadow-2xl animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] tracking-widest uppercase font-bold text-red-200">Connect to Internet</span>
        </div>
      )}

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
              {/* Initial Clean State & Confirmation Screen */}
              <AnimatePresence>
                {!loading && !result && !isConfirmingIntent && (
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

                      {/* Premium Quick Suggestion Chips */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
                        className="flex flex-wrap gap-2.5 justify-center max-w-sm px-4 mt-8 relative z-10"
                      >
                        {[
                          { text: 'Emergency Plumber', prompt: 'I need a plumber immediately for leakage', icon: <MapPin className="w-3.5 h-3.5 text-blue-400" /> },
                          { text: 'AC Service DHA', prompt: 'AC service k liye technician chahiye DHA Phase 6 mein', icon: <Activity className="w-3.5 h-3.5 text-sky-400" /> },
                          { text: 'Budget Electrician', prompt: 'Kam budget mein ghar ka board repair karne k liye electrician chahiye', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
                        ].map((chip, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              void handleRunAgent(undefined, chip.prompt);
                            }}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-white/[0.025] border border-white/[0.06] hover:border-white/12 text-stone-300 hover:text-white transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-xs font-semibold select-none group"
                          >
                            <div className="flex items-center gap-2">
                              {chip.icon}
                              <span>{chip.text}</span>
                            </div>
                            <Send className="w-2.5 h-2.5 opacity-40 text-stone-500 group-hover:text-stone-300 group-hover:opacity-75 transition-all rotate-45 transform" />
                          </motion.button>
                        ))}
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {isConfirmingIntent && confirmedDetails && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -20 }}
                    transition={SPRING_TACTILE}
                    className="flex-1 flex flex-col justify-center pb-8"
                  >
                    <div className="w-full bg-white/5 border border-white/10 backdrop-blur-[32px] rounded-[2.5rem] p-7 shadow-2xl relative z-10 space-y-6 max-w-md mx-auto">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl">
                          <Languages size={20} className="animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-serif text-lg text-white">Confirm Details</h3>
                          <p className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">Linguistic Agent Parse</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* 1. Service Category */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block mb-1.5">Service Category</label>
                          <input
                            type="text"
                            value={confirmedDetails.serviceType}
                            onChange={(e) => setConfirmedDetails(prev => prev ? { ...prev, serviceType: e.target.value } : null)}
                            className="w-full bg-stone-900/40 border border-white/[0.08] text-stone-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 text-sm transition-all"
                          />
                        </div>

                        {/* 3. Urgency & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block mb-1.5">Urgency Profile</label>
                            <select
                              value={confirmedDetails.urgency}
                              onChange={(e) => setConfirmedDetails(prev => prev ? { ...prev, urgency: e.target.value as 'low' | 'medium' | 'high' | 'emergency' } : null)}
                              className="w-full bg-stone-900 border border-white/[0.08] text-stone-200 rounded-2xl py-3 px-3 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 text-sm transition-all cursor-pointer"
                            >
                              <option value="low">Low Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="high">High Urgency</option>
                              <option value="emergency">Emergency ⚡</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block mb-1.5">Rank Preference</label>
                            <select
                              value={confirmedDetails.priority}
                              onChange={(e) => setConfirmedDetails(prev => prev ? { ...prev, priority: e.target.value as 'cheapest' | 'fastest' | 'nearest' | 'balanced' } : null)}
                              className="w-full bg-stone-900 border border-white/[0.08] text-stone-200 rounded-2xl py-3 px-3 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 text-sm transition-all cursor-pointer"
                            >
                              <option value="balanced">Balanced Rank</option>
                              <option value="cheapest">Cheapest Rate 💰</option>
                              <option value="fastest">Fastest Drive ⚡</option>
                              <option value="nearest">Nearest Proximity 📍</option>
                            </select>
                          </div>
                        </div>

                        {/* 4. Scheduled Time */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block mb-1.5">Schedule Time</label>
                          <input
                            type="text"
                            value={confirmedDetails.scheduledTime || 'Now'}
                            onChange={(e) => setConfirmedDetails(prev => prev ? { ...prev, scheduledTime: e.target.value } : null)}
                            className="w-full bg-stone-900/40 border border-white/[0.08] text-stone-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 text-sm transition-all"
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex gap-3 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            void triggerHaptic('light');
                            setIsConfirmingIntent(false);
                            setConfirmedDetails(null);
                            setUserInput('');
                          }}
                          className="flex-1 py-3.5 px-4 bg-white/5 hover:bg-white/10 text-stone-300 font-bold rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunConfirmed(confirmedDetails)}
                          className="flex-1 py-3.5 px-4 bg-accent hover:bg-accent/90 text-stone-950 font-bold rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider text-center shadow-lg shadow-accent/25"
                        >
                          Confirm
                        </button>
                      </div>
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
                          key={`${trace.step}-${i}`}
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
                        bookingStatus={bookingStatus}
                      />
                      {/* Only show status overlay when a booking actually exists */}
                      {result.bookingDetails && (
                        <div className="absolute bottom-4 left-4 right-4 bg-stone-950/90 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl transition-all duration-500">
                          <div className={`p-2.5 rounded-full border ${bookingStatus === 'Confirmed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : bookingStatus === 'Provider En Route' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                            {bookingStatus === 'Confirmed' ? <CheckCircle2 size={18} /> : bookingStatus === 'Provider En Route' ? <Navigation2 size={18} /> : bookingStatus === 'Follow-up Reminder Sent' ? <BellRing size={18} /> : <CheckCircle2 size={18} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold transition-all duration-500">Status Tracker</p>
                            <p className={`text-sm font-medium transition-all duration-500 ${bookingStatus === 'Confirmed' ? 'text-blue-400/90' : bookingStatus === 'Provider En Route' ? 'text-amber-400/90' : 'text-emerald-400/90'}`}>
                              {bookingStatus} {bookingStatus === 'Provider En Route' && `• ETA: ${etaCountdown}`}
                            </p>
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

                    {/* Grid of separate, tactile booking details boxes */}
                    {result.bookingDetails && (
                      <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-4">
                        {/* 1. Confirmation Code Box */}
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:bg-white/[0.08] transition-all duration-300 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform text-violet-400">
                            <ReceiptText size={48} />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400 font-bold mb-2 flex items-center gap-1.5">
                            <ReceiptText size={10} className="text-violet-400" /> Booking Code
                          </p>
                          <p className="text-base font-mono font-bold tracking-wider text-stone-200 select-all">{result.bookingDetails!.confirmationCode}</p>
                          <div className="mt-3">
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                void triggerHaptic('light');
                                await navigator.clipboard.writeText(result.bookingDetails!.confirmationCode);
                              }}
                              className="text-[9px] uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 hover:text-white px-2.5 py-1 rounded-xl transition-all active:scale-95 cursor-pointer font-bold"
                            >
                              Copy Code
                            </button>
                          </div>
                        </div>

                        {/* 2. Matched Provider Box */}
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:bg-white/[0.08] transition-all duration-300 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform text-sky-400">
                            <User size={48} />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-sky-400 font-bold mb-2 flex items-center gap-1.5">
                            <User size={10} className="text-sky-400" /> Specialist
                          </p>
                          <p className="text-sm font-bold text-stone-100 truncate">{result.bookingDetails!.providerName || result.bookingDetails!.provider || 'Technician'}</p>
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] font-bold text-accent">
                              4.8 ★
                            </span>
                            <span className="text-[9px] text-stone-500 font-medium tracking-wide uppercase">Top Rated</span>
                          </div>
                        </div>

                        {/* 3. Scheduled Time Box */}
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:bg-white/[0.08] transition-all duration-300 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform text-amber-400">
                            <Clock size={48} />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                            <Clock size={10} className="text-amber-400" /> Arrival
                          </p>
                          <p className="text-sm font-bold text-stone-200 truncate">
                            {(() => {
                              const timeVal = result.scheduledTime || result.bookingDetails!.scheduledTime;
                              return timeVal === 'Now' || !timeVal
                                ? 'Immediate Arrival'
                                : isNaN(new Date(timeVal).getTime())
                                  ? timeVal
                                  : new Date(timeVal).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </p>
                          <p className="text-[9px] text-stone-500 mt-1 font-medium tracking-wide uppercase">
                            {(() => {
                              const timeVal = result.scheduledTime || result.bookingDetails!.scheduledTime;
                              if (timeVal === 'Now' || !timeVal) return 'En Route Now';
                              if (isNaN(new Date(timeVal).getTime())) return 'Scheduled Slot';
                              return new Date(timeVal).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
                            })()}
                          </p>
                        </div>

                        {/* 4. Estimated Price Box */}
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:bg-white/[0.08] transition-all duration-300 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform text-emerald-400">
                            <Zap size={48} />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
                            <Zap size={10} className="text-emerald-400" /> Hourly Rate
                          </p>
                          <p className="text-lg font-bold text-emerald-400">PKR {result.bookingDetails!.pricePerHour || result.bookingDetails!.totalCostPkr || 2000}<span className="text-[10px] text-stone-500 font-normal">/hr</span></p>
                          <p className="text-[9px] text-stone-500 mt-2 font-medium tracking-wide uppercase">Secure Cash Payment</p>
                        </div>
                      </motion.div>
                    )}

                    {/* View Agent Execution Steps Action Button */}
                    <motion.div variants={STAGGER_ITEM} className="w-full">
                      <button
                        onClick={async () => {
                          void triggerHaptic('medium');
                          await handleOpenTraceDrawer();
                        }}
                        className="w-full py-4.5 px-6 bg-gradient-to-r from-accent to-amber-600 hover:from-accent hover:to-amber-500 text-stone-950 font-bold rounded-2.5xl flex items-center justify-center gap-3 shadow-[0_8px_32px_rgba(202,138,4,0.25),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_12px_40px_rgba(202,138,4,0.35)] transition-all duration-300 active:scale-[0.98] cursor-pointer"
                      >
                        <Cpu className="w-5 h-5 animate-pulse" />
                        <span className="text-sm tracking-wide uppercase font-black">View Agent Workflow Logs</span>
                        <ChevronLeft size={16} className="rotate-180 ml-1" />
                      </button>
                    </motion.div>

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
                      <motion.div variants={STAGGER_ITEM} className="bg-white/5 backdrop-blur-3xl border border-emerald-500/20 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:bg-white/[0.06] transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-105 transition-transform text-emerald-400">
                          <BarChart3 size={60} />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold mb-4 flex items-center gap-2">
                          <BarChart3 size={14} /> Ranking Engine Scorecard
                        </h3>
                        <p className="text-stone-400 text-xs mb-4 leading-relaxed font-light">
                          {result.rankingReasoning}
                        </p>

                        {/* Comparative Grid */}
                        {result.providers && result.providers.length > 0 ? (
                          <div className="space-y-3 mt-4">
                            {result.providers.slice(0, 3).map((prov: RankedProvider, index: number) => {
                              const isWinner = index === 0;
                              return (
                                <div
                                  key={prov.id || index}
                                  className={`p-4 rounded-2xl border transition-all ${isWinner
                                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_0_15px_rgba(16,185,129,0.08)]'
                                      : 'bg-white/[0.02] border-white/5'
                                    } flex items-center justify-between gap-4`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className={`text-sm font-semibold truncate ${isWinner ? 'text-emerald-300' : 'text-stone-300'}`}>
                                        {prov.name}
                                      </p>
                                      {isWinner ? (
                                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-stone-950 rounded-full select-none shadow-md">
                                          Top Pick
                                        </span>
                                      ) : index === 1 ? (
                                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-white/10 text-stone-400 rounded-full select-none">
                                          Runner Up
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-500 font-medium">
                                      <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" /> {prov.rating || 4.5} ★</span>
                                      <span>📍 {prov.distanceKm ? prov.distanceKm.toFixed(1) : 2.5} km away</span>
                                      <span>💰 PKR {prov.hourly_rate_pkr || 2000}/hr</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${isWinner ? 'text-emerald-400' : 'text-stone-500'}`}>Overall Score</p>
                                    <p className={`text-lg font-black tracking-tight ${isWinner ? 'text-emerald-300' : 'text-stone-400'}`}>
                                      {prov.totalScore ? prov.totalScore.toFixed(1) : (10 - index * 1.5).toFixed(1)}<span className="text-[10px] text-stone-500 font-normal">/10</span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Mock fallback comparison card for historical listings
                          <div className="space-y-3 mt-4">
                            <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_0_15px_rgba(16,185,129,0.08)] flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold truncate text-emerald-300">
                                    {result.bookingDetails?.providerName || 'Selected Specialist'}
                                  </p>
                                  <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-stone-950 rounded-full select-none">
                                    Top Pick
                                  </span>
                                </div>
                                <div className="flex gap-3 text-[10px] text-stone-500 font-medium">
                                  <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" /> 4.8 ★</span>
                                  <span>📍 Nearest Proximity</span>
                                  <span>💰 PKR {result.bookingDetails?.pricePerHour || 2000}/hr</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Overall Score</p>
                                <p className="text-lg font-black tracking-tight text-emerald-300">9.4<span className="text-[10px] text-stone-500 font-normal">/10</span></p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Itemized Invoice & Pricing Transparency Card */}
                    {result.bookingDetails && (
                      <motion.div variants={STAGGER_ITEM} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:bg-white/[0.06] transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-105 transition-transform text-emerald-400">
                          <ReceiptText size={60} />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold mb-4 flex items-center gap-2">
                          <ReceiptText size={14} /> Itemized Cost Breakdown
                        </h3>

                        {/* Breakdown lines */}
                        <div className="space-y-3 font-sans text-xs text-stone-400">
                          <div className="flex justify-between items-center">
                            <span>Base Service Fee (1 Hour)</span>
                            <span className="font-semibold text-stone-200">PKR {result.bookingDetails.pricePerHour || 2000}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>Geospatial Travel & Fuel Allowance</span>
                            <span className="font-semibold text-stone-200">
                              PKR {(() => {
                                const distance = result.providers?.[0]?.distanceKm || 4.2;
                                return Math.round(distance * 50);
                              })()}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>Priority Dispatch Surcharge ({result.scheduledTime === 'Now' || !result.scheduledTime ? 'Emergency' : 'High Priority'})</span>
                            <span className="font-semibold text-stone-200">
                              PKR {result.bookingDetails.pricePerHour && result.bookingDetails.pricePerHour > 2200 ? 500 : 300}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pb-3 border-b border-white/5">
                            <span>Reminders & Scheduling Platform Fee</span>
                            <span className="font-semibold text-stone-200">PKR 150</span>
                          </div>

                          <div className="flex justify-between items-center pt-1 text-sm font-bold text-stone-100">
                            <span className="text-emerald-400 uppercase tracking-widest text-[10px]">Total Cash Invoice</span>
                            <span className="text-emerald-400 text-base font-black">
                              PKR {(() => {
                                const base = result.bookingDetails.pricePerHour || 2000;
                                const distance = result.providers?.[0]?.distanceKm || 4.2;
                                const travel = Math.round(distance * 50);
                                const surcharge = base > 2200 ? 500 : 300;
                                return base + travel + surcharge + 150;
                              })()}
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-stone-500 font-medium uppercase tracking-wider mt-4 text-center">Cash-on-Delivery Payment directly to specialist upon arrival</p>
                      </motion.div>
                    )}

                    {/* Agent Insight Card */}
                    {result.insight && (
                      <motion.div variants={STAGGER_ITEM} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:bg-white/[0.06] transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-accent to-amber-600" />
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-105 transition-transform text-accent">
                          <Cpu size={60} />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-4 flex items-center gap-2">
                          <Cpu size={14} className="animate-pulse" /> Supervisor Insight
                        </h3>
                        <div className="relative">
                          <span className="text-3xl font-serif text-accent/20 absolute -top-4 -left-2 select-none">“</span>
                          <p className="text-stone-300 leading-relaxed text-sm font-sans italic pl-5 pr-2 relative z-10">
                            {result.insight}
                          </p>
                          <span className="text-3xl font-serif text-accent/20 absolute -bottom-6 right-0 select-none">”</span>
                        </div>
                      </motion.div>
                    )}

                    {/* Metrics Grid */}
                    <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-2">Latency</p>
                        <p className="text-2xl font-light text-foreground">{result.metrics.latencyMs} <span className="text-sm font-normal text-stone-600">ms</span></p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-3">Actions Taken</p>
                        <div className="flex -space-x-3">
                          {result.actionChainExecuted.map((_: unknown, i: number) => (
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
              <form onSubmit={handleRunAgent} className="w-full bg-stone-900/30 backdrop-blur-[32px] saturate-[180%] border border-white/[0.08] text-white placeholder-stone-500 rounded-3xl pl-5 pr-2.5 py-[9px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] focus-within:ring-1 focus-within:ring-accent/40 focus-within:border-accent/40 transition-all flex items-center min-h-[58px] group">
                <div className="flex-shrink-0 mr-3.5 flex items-center justify-center pointer-events-none">
                  <MapPin size={18} className="text-accent/60" />
                </div>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || !locationAccessGranted}
                  placeholder={locationAccessGranted ? "Type your request here..." : "Enable location to continue"}
                  className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white placeholder-stone-500 font-sans tracking-tight resize-none overflow-hidden max-h-[120px] leading-[20px] py-[10px] pr-2 disabled:opacity-50"
                />
                <div className="flex-shrink-0 ml-2 flex items-center justify-center">
                  {locationAccessGranted ? (
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.85 }}
                      disabled={loading || !userInput.trim()}
                      className="w-[40px] h-[40px] bg-accent hover:bg-accent/90 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 rounded-2xl flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(202,138,4,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] disabled:shadow-none"
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
                      className="h-[40px] px-4 bg-accent/15 border border-accent/40 text-accent rounded-2xl text-xs font-semibold tracking-wide hover:bg-accent/20 transition-colors"
                    >
                      Allow
                    </button>
                  )}
                </div>
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

      {/* Agent Trace Drawer */}
      <AnimatePresence>
        {showTraceDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTraceDrawer(false)}
              className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.28 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] z-[111] bg-stone-950 border-t border-white/10 rounded-t-[3rem] p-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col shadow-[0_-15px_40px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Decorative Drawer handle pill */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 flex-shrink-0" />

              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-serif text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-accent animate-pulse" /> Agent Trace Logs
                  </h2>
                  <p className="text-[10px] uppercase tracking-wider text-stone-500 mt-1 font-bold">Multi-agent execution workflow</p>
                </div>
                <button
                  onClick={() => setShowTraceDrawer(false)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <XCircle size={18} className="text-white/40" />
                </button>
              </div>

              {/* Scrollable Timeline Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {drawerLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border border-white/5" />
                      <div className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                    </div>
                    <p className="text-xs text-stone-500 tracking-wider uppercase font-bold">Retrieving agent sequence...</p>
                  </div>
                ) : drawerError ? (
                  <div className="text-center py-16 text-red-400 bg-red-500/5 border border-red-500/10 rounded-3xl p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider">Load Error</p>
                    <p className="text-xs text-stone-400 mt-2">{drawerError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {drawerTraces.map((trace, i) => (
                      <AgentTraceCard
                        key={`${trace.step}-${i}`}
                        trace={trace}
                        isLast={i === drawerTraces.length - 1}
                        isActive={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
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



