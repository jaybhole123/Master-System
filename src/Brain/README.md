# 🏭 Jay Bhole Master System

> **A comprehensive enterprise management platform for Jai Bhole Traders & Enterprises — managing tasks, HR, coal trading, petty cash, daily scheduling, documents, and more.**

![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.0-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-cyan?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)

**Live URL:** [https://master-system-weld.vercel.app](https://master-system-weld.vercel.app)

---

## 📑 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Modules](#modules)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Related Documentation](#related-documentation)

---

## Overview

Jay Bhole Master System is a **multi-module enterprise web application** built to streamline the day-to-day operations of Jai Bhole Traders & Enterprises. It is a unified platform that integrates:

- **Task Management** — Quick tasks, checklist, delegation, maintenance, repair & EA tasks with WhatsApp notifications
- **HR System** — Employee master, attendance, leave tracker, payroll processing, salary slips, offer letters, work orders & inventory
- **Coal Trading System** — Auctions, SECL intimation & payment, sales orders, dispatch, invoicing, transport payments, refund/lapse & sauda scale
- **Petty Cash Management** — Cash credits, expenses, ledger, summary & group heads
- **Daily Scheduler** — Task scheduling with calendar view, waiting list, someday tasks & reports
- **Document & Subscription Management** — Document renewals, insurance, loans, bank guarantees (BG), subscriptions & vehicle reports
- **Help Slip System** — Employee challenge/solution submission with admin reply
- **Rent Management** — Rent master, monthly tracker & payment tracking
- **Insurance Management** — Policy tracking with due dates, premiums & coverage details
- **WhatsApp Integration** — Automated notifications via Meta Cloud API (task assignments, reminders, daily summaries, password reset OTPs)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18.3 (JSX + some TSX) |
| **Build Tool** | Vite 7.0 |
| **Styling** | Tailwind CSS 4.0, Vanilla CSS |
| **State Management** | Redux Toolkit (RTK) + Zustand (Petty Cash) |
| **Routing** | React Router DOM v7 |
| **Backend / Database** | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| **UI Libraries** | Lucide React, Radix UI, shadcn/ui, Framer Motion |
| **Charts** | Recharts |
| **PDF Generation** | jsPDF, jsPDF-AutoTable, html2canvas |
| **Excel Export/Import** | xlsx, PapaParse (CSV) |
| **Notifications** | react-hot-toast (in-app), WhatsApp Meta Cloud API |
| **Date Handling** | date-fns, react-datepicker |
| **HTTP Client** | Axios, native Fetch API |
| **Proxy Server** | Express.js (for Google Sheets API proxy) |
| **Deployment** | Vercel (SPA rewrites) |
| **Voice Features** | react-speech-recognition, react-media-recorder |

---

## Project Structure

```
Master-System/
├── public/                      # Static assets
├── src/
│   ├── App.jsx                  # Main router — all routes defined here
│   ├── main.jsx                 # React entry point (Redux Provider)
│   ├── SupabaseClient.js        # Supabase client initialization
│   ├── index.css                # Global styles
│   │
│   ├── pages/                   # Core pages
│   │   ├── LoginPage.jsx        # Login (Supabase auth + OTP password reset)
│   │   ├── MasterDashboard.jsx  # SuperAdmin overview dashboard
│   │   ├── ProfilePage.jsx      # User profile page
│   │   ├── QuickTask.jsx        # Quick task management
│   │   ├── Setting.jsx          # Admin settings
│   │   ├── MisReport.jsx        # MIS reporting
│   │   ├── delegation.jsx       # Delegation tasks (user view)
│   │   ├── delegation-data.jsx  # Delegation tasks (admin data view)
│   │   ├── MyDelegation.jsx     # SuperAdmin's own delegations
│   │   ├── admin/               # Admin-only pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AllTasks.jsx, MyTasks.jsx
│   │   │   ├── AssignTask.jsx
│   │   │   ├── ChecklistTask.jsx, MaintenanceTask.jsx
│   │   │   ├── RepairTask.jsx, EATask.jsx
│   │   │   ├── CalendarPage.jsx
│   │   │   ├── AdminApprovalPage.jsx
│   │   │   ├── GlobalSettings.jsx
│   │   │   ├── RentManagement.jsx, RentMaster.jsx, MonthlyTracker.jsx
│   │   │   ├── InsuranceManagement.jsx
│   │   │   ├── HolidayListPage.jsx, WorkingDayCalendarPage.jsx
│   │   │   ├── Notifications.jsx, TrainingVideo.jsx
│   │   │   └── *-data-page.jsx  # Role-specific data pages (director, COO, etc.)
│   │   ├── user/                # User-level pages (Dashboard, Tasks)
│   │   └── indent/              # Indent related pages
│   │
│   ├── components/              # Shared components
│   │   ├── layout/
│   │   │   ├── AdminLayout.jsx  # Main app shell (sidebar + topbar)
│   │   │   └── UserLayout.jsx   # User-level layout
│   │   ├── AudioPlayer.jsx
│   │   ├── BulkImportModal.jsx
│   │   ├── CalendarComponent.jsx
│   │   ├── MagicToast.jsx
│   │   ├── RealtimeLogoutListener.jsx
│   │   ├── RenderDescription.jsx
│   │   ├── SearchableSelect.jsx
│   │   └── TaskManagementTabs.jsx
│   │
│   ├── redux/                   # Redux state management
│   │   ├── store.js             # Store configuration
│   │   ├── api/                 # RTK async thunks (API calls)
│   │   │   ├── loginApi.js, dashboardApi.js, settingApi.js
│   │   │   ├── delegationApi.js, checkListApi.js
│   │   │   ├── quickTaskApi.js, eaApi.js
│   │   │   ├── maintenanceApi.js, repairApi.js
│   │   │   ├── assignTaskApi.js, notificationApi.js
│   │   └── slice/               # Redux slices (reducers + actions)
│   │       ├── loginSlice.js, dashboardSlice.js, settingSlice.js
│   │       ├── delegationSlice.js, checklistSlice.js
│   │       ├── quickTaskSlice.js, eaSlice.js
│   │       ├── maintenanceSlice.js, repairSlice.js
│   │       ├── assignTaskSlice.js, notificationSlice.js
│   │
│   ├── services/                # External service integrations
│   │   ├── whatsappService.js   # WhatsApp Meta Cloud API integration
│   │   └── dailyReminderService.js  # Daily pending task reminders
│   │
│   ├── context/                 # React Contexts
│   │   └── MagicToastContext.jsx
│   │
│   ├── modules/                 # Feature modules
│   │   └── document/            # Document & Subscription Management (TypeScript)
│   │       ├── DocumentRoutes.tsx
│   │       ├── pages/ (Dashboard, Settings, ResourceManager, ...)
│   │       ├── components/
│   │       ├── store/
│   │       └── utils/
│   │
│   ├── CoalSystem/              # 🪨 Coal Trading Sub-System
│   │   ├── src/
│   │   │   ├── App.jsx          # Coal system app (page-based routing)
│   │   │   ├── pages/           # Auction, SECL, Invoice, Dispatch, SaudaScale, etc.
│   │   │   ├── components/
│   │   │   └── utils/
│   │   └── sql.query            # Complete Coal + shared DB schema
│   │
│   ├── Hr-sysytem/              # 👥 HR & Payroll Sub-System
│   │   ├── src/
│   │   │   ├── App.jsx          # HR system app
│   │   │   ├── pages/           # Employee, Attendance, Salary, Payslip, etc.
│   │   │   ├── hooks/, lib/, utils/
│   │   └── sql.query (in pages/)
│   │
│   ├── Petty-Cash/              # 💰 Petty Cash Sub-System
│   │   ├── src/
│   │   │   ├── App.jsx          # Petty cash app
│   │   │   ├── pages/           # AdminDashboard, AddCase, Expenses, Ledger, etc.
│   │   │   ├── components/, store/, lib/, utils/
│   │   └── sql.query
│   │
│   ├── Daily-Shedular/          # 📅 Daily Scheduler Sub-System
│   │   ├── src/
│   │   │   ├── App.jsx
│   │   │   ├── pages/           # Dashboard, WaitingList, SomedayTasks, Reports, Calendar
│   │   │   ├── context/         # SchedulerContext
│   │   │   ├── components/, data/, lib/, utils/
│   │
│   └── HelpSlip/                # 🆘 Help Slip Sub-System
│       ├── src/
│       │   ├── App.jsx
│       │   ├── pages/           # HelpSlip, HelpSlipList
│       │   └── components/
│
├── server.js                    # Express proxy server (Google Sheets API)
├── sql.query                    # Core database schema (Supabase PostgreSQL)
├── insurance_schema.sql         # Insurance policies table schema
├── vercel.json                  # Vercel SPA rewrite config
├── vite.config.js               # Vite build config
├── tailwind.config.js           # Tailwind CSS config
├── package.json                 # Dependencies & scripts
└── .env                         # Environment variables (NOT committed)
```

---

## Modules

### 1. 🎯 Task Management (Core)
The central module for assigning, tracking, and approving tasks across the organization.

| Task Type | Description |
|---|---|
| **Quick Task** | One-off urgent tasks assigned to any user |
| **Checklist** | Recurring/periodic tasks with frequency settings |
| **Delegation** | Delegated tasks with start/end dates and admin approval |
| **Maintenance** | Machine/equipment maintenance tasks |
| **Repair** | Breakdown repair tasks with bill tracking |
| **EA Task** | Executive Assistant tasks |

**Key Features:** Admin approval workflow, task extension requests, audio/voice note attachments, image proof uploads, delay tracking, WhatsApp notifications, MIS reports, calendar view.

### 2. 👥 HR System (`/hr/*`)
Complete HR management from employee onboarding to salary disbursement.
- Employee Master (personal details, documents, bank info)
- Attendance tracking (daily/monthly with day-wise grid)
- Leave management (CL, SL, EL with allotments)
- Salary structure (Basic, HRA, Allowances, PF, ESIC, P.Tax)
- Payroll processing & Net salary calculation
- Payslip generation (PDF)
- Bank transfer sheet
- Indent management & Inventory
- Offer Letter & Work Order generation

### 3. 🪨 Coal System (`/coal-system/*`)
End-to-end coal trading operations management.
- Auction management (bid tracking, coal grades)
- SECL Intimation & Payment Advice
- Sales Order management
- Work Orders
- Dispatch tracking
- Invoice management (GST, E-way bill)
- Transport Payment
- Refund/Lapse tracking
- Sauda Scale (buy/sell deal tracker)
- Raw material stock, coal stock, sponge production

### 4. 💰 Petty Cash (`/petty-cash/*`)
Daily cash flow tracking with approval workflow.
- Cash credits (add cash)
- Expense recording with receipt uploads
- Ledger view
- Summary reports
- Settings (group heads, payment modes)

### 5. 📅 Daily Scheduler (`/daily-scheduler/*`)
Personal/team task scheduling.
- Dashboard with today's tasks
- Waiting list
- Someday/Maybe tasks
- Calendar view
- Reports

### 6. 📄 Document & Subscription Module (`/document/*`, `/subscription/*`, `/loan/*`, `/bg/*`)
Document lifecycle management.
- Document renewals, shared documents
- Insurance master data, vehicle reports, car insurance
- Subscription management (approval, payment, renewal)
- Loan tracking (foreclosure, NOC)
- Bank Guarantee management

### 7. 🆘 Help Slip (`/dashboard/help-slip`)
Employee problem-solving workflow — submit challenges with proposed solutions for admin review.

### 8. 🏠 Rent Management (`/dashboard/rent-management`)
Property rental tracking with monthly payment monitoring.

### 9. 🛡️ Insurance Management (`/dashboard/insurance`)
Insurance policy tracking with premium schedules and coverage dates.

---

## Getting Started

### Prerequisites
- **Node.js** v18+ 
- **npm** v9+
- A **Supabase** project (with schema applied)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Jay-Bhole-Master-System/Master-System

# Install dependencies
npm install

# Set up environment variables
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at **http://localhost:5174**

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Google Apps Script (for Google Sheets integration)
VITE_GOOGLE_SCRIPT_URL=<google-apps-script-url>
VITE_GOOGLE_SHEET_ID=<google-sheet-id>
VITE_GOOGLE_DRIVE_FOLDER_ID=<drive-folder-id>
VITE_GOOGLE_SUBSCRIPTION_FOLDER_ID=<subscription-folder-id>
VITE_GOOGLE_LOAN_FOLDER_ID=<loan-folder-id>
VITE_GOOGLE_RENEWAL_FOLDER_ID=<renewal-folder-id>

# WhatsApp (Meta Cloud API)
VITE_WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
VITE_WHATSAPP_ACCESS_TOKEN=<access-token>
VITE_WHATSAPP_WABA_ID=<waba-id>
```

> ⚠️ **Never commit the `.env` file.** It is already listed in `.gitignore`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 5174 (with `--host`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm start` | Start Express proxy server on port 5000 |

---

## Deployment

The project is deployed on **Vercel** with SPA rewrites configured in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Steps:**
1. Connect your GitHub repository to Vercel
2. Set all environment variables in Vercel project settings
3. Build command: `npm run build`
4. Output directory: `dist`
5. Framework preset: Vite

---

## Related Documentation

| Document | Description |
|---|---|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Functional & non-functional requirements |
| [DATABASE.md](./DATABASE.md) | Complete database schema documentation |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API endpoints & Supabase queries |
| [PROJECT_RULES.md](./PROJECT_RULES.md) | Coding standards & project conventions |
| [AI_CONTEXT.md](./AI_CONTEXT.md) | AI/LLM context file for development assistance |

---

## Author

**Powered by [Botivate](https://www.botivate.in/)**

---
