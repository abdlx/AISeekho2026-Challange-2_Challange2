import { getShippingETA } from '@/lib/google-maps';
import { withRetry } from '../utils/retry';

export async function logisticsAgent(address: string) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      // Simulate geocoding if no key is provided
      return { success: true, location: '33.6844, 73.0479' };
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const resp = await withRetry(() => fetch(url));
    const data = await resp.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return { success: true, location: `${loc.lat}, ${loc.lng}` };
    }
    return { success: false, error: `Geocode failed with status: ${data.status}` };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error during geocoding' };
  }
}

export async function calculateTravelAgent(providerLocation: string, customerLocation: string) {
  try {
    const eta = await getShippingETA(providerLocation, customerLocation);
    return { success: true, eta };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error during travel calculation' };
  }
}
