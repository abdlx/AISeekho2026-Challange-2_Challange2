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
