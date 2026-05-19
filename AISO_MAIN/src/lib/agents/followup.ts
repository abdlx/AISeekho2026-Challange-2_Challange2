import { createAdminClient } from '@/lib/supabase-server';

export async function followupAgent(bookingId: string, scheduledTime: string, providerName: string) {
  try {
    const adminClient = createAdminClient();
    const appointmentTime = new Date(scheduledTime);
    
    const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000); // 1 hour before
    const statusUpdateTime = new Date(appointmentTime.getTime()); // at scheduled time
    const completionCheckTime = new Date(appointmentTime.getTime() + 60 * 60 * 1000); // 1 hour after

    const { data, error } = await adminClient
      .from('service_followups')
      .insert({
        booking_id: bookingId,
        reminder_time: reminderTime.toISOString(),
        status: 'scheduled',
        message: `Reminder: Your ${providerName} appointment is in 1 hour.`,
      })
      .select()
      .single();

    if (error) {
       return { success: false, error: `Follow-up Agent Error: ${error.message}` };
    }

    return {
      success: true,
      status: 'scheduled',
      reminderTime: reminderTime.toISOString(),
      statusUpdateTime: statusUpdateTime.toISOString(),
      completionCheckTime: completionCheckTime.toISOString(),
      message: `Reminder scheduled for ${reminderTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error during follow-up scheduling' };
  }
}
