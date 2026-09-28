# 🤖 AI_CONTEXT.md — Jay Bhole Master System

> This file provides context for AI assistants (GitHub Copilot, Cursor, Gemini, Claude, etc.) to understand the project and generate accurate code.

---

## Project Identity

- **Name:** Jay Bhole Master System (JBMS)
- **Owner:** Jai Bhole Traders & Enterprises
- **Type:** Enterprise management web application (ERP-like)
- **Live URL:** https://master-system-weld.vercel.app
- **Powered by:** [Botivate](https://www.botivate.in/)

---

## Quick Summary

This is a **multi-module React SPA** that manages the day-to-day operations of a coal trading and manufacturing business. It includes:

1. **Task Management** — 6 task types (Quick, Checklist, Delegation, Maintenance, Repair, EA) with admin approval, WhatsApp notifications, voice notes, and image proofs
2. **HR System** — Employee master, attendance (day-wise grid), leave tracker, salary structure, payroll processing, payslips (PDF), bank transfers, indents, inventory, offer letters, work orders
3. **Coal Trading** — Auctions, SECL intimation/payment, sales orders, dispatch, invoices (GST), transport payments, refund/lapse, sauda scale (buy/sell deals), raw material stock, coal stock, sponge production
4. **Petty Cash** — Cash credits, expenses with approval workflow, ledger, summary
5. **Daily Scheduler** — Task scheduling with calendar, waiting list, someday tasks, reports
6. **Document Management** — Document/subscription renewals, insurance, loans, bank guarantees, vehicle reports
7. **Help Slip** — Employee problem submission with proposed solutions
8. **Rent Management** — Property rental tracking with monthly payments
9. **Insurance** — Policy tracking

---

## Tech Stack (IMPORTANT — Read Before Generating Code)

| What | Technology | Version |
|---|---|---|
| **UI** | React | 18.3 |
| **Build** | Vite | 7.0 |
| **CSS** | Tailwind CSS | 4.0 |
| **State (Core)** | Redux Toolkit (RTK) | Latest |
| **State (Petty Cash, Docs)** | Zustand | 5.x |
| **State (Scheduler)** | React Context | - |
| **Routing** | React Router DOM | v7 |
| **Database** | Supabase (PostgreSQL) | - |
| **Icons** | lucide-react | - |
| **Toasts** | react-hot-toast | - |
| **Animations** | framer-motion | - |
| **PDF** | jsPDF + jsPDF-AutoTable | - |
| **Excel** | xlsx + PapaParse | - |
| **Dates** | date-fns | - |
| **UI Primitives** | Radix UI + shadcn/ui | - |

---

## Key Architecture Decisions

### 1. Authentication
- **NOT using Supabase Auth.** Custom auth via `users` table.
- Login checks `user_name` + `password` (plaintext match).
- Session stored in `localStorage` (not cookies/tokens).
- Role-based access: `superadmin`, `admin`, `HOD`, `user`.
- Additional granular permissions via `system_access` and `page_access` fields.

### 2. Sub-Systems Are Embedded, Not Separate Apps
Each sub-system (`CoalSystem/`, `Hr-sysytem/`, `Petty-Cash/`, `Daily-Shedular/`, `HelpSlip/`) has its own `src/` folder but is **NOT a separate Vite app**. They are imported into the main `App.jsx` as components.

```
Main App (App.jsx) → imports → CoalSystem/src/App.jsx (as component)
                   → imports → Hr-sysytem/src/pages/*.jsx (individual pages)
                   → imports → Petty-Cash/src/pages/*.jsx
                   → etc.
```

### 3. CSS Loading Order
Sub-system CSS is loaded in `App.jsx` in a specific order. Later imports override earlier ones:
```
index.css → Hr-sysytem CSS → Petty-Cash CSS → Daily-Shedular CSS → CoalSystem CSS
```

### 4. State Management Split
- **Redux** for core task management (the main system)
- **Zustand** for Petty Cash and Document module
- **Context** for Daily Scheduler
- **Local useState** for HR and Coal systems (they call Supabase directly)

### 5. Supabase Client
Single instance created in `src/SupabaseClient.js`. Realtime enabled with 10 events/sec.

---

## File Map (Where to Find Things)

### Core Files
| File | Purpose |
|---|---|
| `src/App.jsx` | **All routes defined here** — the single source of truth for routing |
| `src/main.jsx` | React entry point — wraps app with Redux Provider |
| `src/SupabaseClient.js` | Supabase client instance |
| `src/index.css` | Global styles |

### Pages
| Path | What |
|---|---|
| `src/pages/LoginPage.jsx` | Login page with forgot password |
| `src/pages/MasterDashboard.jsx` | SuperAdmin dashboard |
| `src/pages/ProfilePage.jsx` | User profile |
| `src/pages/QuickTask.jsx` | Quick task management (117KB — large file) |
| `src/pages/Setting.jsx` | Admin settings (153KB — largest file) |
| `src/pages/admin/Dashboard.jsx` | Admin dashboard |
| `src/pages/admin/AllTasks.jsx` | All tasks view (131KB) |
| `src/pages/admin/MyTasks.jsx` | SuperAdmin's tasks (130KB) |
| `src/pages/admin/ChecklistTask.jsx` | Checklist tasks |
| `src/pages/admin/MaintenanceTask.jsx` | Maintenance tasks |
| `src/pages/admin/RepairTask.jsx` | Repair tasks |
| `src/pages/admin/EATask.jsx` | EA tasks |
| `src/pages/admin/AdminApprovalPage.jsx` | Admin approval workflow (91KB) |
| `src/pages/admin/CalendarPage.jsx` | Calendar view (60KB) |
| `src/pages/admin/RentManagement.jsx` | Rent management (68KB) |
| `src/pages/admin/InsuranceManagement.jsx` | Insurance management |
| `src/pages/admin/*-data-page.jsx` | Role-specific data views |

### Sub-Systems
| Module | Entry | Pages |
|---|---|---|
| Coal System | `src/CoalSystem/src/App.jsx` | AuctionPage, SaudaScalePage, InvoicePage, etc. |
| HR System | Individual imports in `App.jsx` | EmployeeMaster, Attendance, Payslip, etc. |
| Petty Cash | Individual imports in `App.jsx` | AdminDashboard, AddCase, Expenses, Ledger, etc. |
| Daily Scheduler | Individual imports in `App.jsx` | Dashboard, WaitingList, SomedayTasks, CalendarView |
| HelpSlip | `src/HelpSlip/src/pages/HelpSlip.jsx` | HelpSlip, HelpSlipList |
| Documents | `src/modules/document/DocumentRoutes.tsx` | TypeScript — renewals, subscriptions, loans, BG |

### Redux
| Directory | Contents |
|---|---|
| `src/redux/store.js` | Store config (11 reducers) |
| `src/redux/api/` | Async thunks — loginApi, dashboardApi, quickTaskApi, delegationApi, checkListApi, eaApi, maintenanceApi, repairApi, settingApi, assignTaskApi, notificationApi |
| `src/redux/slice/` | Reducers — matching slice for each API |

### Services
| File | Purpose |
|---|---|
| `src/services/whatsappService.js` | WhatsApp Meta Cloud API (42KB — comprehensive) |
| `src/services/dailyReminderService.js` | Daily pending task reminders |

### Layout
| File | Purpose |
|---|---|
| `src/components/layout/AdminLayout.jsx` | Main shell — sidebar + top navbar (87KB) |
| `src/components/layout/UserLayout.jsx` | User-level layout |

---

## Database Quick Reference

**Total tables: 40+** (documented in `DATABASE.md`)

### Most Used Tables
| Table | Used By | Purpose |
|---|---|---|
| `users` | Everything | Central user/employee table |
| `ea_tasks` / `ea_tasks_done` | Quick Task, EA Task | Urgent/EA task management |
| `checklist` | Checklist Task | Periodic tasks |
| `delegation` / `delegation_done` | Delegation | Delegated tasks |
| `maintenance_tasks` | Maintenance | Machine maintenance |
| `repair_tasks` | Repair | Breakdown repairs |
| `departments` | Settings, Tasks | Department list |
| `monthly_attendance` | HR | Attendance grid |
| `salary_structures` | HR | Salary components |
| `processed_payroll` | HR | Processed salaries |
| `auctions` / `auction_items` | Coal | Coal auctions |
| `sales_orders` | Coal | Sales orders |
| `invoices` | Coal | GST invoices |
| `sauda_sale` / `sauda_purchase` | Coal | Deals |
| `petty_cash_expenses` | Petty Cash | Expenses |
| `tasks` / `someday_tasks` | Scheduler | Scheduled tasks |
| `notifications` / `user_notifications` | Notifications | In-app notifications |

---

## Common Patterns to Follow

### Adding a New Page
```jsx
// 1. Create the page component
// src/pages/admin/NewPage.jsx
const NewPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('table').select('*');
      if (error) toast.error("Failed to load");
      else setData(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;

  return <div className="p-4">...</div>;
};
export default NewPage;

// 2. Add route in src/App.jsx
import NewPage from "./pages/admin/NewPage";
// Inside <Routes>:
<Route path="/dashboard/new-page" element={
  <ProtectedRoute allowedRoles={["admin"]}><NewPage /></ProtectedRoute>
} />

// 3. Add sidebar link in src/components/layout/AdminLayout.jsx
```

### Adding a New Redux Feature
```javascript
// 1. Create API file: src/redux/api/newFeatureApi.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import supabase from "../../SupabaseClient";

export const fetchNewFeature = createAsyncThunk('newFeature/fetch', async () => {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
});

// 2. Create Slice: src/redux/slice/newFeatureSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { fetchNewFeature } from "../api/newFeatureApi";

const newFeatureSlice = createSlice({
  name: "newFeature",
  initialState: { data: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNewFeature.pending, (state) => { state.loading = true; })
      .addCase(fetchNewFeature.fulfilled, (state, action) => { state.data = action.payload; state.loading = false; })
      .addCase(fetchNewFeature.rejected, (state, action) => { state.error = action.error.message; state.loading = false; });
  }
});
export default newFeatureSlice.reducer;

// 3. Register in store: src/redux/store.js
import newFeatureReducer from "./slice/newFeatureSlice";
// Add to reducer: { newFeature: newFeatureReducer }
```

### Sending WhatsApp Notification
```javascript
import { sendTaskAssignmentNotification } from "../services/whatsappService";

// Auto-selects template based on taskType
await sendTaskAssignmentNotification({
  taskType: 'checklist', // or 'maintenance', 'repair', 'ea', 'delegation'
  doerName: 'John',
  taskId: '42',
  description: 'Complete report',
  startDate: '2024-01-15',
  givenBy: 'Admin',
  department: 'Sales',
  duration: '2 days'
});
```

---

## Known Issues & Gotchas

1. **Folder typos:** `Hr-sysytem` (should be Hr-system) and `Daily-Shedular` (should be Daily-Scheduler) — DO NOT RENAME
2. **Password storage:** Plaintext in `users.password` — security risk, migration pending
3. **Large files:** Some page components are 50-150KB — should be split but work as-is
4. **AuthProvider.jsx:** Legacy file in `src/pages/` — NOT the active auth system (active auth is in `App.jsx` → `ProtectedRoute`)
5. **Dual attendance schemas:** `monthly_attendance` has two versions — one with `day_1..day_31` columns, one with `attendance_data` JSONB. The active version uses individual columns.
6. **CSS conflicts:** Sub-system stylesheets can conflict — order of imports in `App.jsx` matters
7. **WhatsApp token expiry:** Meta Cloud API tokens expire — update in `.env` when refreshed

---

## Environment Setup

```bash
# Prerequisites
node >= 18
npm >= 9

# Install
npm install

# Dev server (port 5174)
npm run dev

# Build
npm run build

# Required .env variables
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
VITE_GOOGLE_SCRIPT_URL=<url>
VITE_GOOGLE_SHEET_ID=<id>
VITE_GOOGLE_DRIVE_FOLDER_ID=<id>
VITE_GOOGLE_SUBSCRIPTION_FOLDER_ID=<id>
VITE_GOOGLE_LOAN_FOLDER_ID=<id>
VITE_GOOGLE_RENEWAL_FOLDER_ID=<id>
VITE_WHATSAPP_PHONE_NUMBER_ID=<id>
VITE_WHATSAPP_ACCESS_TOKEN=<token>
VITE_WHATSAPP_WABA_ID=<id>
```

---

## When Generating Code, Remember:

1. ✅ Import Supabase from `../../SupabaseClient` (adjust relative path)
2. ✅ Use `toast.success()` / `toast.error()` from `react-hot-toast`
3. ✅ Use Tailwind CSS classes for styling
4. ✅ Use `lucide-react` for icons
5. ✅ Check existing components in `src/components/` before creating new ones
6. ✅ Follow existing Redux pattern if the feature already uses Redux
7. ✅ Use direct Supabase calls for HR/Coal system pages
8. ❌ Don't use Supabase Auth — use custom `users` table auth
9. ❌ Don't import from `node_modules` paths — use package names
10. ❌ Don't create new CSS frameworks — use Tailwind

---
