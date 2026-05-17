import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * LINGUISTIC AGENT
 * Specializes in extracting structured intent from multilingual (Urdu/English) user input.
 */
export async function linguisticAgent(userInput: string) {
  console.log('--- [LINGUISTIC AGENT] Parsing user input ---');

  try {
    const result = await generateObject({
      model: openrouter('google/gemini-3.1-flash-lite-preview'), // Corrected to preview ID // Upgraded to Gemini 3 Flash
      schema: z.object({
        intent: z.string().describe('The primary goal (e.g., Book Plumber)'),
        serviceType: z.string().describe('The type of service requested'),
        locationName: z.string().nullable().describe('Specific location mentioned in text'),
        urgency: z.enum(['low', 'medium', 'high', 'emergency']),
        scheduledTime: z.string().nullable().describe('Requested time/date in ISO format or natural language (e.g. "tomorrow morning", "2026-05-16T09:00", "kal subah 10 baje"). Null if not mentioned.'),
        priority: z.enum(['cheapest', 'fastest', 'nearest', 'balanced'])
          .default('balanced')
          .describe('User preference priority detected from input'),
      }),
      system: `You are a Linguistic Specialist. Extract structured data from service requests in Urdu, Roman Urdu, or English. Pay special attention to time phrases (e.g., "kal subah", "abhi", "3 baje") and locations.
      
Determine the user's preference priority based on the following triggers:
- "budget nahi hai", "sasta", "mehenga nahi", "budget mein", "zayada nahi hai", "kam paise", "affordable" -> cheapest
- "jaldi", "urgent", "abhi", "emergency", "jitna jaldi" -> fastest
- "paas", "nearest", "qareeb", "nazdik" -> nearest
- No clear preference -> balanced`,
      prompt: userInput,
    });

    return { success: true, data: result.object };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error in Linguistic Agent';
    return { success: false, error: msg };
  }
}
