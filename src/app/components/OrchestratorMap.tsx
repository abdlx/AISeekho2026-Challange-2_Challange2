'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

interface OrchestratorMapProps {
  userLocation?: string;       // "lat, lng" — the customer
  providerLocation?: string;   // "lat, lng" — the service provider
  providerName?: string;       // Display name for the provider marker
  bookingConfirmed?: boolean;
}

// Generate a stable color from a string (for provider avatar backgrounds)
function stringToColor(str: string): string {
  const palette = ['#ca8a04', '#16a34a', '#2563eb', '#9333ea', '#0891b2', '#dc2626'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

// Singleton to avoid re-initializing loader
let loaderInitialized = false;

export default function OrchestratorMap({
  userLocation = '33.6844, 73.0479',
  providerLocation,
  providerName = 'Provider',
  bookingConfirmed = false,
}: OrchestratorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const providerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const fallbackPolylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load Maps SDK once
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(({ mapsApiKey }) => {
        if (!mapsApiKey) { setMapError('Maps API key not configured.'); return; }
        if (!loaderInitialized) {
          setOptions({ key: mapsApiKey, v: 'weekly' });
          loaderInitialized = true;
        }
        Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('routes'),
          importLibrary('geometry')
        ]).then(() => setMapReady(true)).catch(() => setMapError('Failed to load Google Maps.'));
      })
      .catch(() => setMapError('Failed to load config.'));
  }, []);

  // Initialize map and markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const [uLat, uLng] = userLocation.replace(/\s/g, '').split(',').map(Number);
    if (isNaN(uLat) || isNaN(uLng)) return;
    const userLatLng = { lat: uLat, lng: uLng };

    // Calculate center between user and provider
    let center = userLatLng;
    let zoom = 14;
    let providerLatLng: google.maps.LatLngLiteral | null = null;

    if (providerLocation) {
      const [pLat, pLng] = providerLocation.replace(/\s/g, '').split(',').map(Number);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        providerLatLng = { lat: pLat, lng: pLng };
        center = { lat: (uLat + pLat) / 2, lng: (uLng + pLng) / 2 };
        zoom = 12;
      }
    }

    // Create or update map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapId: 'antigravity_live_map',
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        // styles removed: A Map's styles property cannot be set when a mapId is present
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    }

    // Clear previous overlays
    if (userMarkerRef.current) userMarkerRef.current.map = null;
    if (providerMarkerRef.current) providerMarkerRef.current.map = null;
    directionsRendererRef.current?.setMap(null);
    fallbackPolylineRef.current?.setMap(null);

    // ─── USER MARKER ─────────────────────────────────────────────────
    const userEl = document.createElement('div');
    userEl.style.cssText = 'position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;';
    userEl.innerHTML = `
      <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(59,130,246,0.12);animation:uPulse 2s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:-3px;border-radius:50%;background:rgba(59,130,246,0.2);animation:uPulse 2s ease-in-out infinite 0.4s;"></div>
      <div style="width:22px;height:22px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:50%;border:3px solid white;box-shadow:0 0 16px rgba(59,130,246,0.9),0 4px 12px rgba(0,0,0,0.6);z-index:2;flex-shrink:0;"></div>
    `;

    const map = mapInstanceRef.current;

    userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      position: userLatLng,
      map,
      title: 'Your Location',
      content: userEl,
      zIndex: 10,
    });

    // ─── PROVIDER MARKER ─────────────────────────────────────────────
    if (providerLatLng) {
      const initials = getInitials(providerName);
      const avatarColor = stringToColor(providerName);

      const provEl = document.createElement('div');
      provEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.65));cursor:pointer;';
      provEl.innerHTML = `
        <div style="background:linear-gradient(145deg,#1c1917,#292524);border:2px solid #ca8a04;border-radius:18px;padding:8px 14px;display:flex;align-items:center;gap:10px;white-space:nowrap;box-shadow:0 0 20px rgba(202,138,4,0.35),0 4px 16px rgba(0,0,0,0.55);min-width:130px;max-width:190px;">
          <div style="width:34px;height:34px;background:${avatarColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:white;flex-shrink:0;border:2px solid rgba(255,255,255,0.2);font-family:system-ui,sans-serif;">${initials}</div>
          <div style="overflow:hidden;">
            <div style="font-size:8px;color:#ca8a04;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;font-family:system-ui,sans-serif;margin-bottom:1px;">Provider</div>
            <div style="font-size:11px;color:#f3f4f6;font-weight:600;font-family:system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;max-width:120px;">${providerName}</div>
          </div>
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #ca8a04;margin-top:-1px;"></div>
      `;

      providerMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: providerLatLng,
        map,
        title: providerName,
        content: provEl,
        zIndex: 20,
      });

      // ─── ROUTE ───────────────────────────────────────────────────────
      if (bookingConfirmed) {
        fetch('/api/config').then((r) => r.json()).then(({ mapsApiKey: apiKey }) => {
          fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'routes.polyline.encodedPolyline'
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: providerLatLng.lat, longitude: providerLatLng.lng } } },
              destination: { location: { latLng: { latitude: userLatLng.lat, longitude: userLatLng.lng } } },
              travelMode: 'DRIVE'
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0 && data.routes[0].polyline?.encodedPolyline) {
              const decodedPath = google.maps.geometry.encoding.decodePath(data.routes[0].polyline.encodedPolyline);
              
              const poly = new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: '#ca8a04',
                strokeOpacity: 0.85,
                strokeWeight: 4,
                icons: [{
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                    scale: 2.5,
                    strokeColor: '#fbbf24',
                    strokeWeight: 2,
                    fillColor: '#fbbf24',
                    fillOpacity: 1,
                  },
                  offset: '100%',
                  repeat: '55px',
                }],
                map,
              });
              fallbackPolylineRef.current = poly;

              const bounds = new google.maps.LatLngBounds();
              decodedPath.forEach(point => bounds.extend(point));
              map.fitBounds(bounds, { top: 70, bottom: 70, left: 50, right: 50 });
            } else {
              throw new Error(data.error?.message || 'No route found in response');
            }
          })
          .catch(err => {
            console.warn('[Map] Routes API failed, using fallback polyline:', err);
            const poly = new google.maps.Polyline({
              path: [providerLatLng!, userLatLng],
              geodesic: true,
              strokeColor: '#ca8a04',
              strokeOpacity: 0.85,
              strokeWeight: 4,
              map,
            });
            fallbackPolylineRef.current = poly;
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(userLatLng);
            bounds.extend(providerLatLng!);
            map.fitBounds(bounds, { top: 70, bottom: 70, left: 50, right: 50 });
          });
        });
      } else {
        // No route yet, just fit both markers
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(userLatLng);
        bounds.extend(providerLatLng);
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 60, right: 60 });
      }
    }
  }, [mapReady, userLocation, providerLocation, providerName, bookingConfirmed]);

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-950 text-stone-500 text-sm px-4 text-center">
        {mapError}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden bg-stone-950 relative">
      {/* Inline keyframes for the user location pulse */}
      <style>{`
        @keyframes uPulse {
          0%,100% { transform: scale(0.85); opacity: 0.9; }
          50% { transform: scale(1.25); opacity: 0.25; }
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950">
          <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
