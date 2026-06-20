# Pilot Review Orchestration Architecture

## Overview

This document maps the end-to-end algorithmic flow of the "Pilot Review"  feature. It details the precise lifecycle of a user's portfolio, GitHub, or Resume submission—from the initial chat input, through robust multi-layer validation, and ultimately to the AI-driven deep analysis.

---

## Stage 0: Pre-Validation (The Banned Words Shield)

**Objective:** Instantly block malicious or explicit inputs locally before any network requests are made, protecting professional decorum and saving API resources.

**Component:** `NeuralChatLanding.tsx` & `curated-banned-words.json`

* **Action:** Intercepts the raw input string exactly when the user presses Enter.
* **Execution:** Parses the input against a curated, multi-lingual JSON list of explicit terms (English, Tagalog, Bisaya, Spanish).
* **Result:** If a match is found, the system immediately halts the flow and renders a red system bubble: *"Input Blocked: Contains restricted keywords."* No API calls are made.

---

## Layer 1: Fast Validation & Telemetry (The Gatekeeper)

**Objective:** Instantly intercept and reject invalid, offline, or irrelevant URLs/usernames *before* rendering complex UI components or burning premium ScrapingAnt/OpenAI credits.

### Route A: Portfolio URL Validation

**Endpoint:** `/api/reviews/validate-portfolio`
**Service:** `URLValidationService`

* **Action:** Performs a fast, direct HTTP `fetch` using native Node.js.
* **Execution Steps:**
  1. **Regex Check:** Instantly validates structural format locally.
  2. **Blacklist Interception:** Extracts hostname and checks against generic domains (`google.com`).
  3. **Reachability:** Enforces a 10-second timeout.
  4. **Content-Type Verification:** Ensures the response headers declare `text/html`.
  5. **Keyword Extraction:** Scans raw HTML for portfolio footprints.
  6. **SPA Detection (Benefit of the Doubt):** If keywords are missing, it scans for modern framework footprints (React/Vue) and safely passes them.

### Route B: GitHub Username Validation

**Endpoint:** `/api/reviews/validate-github`

* **Action:** Performs an authenticated ping to the free GitHub Public API (`api.github.com/users/{username}`).
* **Execution Steps:**
  1. **URL Parsing:** Strips out `https://github.com/` if the user pasted a full URL.
  2. **API Verification:** Checks for a `200 OK` response. Halts on `404 Not Found`.
  3. **Organization Blocker:** Checks `data.type`. If it equals `"Organization"`, it rejects the input.
  4. **Data Extraction:** Gathers Avatar URL, Name, Bio, Followers, and Public Repositories (cost: $0.00).

### Route C: Resume Upload Validation

* **Action:** Client-side validation ensuring the file is strictly `application/pdf`.

---

## Asynchronous UI Orchestration

**Component:** `NeuralChatLanding.tsx`

* **Memory-Efficient Chat Logic:** Replaces static forms with a simulated, interactive conversational interface. To prevent massive memory leaks when testing multiple heavy iframes, the system aggressively garbage-collects: when a new valid link is successfully processed, the old chat bubble collapses its internal `SmartPreview` component into a lightweight `Dismissed` badge.
* **Decoupled State Management:**
  * **Pills & Input Bar:** Act as the user's "Active Shopping Cart". State (`portfolioUrl`, `githubUsername`, `resumeFile`) is strictly updated *only* after successful backend validation to prevent "ghost pills" and invalid charges.
  * **Context Syncing:** The `DynamicProceedContext` ensures perfect synchronization between the active state and the collapsed/active status of chat bubble previews.
* **Dynamic Checkout:** The "Proceed Analysis" button is decoupled from historical chat bubbles and acts as a floating, centralized action bar right above the inputs, dynamically computing variable token costs based on configuration rules in `src/config/pricing.ts`.

---

## Layer 2: Deep Extraction & AI Rating (Pending)

**Objective:** Perform a deep scrape using headless browsers, extract structural semantic data, and generate an AI-driven rating.
*(This section will be expanded as we refine the ScrapingAnt and AI processing layers)*
