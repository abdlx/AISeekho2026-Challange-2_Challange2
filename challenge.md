# Challenge 2: AI Service Orchestrator for Informal Economy

## Challenge Overview
The informal economy—including plumbers, electricians, tutors, beauticians, and home service providers—operates largely through:
- WhatsApp messages
- Phone calls
- Informal referrals

This results in:
- Inefficient service matching
- Missed opportunities
- Lack of automation
- Poor user experience

At the same time, users struggle to find:
- Reliable services quickly
- Availability in real time
- Trusted providers nearby

## Problem Statement
Build an **Agentic AI System** that automates the end-to-end lifecycle of a service request—from user intent to booking and follow-up.

### Your system must:
1. **Understand** user service requests (in natural language).
2. **Identify** relevant providers using location/context.
3. **Select or recommend** the best provider.
4. **Simulate** booking and confirmation.
5. **Handle** follow-up interactions.
6. **Show** complete reasoning and workflow execution.

> [!IMPORTANT]
> **Mandatory Requirement: Google Antigravity**
> Teams MUST use Google Antigravity as the core platform to:
> - Orchestrate agent workflows
> - Manage multi-step reasoning
> - Integrate tools (Maps, Search, APIs)
> - Execute actions (booking, notifications, etc.)
> 
> Use of external LLMs is allowed, but **Antigravity must be central** to system logic and orchestration.

---

## Example User Scenario
**User input (Roman Urdu / Urdu / English):**
> “Mujhe kal subah G-13 mein AC technician chahiye”

### Expected Output
- **Service Request:** AC Technician
- **Location:** G-13
- **Time:** Tomorrow morning
- **Recommended Provider:** Ali AC Services (2.1 km away)
- **Reasoning:** Closest available provider with high rating
- **Simulated Booking:**
    - Slot booked: 10:00 AM
    - Confirmation sent
- **Follow-up:** Reminder scheduled 1 hour before appointment

---

## System Requirements

### 1. Intent Understanding
- Process natural language input
- **Support:** Urdu, Roman Urdu, English
- **Extract:** Service type, Location, Time

### 2. Provider Discovery
- **Use:** Mock dataset OR Google Maps / Places APIs
- **Identify:** Nearby providers, Service category match

### 3. Matching & Ranking
- **Rank providers based on:**
    - Distance
    - Availability
    - Rating (simulated or real)
- Provide clear reasoning for selection

### 4. Decision & Recommendation
- Select best provider OR show top options
- Explain decision in simple terms

### 5. Action Simulation (CRITICAL REQUIREMENT)
> [!NOTE]
> System must simulate: booking confirmation, provider assignment, and scheduling.

**Simulation can include:**
- Updating a mock booking system
- Creating a confirmation message
- Writing to a database/spreadsheet
- Generating a booking receipt

### 6. Follow-Up Automation
- **Simulate:** Reminders, Status updates, Completion confirmation

### 7. Agentic Workflow (MANDATORY)
System must demonstrate:
- Multiple agents OR structured reasoning pipeline
- Planning → Decision → Action → Follow-up
- **Traceable logs of:** Decisions, Tool usage, Action execution

---

## Deliverables
1. **Working Prototype:** Mobile App (**MUST**) and Web App (Optional)
2. **Demo Video (3–5 minutes):** Must clearly show user input, system understanding, provider matching, booking simulation, and follow-up workflow.
3. **Agent Trace / Logs:** Reasoning steps, Agent interactions, Action execution logs.
4. **Documentation (README):** System architecture, how Antigravity is used, APIs/tools used, assumptions, and limitations.

---

## Evaluation Criteria

| Criteria | Weight | Description |
| :--- | :---: | :--- |
| **Use of Google Antigravity** | 25% | Core orchestration via Antigravity, effective use of tools (Maps, APIs), planning + execution. |
| **Agentic Reasoning & Workflow** | 20% | Multi-step reasoning, logical flow from request → decision → action, evidence of autonomy. |
| **Matching Quality & Decision Logic** | 20% | Relevant provider selection, clear ranking criteria, strong reasoning behind decisions. |
| **Action Simulation & Execution** | 15% | Booking process realistically simulated, clear system state change, end-to-end workflow. |
| **Technical Implementation** | 10% | Clean architecture, API/tool integration, robust handling of edge cases. |
| **Innovation & UX** | 10% | Creative approach, intuitive interface, clear and engaging demo. |

---

## Important Guidelines
- This is **NOT** a simple listing or booking app.
- Focus on **agentic automation**, not UI complexity.
- At least one booking must be simulated end-to-end.
- Must demonstrate reasoning + decision-making.
- Use mock data if real APIs are unavailable.
- Avoid use of real personal/sensitive data.
