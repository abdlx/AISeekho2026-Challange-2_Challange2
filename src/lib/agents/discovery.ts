import { createAdminClient } from '../supabase-server';
import { withRetry } from '../utils/retry';

/**
 * DISCOVERY AGENT
 * Specializes in matching service requests with the CLOSEST available providers.
 */
export async function discoveryAgent(serviceType: string, userLat: number, userLng: number) {
  try {
    console.log(`--- [DISCOVERY AGENT] Searching for ${serviceType} near ${userLat}, ${userLng} ---`);
    
    const adminClient = createAdminClient();
    const { data, error } = await withRetry(async () => {
      const result = await adminClient
        .from('service_providers')
        .select('*')
        .ilike('service_type', `%${serviceType}%`)
        .eq('is_available', true);
      
      if (result.error) throw new Error(`Discovery Agent Error: ${result.error.message}`);
      return result;
    });

    // Calculate distance for each provider and sort by proximity
    const providersWithDistance = (data || []).map(provider => {
      const [pLat, pLng] = provider.location.split(',').map(Number);
      const distance = calculateDistance(userLat, userLng, pLat, pLng);
      return { ...provider, distanceKm: distance };
    });

    // Sort by distance and filter out anyone further than 50km (unless it's a specialty service)
    const sortedProviders = providersWithDistance
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .filter(p => p.distanceKm < 50);

    return { success: true, data: sortedProviders };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred in Discovery Agent' };
  }
}

/**
 * Haversine Formula for Distance Calculation
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
