export async function getShippingETA(origin: string, destination: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    console.warn("Google Maps API key is missing. Using simulated data.");
    // Return simulated data if no real API key is provided
    return { distance_km: 15, eta_hours: 0.5, traffic_condition: 'moderate' };
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}&departure_time=now`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceKm = element.distance.value / 1000;
      const durationHours = element.duration_in_traffic ? element.duration_in_traffic.value / 3600 : element.duration.value / 3600;
      
      let trafficCondition = 'normal';
      if (element.duration_in_traffic && element.duration_in_traffic.value > element.duration.value * 1.2) {
        trafficCondition = 'heavy';
      }

      return {
        distance_km: parseFloat(distanceKm.toFixed(2)),
        eta_hours: parseFloat(durationHours.toFixed(2)),
        traffic_condition: trafficCondition
      };
    } else {
      throw new Error(`Distance Matrix API Error: ${data.error_message || data.status}`);
    }
  } catch (error: any) {
    console.error("Google Maps API error:", error);
    throw new Error(`Failed to calculate shipping ETA: ${error.message}`);
  }
}

export async function findNearbySuppliers(location: string, radiusMeters: number, keyword: string = 'supplier') {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    // Return simulated data if no key
    return [
      { name: "Simulated Supplier A", address: "123 Test St", rating: 4.5, lat: 33.7, lng: 73.0 },
      { name: "Simulated Supplier B", address: "456 Mock Ave", rating: 3.8, lat: 33.68, lng: 73.1 }
    ];
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(location)}&radius=${radiusMeters}&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return (data.results || []).map((place: any) => ({
        name: place.name,
        address: place.vicinity,
        placeId: place.place_id,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating || null
      }));
    } else {
      throw new Error(`Places API Error: ${data.error_message || data.status}`);
    }
  } catch (error: any) {
    console.error("Google Places API error:", error);
    throw new Error(`Failed to find nearby suppliers: ${error.message}`);
  }
}
