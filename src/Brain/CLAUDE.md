# CLAUDE.md — Instructions for Claude AI

> This file is read by Claude (Anthropic's AI) at the start of every session. It contains everything Claude needs to know to work on this project correctly.

---

## Project: Jay Bhole Master System (JBMS)

**What:** Multi-module enterprise management web app for **Jai Bhole Traders & Enterprises** (coal trading & manufacturing business).

**Live:** https://master-system-weld.vercel.app

**Owner:** Botivate (https://www.botivate.in/)

---

## Tech Stack (CRITICAL)

```
Frontend:    React 18.3 (JSX) + some TypeScript (TSX) in document module
Build:       Vite 7.0
Styling:     Tailwind CSS 4.0
State:       Redux Toolkit (core) | Zustand (Petty Cash, Docs) | Context (Scheduler)
Routing:     React Router DOM v7
Database:    Supabase (PostgreSQL + Realtime + Storage)
Icons:       lucide-react
Toasts:      react-hot-toast
Animations:  framer-motion
PDF:         jsPDF + jsPDF-AutoTable
Excel:       xlsx + PapaParse
Dates:       date-fns
UI:          Radix UI + shadcn/ui
Deploy:      Vercel
```

---

## Architecture Rules (DO NOT VIOLATE)

### Authentication
- **NOT using Supabase Auth.** Custom auth via `users` table (username + plaintext password).
- Session stored in `localStorage` (keys: `user-name`, `user-id`, `role`, `system_access`, `page_access`, etc.)
- Roles: `superadmin` > `admin` > `HOD` > `user`
- Route protection via `<ProtectedRoute allowedRoles={[...]}>` in `App.jsx`

### Sub-Systems Are Components (NOT Separate Apps)
```
src/App.jsx imports:
  → CoalSystem/src/App.jsx (rendered as component with page prop)
  → Hr-sysytem/src/pages/*.jsx (individual page imports)
  → Petty-Cash/src/pages/*.jsx
  → Daily-Shedular/src/pages/*.jsx
  → HelpSlip/src/pages/*.jsx
  → modules/document/DocumentRoutes.tsx
```

### State Management Split
| Module | State Tool | Data Access |
|---|---|---|
| Core Tasks (Quick, Checklist, Delegation, Maintenance, Repair, EA) | Redux Toolkit | `redux/api/` → `redux/slice/` |
| Petty Cash | Zustand | Direct Supabase |
| Daily Scheduler | React Context | Direct Supabase |
| HR System | useState | Direct Supabase |
| Coal System | useState | Direct Supabase |
| Document Module | Zustand | Direct Supabase |

### Supabase Client
- Single instance: `src/SupabaseClient.js`
- Always import from there — never create new clients
- Realtime enabled (10 events/sec)

---

## Key File Locations

| What | Where |
|---|---|
| **ALL routes** | `src/App.jsx` (566 lines — single source of truth) |
| **Entry point** | `src/main.jsx` (Redux Provider wraps App) |
| **Supabase client** | `src/SupabaseClient.js` |
| **Main layout** | `src/components/layout/AdminLayout.jsx` (87KB — sidebar + navbar) |
| **Redux store** | `src/redux/store.js` (11 reducers) |
| **Redux APIs** | `src/redux/api/*.js` (11 files — async thunks) |
| **Redux slices** | `src/redux/slice/*.js` (11 files — reducers) |
| **WhatsApp service** | `src/services/whatsappService.js` (42KB — Meta Cloud API) |
| **Daily reminders** | `src/services/dailyReminderService.js` |
| **Login page** | `src/pages/LoginPage.jsx` |
| **Admin pages** | `src/pages/admin/*.jsx` (33 files) |
| **Settings** | `src/pages/Setting.jsx` (153KB — largest file) |
| **Coal System** | `src/CoalSystem/src/` |
| **HR System** | `src/Hr-sysytem/src/` |
| **Petty Cash** | `src/Petty-Cash/src/` |
| **Scheduler** | `src/Daily-Shedular/src/` |
| **Help Slip** | `src/HelpSlip/src/` |
| **Documents (TS)** | `src/modules/document/` |
| **DB Schema** | `sql.query` (root) + `CoalSystem/sql.query` + `Petty-Cash/sql.query` |
| **Brain/Docs** | `src/Brain/*.md` (README, DATABASE, API_DOCS, REQUIREMENTS, RULES, AI_CONTEXT) |

---

## Database (Supabase PostgreSQL)

**40+ tables.** Full schema in `src/Brain/DATABASE.md`.

### Most Important Tables
```
users                    — Central user/employee table (auth + HR data)
ea_tasks / ea_tasks_done — Quick/EA tasks
checklist                — Checklist tasks
delegation / delegation_done — Delegation tasks
maintenance_tasks        — Maintenance tasks
repair_tasks             — Repair tasks
departments              — Department list
monthly_attendance       — HR attendance (day_1..day_31 columns)
salary_structures        — Salary components per employee
processed_payroll        — Processed salary records
auctions / auction_items — Coal auctions
sales_orders             — Coal sales orders
invoices                 — GST invoices
sauda_sale / sauda_purchase — Coal deals
petty_cash_expenses      — Petty cash expenses
tasks / someday_tasks    — Daily scheduler tasks
notifications / user_notifications — In-app notifications
rent_master / rent_monthly_tracker — Rent management
insurance_policies       — Insurance tracking
help_slips               — Help slip submissions
```

---

## Modules & Routes

| Route Prefix | Module | Wrapper Component |
|---|---|---|
| `/login` | Auth | None (public) |
| `/master-dashboard` | SuperAdmin | `SuperAdminRoute` |
| `/dashboard/*` | Core System | `ProtectedRoute` |
| `/hr/*` | HR System | `HrWrapper` |
| `/letter/*` | Letters | `HrWrapper` |
| `/petty-cash/*` | Petty Cash | `PettyWrapper` |
| `/daily-scheduler/*` | Scheduler | `DailySchedulerWrapper` |
| `/coal-system/*` | Coal Trading | `CoalSystemWrapper` |
| `/document/*`, `/subscription/*`, `/loan/*`, `/bg/*` | Documents | `DocumentRoutes` |

---

## Coding Patterns

### Adding a New Page
```jsx
// 1. Create: src/pages/admin/NewPage.jsx
import { useState, useEffect } from "react";
import supabase from "../../SupabaseClient";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const NewPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select('*').order('created_at', { ascending: false });
    if (error) { toast.error("Failed to load"); console.error(error); }
    else setData(data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;

  return <div className="p-4">...</div>;
};
export default NewPage;

// 2. Add route in src/App.jsx:
<Route path="/dashboard/new-page" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <NewPage />
  </ProtectedRoute>
} />

// 3. Add sidebar link in src/components/layout/AdminLayout.jsx
```

### Supabase Query Pattern
```javascript
// ALWAYS handle errors, ALWAYS use .select() after insert/update
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
  .order('created_at', { ascending: false });

if (error) {
  toast.error("Something went wrong");
  console.error(error);
  return;
}
```

### WhatsApp Notification Pattern
```javascript
import { sendTaskAssignmentNotification } from "../services/whatsappService";

await sendTaskAssignmentNotification({
  taskType: 'checklist', // checklist | maintenance | repair | ea | delegation
  doerName: 'John',
  taskId: '42',
  description: 'Task description',
  startDate: '2024-01-15',
  givenBy: 'Admin',
  department: 'Sales'
});
```

### Redux Pattern (for core tasks only)
```javascript
// API: src/redux/api/featureApi.js
export const fetchFeature = createAsyncThunk('feature/fetch', async () => {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
});

// Slice: src/redux/slice/featureSlice.js
const featureSlice = createSlice({
  name: "feature",
  initialState: { data: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeature.pending, (s) => { s.loading = true; })
      .addCase(fetchFeature.fulfilled, (s, a) => { s.data = a.payload; s.loading = false; })
      .addCase(fetchFeature.rejected, (s, a) => { s.error = a.error.message; s.loading = false; });
  }
});

// Register in src/redux/store.js
```

---

## ⚠️ CRITICAL GOTCHAS

1. **DO NOT rename these folders** (typos are intentional/legacy — renaming breaks all imports):
   - `Hr-sysytem` (NOT Hr-system)
   - `Daily-Shedular` (NOT Daily-Scheduler)

2. **AuthProvider.jsx** in `src/pages/` is a **LEGACY file** — NOT the active auth system. Active auth is `ProtectedRoute` in `App.jsx`.

3. **Passwords are stored in plaintext** in `users.password` — this is known, migration pending.

4. **CSS import order matters** in `App.jsx` — later imports override earlier ones.

5. **WhatsApp tokens expire** — Meta Cloud API tokens need periodic refresh in `.env`.

6. **Dual attendance schema** — `monthly_attendance` has two versions across different `sql.query` files. Active version uses `day_1..day_31` individual columns.

7. **Large files exist** — Some pages are 50-150KB. They work but are not split. Don't try to refactor them unless asked.

8. **Coal System** renders via `<CoalSystemApp page="dashboard" hideNavigation={true} />` — it takes a `page` prop to switch between internal views.

---

## Environment Variables

```env
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

## Commands

```bash
npm run dev      # Vite dev server → http://localhost:5174
npm run build    # Production build → dist/
npm run lint     # ESLint
npm start        # Express proxy server → port 5000
```

---

## Quick Rules for Code Generation

✅ **DO:**
- Import Supabase from `../../SupabaseClient` (adjust path)
- Use `toast.success()` / `toast.error()` from `react-hot-toast`
- Use Tailwind CSS classes
- Use `lucide-react` for icons
- Handle loading + error states
- Check `src/components/` for existing reusable components
- Follow existing Redux pattern if feature uses Redux
- Use direct Supabase calls for HR / Coal / Petty Cash pages

❌ **DON'T:**
- Don't use Supabase Auth — use custom `users` table auth
- Don't rename legacy folders (`Hr-sysytem`, `Daily-Shedular`)
- Don't create new Redux slices for modules that use direct Supabase calls
- Don't use inline styles (except truly dynamic values)
- Don't skip error handling on Supabase calls
- Don't hardcode API URLs — use env variables
- Don't commit `.env`, `node_modules/`, `dist/`

---

## Related Brain Files

| File | Contents |
|---|---|
| [README.md](./README.md) | Full project overview, structure, setup guide |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 80+ functional requirements + NFRs + role matrix |
| [DATABASE.md](./DATABASE.md) | All 40+ table schemas with columns & relationships |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Supabase queries, WhatsApp API, Google services |
| [PROJECT_RULES.md](./PROJECT_RULES.md) | Coding standards, naming conventions, do's/don'ts |
| [AI_CONTEXT.md](./AI_CONTEXT.md) | General AI assistant context file |

---



