'use client';

import { useEffect, useRef } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

interface Supplier {
  id: string;
  name: string;
  location: string;
}

interface OrchestratorMapProps {
  warehouseLocation?: string;
  suppliers?: Supplier[];
  selectedSupplierId?: string | null;
}

export default function OrchestratorMap({
  warehouseLocation = '33.6938,73.0652',
  suppliers = [],
  selectedSupplierId = null,
}: OrchestratorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        console.warn("Maps API key not found or still using placeholder.");
        return;
      }

      setOptions({
        key: apiKey,
        v: 'weekly',
      });

      const { Map } = await importLibrary('maps');
      const { AdvancedMarkerElement } = await importLibrary('marker');

      const [whLat, whLng] = warehouseLocation.split(',').map(Number);
      const center = { lat: whLat, lng: whLng };

      if (!mapRef.current) return;

      const map = new Map(mapRef.current, {
        center,
        zoom: 11,
        mapId: 'DEMO_MAP_ID', 
        disableDefaultUI: true,
      });

      mapInstanceRef.current = map;

      // Add Warehouse Marker
      new AdvancedMarkerElement({
        position: center,
        map,
        title: 'Your Location (G-13)',
      });

      // Add Supplier Markers
      suppliers.forEach((sup) => {
        const [lat, lng] = sup.location.split(',').map(Number);
        const isSelected = sup.id === selectedSupplierId;
        
        const marker = new AdvancedMarkerElement({
          position: { lat, lng },
          map,
          title: sup.name,
        });
        
        // If selected, draw line
        if (isSelected) {
          if (polylineRef.current) polylineRef.current.setMap(null);
          polylineRef.current = new google.maps.Polyline({
            path: [center, { lat, lng }],
            geodesic: true,
            strokeColor: '#ca8a04', // Gold
            strokeOpacity: 0.8,
            strokeWeight: 4,
          });
          polylineRef.current.setMap(map);
        }
      });
    };

    initMap();
  }, [warehouseLocation, suppliers, selectedSupplierId]);

  return (
    <div className="w-full h-full overflow-hidden bg-stone-950">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
