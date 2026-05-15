import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * LINGUISTIC AGENT
 * Specializes in extracting structured intent from multilingual (Urdu/English) user input.
 */
export async function linguisticAgent(userInput: string) {
  console.log('--- [LINGUISTIC AGENT] Parsing user input ---');
  
  const result = await generateObject({
    model: google('gemini-3-flash-preview'), // Corrected to preview ID // Upgraded to Gemini 3 Flash
    schema: z.object({
      intent: z.string().describe('The primary goal (e.g., Book Plumber)'),
      serviceType: z.string().describe('The type of service requested'),
      locationName: z.string().nullable().describe('Specific location mentioned in text'),
      urgency: z.enum(['low', 'medium', 'high', 'emergency']),
    }),
    system: 'You are a Linguistic Specialist. Extract structured data from service requests in Urdu, Roman Urdu, or English.',
    prompt: userInput,
  });

  return result.object;
}
