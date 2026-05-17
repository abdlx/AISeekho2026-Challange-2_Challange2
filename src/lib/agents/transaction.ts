import { createAdminClient } from '@/lib/supabase-server';

export async function transactionAgent(
  providerId: string,
  providerName: string,
  estimatedCost: number,
  userLocation: string,
  serviceType: string,
  scheduledTimeStr: string | null,
  userId: string | null
) {
  if (!providerId || !providerName) {
    return { success: false, error: 'Provider data incomplete' };
  }

  try {
    const adminClient = createAdminClient();
    
    let finalTime = new Date();
    if (scheduledTimeStr) {
      const parsedDate = new Date(scheduledTimeStr);
      if (!isNaN(parsedDate.getTime())) {
        finalTime = parsedDate;
      }
    }

    const { data, error } = await adminClient
      .from('service_bookings')
      .insert({
        provider_id: providerId,
        customer_location: userLocation,
        scheduled_time: finalTime.toISOString(),
        total_cost_pkr: estimatedCost,
        status: 'confirmed',
        service_type: serviceType,
        user_id: userId
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: `Booking Error: ${error.message}` };
    }
    
    return {
      success: true,
      status: 'success',
      confirmationCode: `BK-${Math.floor(Math.random() * 10000)}`,
      provider: providerName,
      message: `Booking confirmed for ${providerName}.`,
      bookingId: data.id,
      scheduledTime: finalTime.toISOString()
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error during transaction';
    return { success: false, error: msg };
  }
}
