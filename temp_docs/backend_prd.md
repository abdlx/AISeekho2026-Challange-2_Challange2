# PRD: AI Service Orchestrator for Informal Economy

## 1. Introduction
**Project:** Antigravity Service Agent
**Goal:** Automate the discovery and booking of informal service providers (plumbers, electricians, AC technicians) in Pakistan using Agentic AI and Google Maps.

## 2. Problem Statement
The informal economy in Pakistan relies on fragmented WhatsApp/Call networks. Users struggle to find reliable, nearby providers in real-time.

## 3. Core Features
- **Multilingual Support:** Process requests in English, Urdu, and Roman Urdu.
- **Agentic Orchestration:** A single prompt triggers intent extraction, proximity matching, and booking.
- **Google Maps Integration:** Real-time ETA calculation between technician and customer.
- **Action Simulation:** Immutable booking logs in Supabase.

## 4. User Journey
1. User enters: "G-13 mein urgent electrician chahiye."
2. Agent identifies "Electrician" and "G-13".
3. Agent queries database for available electricians.
4. Agent uses Google Maps API to find the one with the shortest travel time.
5. Agent simulates a booking and generates a confirmation code.
6. User sees the technician's location and route on the live map.
