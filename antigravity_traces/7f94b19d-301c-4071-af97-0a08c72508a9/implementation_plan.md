# Finalizing the AI Service Orchestrator

This plan addresses the final two requirements from the `challenge.md` rubric: extracting the simulated booking data to the UI, and simulating the follow-up automation.

## User Review Required

Please review the proposed changes below. Once you approve, I will execute them, and you will be ready to record your demo!

## Proposed Changes

### Backend Enhancements

#### [MODIFY] src/app/api/orchestrate/route.ts
We need to extract the actual result of the `book_service_provider` tool call so the frontend can display the simulated receipt.
*   Update the `Response.json` payload at the end of the file.
*   Add a `bookingDetails` field that searches through `result.steps` and extracts the `toolResults` for `book_service_provider`.

### Frontend Enhancements

#### [MODIFY] src/app/page.tsx
We will update the UI to dynamically show the booking information and simulate the passage of time for the follow-up requirement.
*   **Booking Receipt Card:** If `result.bookingDetails` exists, display a new card showing the `confirmationCode`, Provider Name, and a simulated cost.
*   **Status Timeline Simulation:** Implement a `useEffect` hook that triggers when a booking is confirmed. It will use timeouts to simulate the status changing automatically:
    *   `Confirmed` (0s)
    *   `Provider En Route` (3s)
    *   `Service Completed` (6s)
    *   `Follow-up Reminder Sent` (9s)
*   **Dynamic Status Display:** Replace the hardcoded "Provider Dispatched" text on the map card with the dynamic state from the timeline simulation.

## Verification Plan

### Automated Tests
*   Ensure Next.js compiles without TypeScript errors after modifications.

### Manual Verification
*   We will run a test query (e.g., "Need an AC technician in G-13").
*   Verify that the backend successfully returns `bookingDetails`.
*   Verify that the UI displays the booking receipt.
*   Watch the UI to ensure the status dynamically updates over ~10 seconds to simulate the full lifecycle and follow-up.
