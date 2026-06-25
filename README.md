# QueueStorm CRM — Ticket Classification Service
An intelligent, high-performance customer service ticket classification API and real-time support dashboard engineered for the **SUST CSE Carnival 2026 - Codex Community Hackathon (Mock Preliminary Task)**.

Developed by Team: **EWU_Parasites**

**Live Deployment:** queuestorm-three.vercel.app

## Project Overview & Context
During high-traffic windows in digital finance platforms (such as bKash), customer support channels are flooded with critical issues ranging from failed transactions to active phishing scams. Human agents cannot read and categorize every ticket quickly enough from scratch.
**QueueStorm CRM** addresses this by providing an automated, highly available web service that ingests unstructured customer complaints, evaluates them within seconds, and answers four pivotal operations questions:
 1. **Category Identification**: What kind of problem is this? (wrong_transfer, payment_failed, refund_request, phishing_or_social_engineering, or other)
 2. **Severity Assessment**: How critical is the issue? (low, medium, high, critical)
 3. **Smart Routing**: Which specialized department should handle it? (customer_support, dispute_resolution, payments_ops, fraud_risk)
 4. **Agent Summary**: A concise, neutral, one-sentence summary that an agent can read in under two seconds.

> **Immediate Escalation Rule:** The system automatically enforces high-priority routing flags (human_review_required: true) for all critical severity or phishing_or_social_engineering cases to ensure immediate human intervention.
> 
## How It Works: Hybrid Failover Architecture
To guarantee the high-availability required by digital financial architectures, QueueStorm implements a **Hybrid Failover Classification Chain**:

```text
[Incoming CRM Ticket]
         │
         ▼
┌──────────────────┐
│   Groq Cloud API │ ──(Success)──> [Safety Audit Pipeline] ──> [JSON Response]
│  (Llama-3.1-8b)  │
└────────┬─────────┘
         │ (Fails / Over-quota)
         ▼
┌──────────────────┐
│    Gemini API    │ ──(Success)──> [Safety Audit Pipeline] ──> [JSON Response]
│ (Gemini-2.5-Flash)│
└────────┬─────────┘
         │ (Fails / Network Offline)
         ▼
┌──────────────────┐
│   Local Parser   │ ─────────────────> [Safety Audit Pipeline] ──> [JSON Response]
│ (Regex/Keyword)  │
└──────────────────┘

```
 * **Primary Layer (Groq API):** Utilizes llama-3.1-8b-instant for ultra-fast text classification and contextual engineering.
 * **Secondary Layer (Gemini API):** Automatically intercepts the request if Groq fails or hits rate limits, utilizing gemini-2.5-flash with native schema enforcement.
 * **Tertiary Layer (Local Parser):** An offline, zero-dependency, regex & keyword-based matcher that serves as an iron-clad safety net. If no internet or API keys are present, the application gracefully defaults to this local fallback engine to keep the application operational.
 * **Post-Processing Safety Audit Pipeline:** Every summary passes through a strict algorithmic check. If the generated text violates the **Mandatory Safety Rule** (asking for or leaking a PIN, OTP, password, or card details), it is caught to prevent social engineering exploits.

## Tech Stack
 * **Framework:** Next.js 15 (App Router Architecture)
 * **UI & Dashboard:** React 19 + Custom Vanilla CSS Variables (Zero bulky external framework overhead)
 * **LLM Integrations:** Groq Cloud API & Google Gemini API
 * **Testing Utility:** Native Node.js test runner using http and child_process modules

## Getting Started & Local Installation
### 1. Prerequisites
 * Node.js (version 18.x or higher)
 * Package Manager (npm)
### 2. Clone and Install
```bash
git clone <your-repo-url>
cd https://github.com/rxxeron/EWU_parasites
npm install

```
### 3. Environment Configuration
Create a .env.local file in the root directory of your project. **Do not commit this file to GitHub.**
```env
# Primary Fast Classifier Key
GROQ_API_KEY=your_groq_api_key_here

# Backup Resilient Classifier Key
GEMINI_API_KEY=your_gemini_api_key_here

```
> *Note: If both keys are left blank, the app defaults transparently to the Local Regex-based classification engine.*
> 
### 4. Running the Application
#### Start Development Server:
```bash
npm run dev

```
Open http://localhost:3000 inside your browser to view the interactive dashboard.

## Live URL & Tester Verification Guide
Production deployment is actively hosted at: **https://queuestorm-three.vercel.app/**
### Method 1: Interactive CRM Playground (Web UI Browser)
 1. Go to the live deployment link.
 2. Locate the **Live Classification Playground** interface.
 3. Click on any of the preloaded **Quick Test Templates** (e.g., *Case 1: wrong transfer* or *Case 3: phishing*).
 4. The input fields will fill automatically. Click **Sort Ticket**.
 5. The live structured JSON output will render on-screen, and the ticket will visually route into the appropriate queue card inside the **Interactive Agent CRM Queue**.
### Method 2: Command Line API Verification via cURL
#### 1. Service Health Endpoint
```bash
curl -X GET https://queuestorm-three.vercel.app/health

```
#### 2. Sort Ticket: Wrong Transfer
```bash
curl -X POST https://queuestorm-three.vercel.app/sort-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "T-001",
    "channel": "app",
    "locale": "en",
    "message": "I sent 3000 to wrong number"
  }'

```
#### 3. Sort Ticket: Phishing OTP Threat (Triggers Critical & Review Flag)
```bash
curl -X POST https://queuestorm-three.vercel.app/sort-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "T-002",
    "channel": "call_center",
    "locale": "mixed",
    "message": "Someone called asking my OTP, is that bKash?"
  }'

```
#### 4. Sort Ticket: Payment Failure
```bash
curl -X POST https://queuestorm-three.vercel.app/sort-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "T-003",
    "channel": "app",
    "locale": "en",
    "message": "Payment failed but balance deducted"
  }'

```
#### 5. Sort Ticket: Refund Request
```bash
curl -X POST https://queuestorm-three.vercel.app/sort-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "T-004",
    "channel": "app",
    "locale": "en",
    "message": "Please refund my last transaction, I changed my mind"
  }'

```
#### 6. Sort Ticket: General Enquiries
```bash
curl -X POST https://queuestorm-three.vercel.app/sort-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "T-005",
    "channel": "app",
    "locale": "en",
    "message": "App crashed when I opened it"
  }'

```
### Method 3: Windows PowerShell Verification (Invoke-RestMethod)
#### 1. System Health Check
```powershell
Invoke-RestMethod -Uri "https://queuestorm-three.vercel.app/health" -Method Get

```
#### 2. Sort Ticket: Wrong Transfer
```powershell
$body = '{"ticket_id":"T-001", "channel":"app", "locale":"en", "message":"I sent 3000 to wrong number"}'
Invoke-RestMethod -Uri "https://queuestorm-three.vercel.app/sort-ticket" -Method Post -ContentType "application/json" -Body $body

```
#### 3. Sort Ticket: Phishing Threat
```powershell
$body = '{"ticket_id":"T-002", "channel":"call_center", "locale":"mixed", "message":"Someone called asking my OTP, is that bKash?"}'
Invoke-RestMethod -Uri "https://queuestorm-three.vercel.app/sort-ticket" -Method Post -ContentType "application/json" -Body $body

```

### Mandatory Safety Regulations
 * **The Core Constraint:** The agent_summary field **must never under any condition** prompt or instruct a customer to provide their PIN, OTP, password, or full card number.
 * Violating this triggers an automatic fail from the automated grading scripts. QueueStorm enforces a dedicated post-processing filter to capture and nullify accidental breaches of this rule.
### Runtime SLA Boundaries
 * /health response window: Within **10 seconds**.
 * /sort-ticket response window: Within **30 seconds**.
 * *Security Note: No GPU components or un-hashed static secrets are included within the repository codebase.*
## Production Deployment Mapping
 * **Platform:** Vercel
 * **Build Directives:** next build
 * **Execution Directives:** next start
