# Implementation Plan - Booking Page Redesign & Agent Trace Timeline Drawer

This plan details the design and implementation steps to enhance the **Booking Details** screen for the AISO Capacitor app. It transitions the page from text paragraphs and single-card structures to a premium, grid-based dashboard of modern glassmorphic status boxes, and adds a dedicated button/interactive bottom drawer displaying the exact multi-agent workflow steps.

---

## User Review Required

> [!NOTE]
> **No Schema Migrations Required:** To support displaying agent steps for historical bookings, we've designed a smart query mechanism in the Traces API. Instead of altering existing tables in Supabase, we search the `agent_traces` table for the matching booking ID within the `book_provider` tool payload. This ensures full backward compatibility with zero risk of database lockups or deployment errors.

---

## Open Questions

> [!IMPORTANT]
> Let me know if you would like the bottom drawer of agent traces to have different styling (e.g. glassmorphism overlay versus solid deep-tech dark mode). By default, we will style it as a semi-transparent liquid-blur drawer that perfectly matches your premium Karachi cosmic theme!

---

## Proposed Changes

### Traces API Component
We will extend the traces endpoint to retrieve agent history using a `bookingId` in addition to a `sessionId`.

#### [MODIFY] [route.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/app/api/traces/route.ts)
- Modify the `GET` handler to accept a `bookingId` query parameter.
- If `bookingId` is provided:
  - Query rows in `agent_traces` where `tool_name = 'book_provider'`.
  - Filter these rows in JS to find the trace where `payload.toolResults[0].result.bookingId === bookingId`.
  - Extract the matching `session_id`.
  - Retrieve all execution steps corresponding to that `session_id` sorted chronologically.
- Return the trace list to the client.

---

### Frontend UI & UX Component
We will transform the result details page to be highly visual, structured as a modular dashboard, and introduce the agent trace log action.

#### [MODIFY] [page.tsx](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/app/page.tsx)

1. **Grid-Based Booking Info Boxes (Replacing the receipt ticket card):**
   - Replace the single `ticket-card` structure with a beautifully structured 2x2 grid of modern, tactile status boxes:
     - **Confirmation Code Box** (Violet accent border with a key/ticket icon, monospaced typography, and a 1-tap copy button)
     - **Provider Info Box** (Sky accent border with a profile/user icon, showing provider name and a premium golden rating pill e.g., `4.8 ★`)
     - **Scheduled Arrival Box** (Amber accent border with a clock/calendar icon, showing arrival window or schedule time)
     - **Estimated Price Box** (Emerald accent border with a price tag/wallet icon, displaying the PKR hourly rate)

2. **Refined Narrative Layouts:**
   - Group the **Selection Reasoning** and **Agent Insights** text blocks into highly visual thought cards with tailored left highlights (rather than raw paragraph blocks).
   - Format paragraphs of text using bullet points and curated spacing to maximize scannability.

3. **Multi-Agent Workflow steps button:**
   - Add a high-contrast button labeled **"View Agent Trace Log"** or **"Show Agent Steps"** with a custom CPU/Activity pulsing icon.
   - Position this button prominently on the result screen (e.g., right under the map and status tracker).

4. **Interactive Bottom Drawer / Workflow Timeline Overlay:**
   - Create a state variable `showTraceDrawer` to manage drawer visibility.
   - Design a premium glassmorphic bottom drawer (`fixed inset-x-0 bottom-0 z-50 rounded-t-[3rem] border-t backdrop-blur-3xl`) with smooth Framer Motion spring physics.
   - Inside the drawer:
     - Show a timeline layout featuring the beautiful `AgentTraceCard` component already present in the codebase.
     - If viewing a past booking, trigger a clean loading state (orbital spinner) and fetch traces from `/api/traces?bookingId=...`.
     - Support native system back button integration (handled via Capacitor app listener) so clicking the system back button smoothly closes the drawer first.

---

## Verification Plan

### Automated Tests
- Build and compile the Next.js application using `npm run build` to verify there are no TypeScript or bundling errors.

### Manual Verification
- Deploy to localhost and run the orchestrator with an example prompt.
- Confirm that the booking page renders the **2x2 grid of separate glassmorphic cards** instead of the legacy paragraphs.
- Click the **"Show Agent Steps"** button and verify that the bottom drawer slides up smoothly with the agent timeline.
- Open **Past Orders** from navigation, click **Open Full Trace & Map** on a historical order, and verify that the drawer fetches and displays historical agent traces correctly.
