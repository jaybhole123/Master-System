# 📏 PROJECT_RULES.md — Jay Bhole Master System

> Coding standards, conventions, naming rules, and best practices for the project.

---

## Table of Contents

- [General Rules](#general-rules)
- [Folder & File Naming](#folder--file-naming)
- [Component Rules](#component-rules)
- [State Management Rules](#state-management-rules)
- [Supabase / Database Rules](#supabase--database-rules)
- [Routing Rules](#routing-rules)
- [Styling Rules](#styling-rules)
- [Git & Version Control](#git--version-control)
- [Security Rules](#security-rules)
- [WhatsApp Integration Rules](#whatsapp-integration-rules)
- [Performance Rules](#performance-rules)
- [Do's and Don'ts](#dos-and-donts)

---

## General Rules

1. **Language:** JavaScript (JSX) for most code. TypeScript (TSX) only for the `modules/document` module.
2. **Framework:** React 18.3 with functional components and hooks only (no class components).
3. **Build Tool:** Vite 7.0 — never modify `vite.config.js` without discussion.
4. **Port:** Dev server runs on **port 5174** (`vite --host`).
5. **No console.log in production:** Remove debug logs before committing (except in `whatsappService.js` where they are intentional).
6. **Always handle errors:** Every `supabase` call must have error handling with user-facing toast feedback.

---

## Folder & File Naming

### Folder Names
| Pattern | Example | Usage |
|---|---|---|
| PascalCase | `CoalSystem/`, `HelpSlip/` | Sub-system/module folders |
| kebab-case | `Daily-Shedular/`, `Petty-Cash/`, `Hr-sysytem/` | Hyphenated sub-systems (legacy, keep as-is) |
| lowercase | `pages/`, `components/`, `redux/`, `services/` | Standard React folders |

> ⚠️ **Note:** `Hr-sysytem` and `Daily-Shedular` have typos in folder names. Do NOT rename them — it will break imports across the entire project.

### File Names
| Pattern | Example | Usage |
|---|---|---|
| PascalCase.jsx | `LoginPage.jsx`, `AdminLayout.jsx` | React page/component files |
| camelCase.js | `whatsappService.js`, `loginApi.js` | Utility / service / API files |
| kebab-case.jsx | `delegation-data.jsx`, `admin-data-page.jsx` | Some legacy page files |
| PascalCase.tsx | `DocumentRoutes.tsx`, `App.tsx` | TypeScript files (document module only) |

### Naming Convention for New Files
- **Pages:** `PascalCase.jsx` (e.g., `SaudaScalePage.jsx`)
- **Components:** `PascalCase.jsx` (e.g., `SearchableSelect.jsx`)
- **Redux API files:** `camelCase + Api.js` (e.g., `delegationApi.js`)
- **Redux Slice files:** `camelCase + Slice.js` (e.g., `delegationSlice.js`)
- **Services:** `camelCase + Service.js` (e.g., `whatsappService.js`)
- **SQL files:** `sql.query` (one per module root)
- **CSS files:** `kebab-case.css` or match component name

---

## Component Rules

### 1. Component Structure
Every page component should follow this order:
```jsx
// 1. Imports
import { useState, useEffect } from "react";
import supabase from "../SupabaseClient";

// 2. Component function
const MyPage = () => {
  // 3. State declarations
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4. Data fetching
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // ...
  };

  // 5. Event handlers
  const handleSubmit = async () => {
    // ...
  };

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// 7. Export
export default MyPage;
```

### 2. Component Guidelines
- **One component per file** (with small helper components allowed in same file)
- **Use functional components** with hooks
- **Keep components focused** — if a file exceeds ~500 lines, consider splitting
- **Use `react-hot-toast`** for user feedback (success, error, info)
- **Use `lucide-react`** for icons (not Font Awesome in new code)
- **Always show loading states** when fetching data

### 3. Props
- Destructure props in function parameters
- Use default values for optional props
- Document complex props with comments

---

## State Management Rules

### When to Use What

| Use Case | Tool | Location |
|---|---|---|
| Core task management (Quick, Delegation, Checklist, etc.) | **Redux Toolkit** | `redux/api/` + `redux/slice/` |
| Login state | **Redux Toolkit** | `redux/slice/loginSlice.js` |
| User session data | **localStorage** | Set on login, read everywhere |
| Petty Cash | **Zustand** | `Petty-Cash/src/store/` |
| Daily Scheduler | **React Context** | `Daily-Shedular/src/context/` |
| Document module | **Zustand** | `modules/document/store/` |
| HR, Coal, other sub-systems | **Local state** (useState) | Direct Supabase calls in components |
| Toast messages | **React Context** | `context/MagicToastContext.jsx` |

### Redux Rules
1. **API files** (`redux/api/*.js`) contain all async thunks with Supabase queries
2. **Slice files** (`redux/slice/*.js`) define state shape, reducers, and extra reducers
3. **Never call Supabase directly** from a component if the feature uses Redux — go through the API/slice
4. **Store is configured** in `redux/store.js` — add new slices there
5. **Use `createAsyncThunk`** for all async operations

### localStorage Keys
| Key | Type | Description |
|---|---|---|
| `user-name` | string | Logged-in username |
| `user-id` | string | User ID |
| `role` | string | User role |
| `email_id` | string | Email |
| `user_access` | string | Access level |
| `profile_image` | string | Profile image URL |
| `can_self_assign` | string | "true"/"false" |
| `designation` | string | Job designation |
| `system_access` | string | System access permissions |
| `page_access` | string | Page access permissions |

---

## Supabase / Database Rules

1. **Single client instance:** Always import from `src/SupabaseClient.js`
2. **Never use service_role key** in frontend code
3. **Always use `.select()` after `.insert()` and `.update()`** to get returned data
4. **Handle errors explicitly:**
   ```jsx
   const { data, error } = await supabase.from('table').select('*');
   if (error) {
     toast.error("Failed to load data");
     console.error(error);
     return;
   }
   ```
5. **Use `.single()`** when expecting exactly one row
6. **Use `.order()`** for consistent list ordering
7. **Date formats:** Store as ISO timestamps (timestamptz) or `date` type. Display using `date-fns` for formatting.
8. **File uploads:** Use Supabase Storage with descriptive bucket/path names
9. **SQL schema files** (`sql.query`) are for documentation only — never run them directly

### Table Naming
- **snake_case** for all table and column names
- **Plural** table names (e.g., `users`, `tasks`, `auctions`)
- **_done** suffix for completed/history tables (e.g., `ea_tasks_done`, `delegation_done`)
- **_setting** suffix for settings tables (e.g., `petty_cash_setting`, `payroll_settings`)

---

## Routing Rules

### Route Structure
All routes are defined in `src/App.jsx`:

| Prefix | Module | Wrapper |
|---|---|---|
| `/login` | Auth | None (public) |
| `/master-dashboard` | SuperAdmin | `ProtectedRoute + SuperAdminRoute` |
| `/dashboard/*` | Core system | `ProtectedRoute` (+ `allowedRoles` where needed) |
| `/hr/*` | HR System | `HrWrapper` (ProtectedRoute + AdminLayout) |
| `/letter/*` | Letters | `HrWrapper` |
| `/petty-cash/*` | Petty Cash | `PettyWrapper` (ProtectedRoute + AdminLayout) |
| `/daily-scheduler/*` | Scheduler | `DailySchedulerWrapper` (ProtectedRoute + SchedulerProvider + AdminLayout) |
| `/coal-system/*` | Coal | `CoalSystemWrapper` (ProtectedRoute + AdminLayout noPadding) |
| `/document/*`, `/subscription/*`, `/loan/*`, `/bg/*` | Documents | `DocumentRoutes` (DocumentLayout + AdminLayout) |

### Route Protection
```jsx
// Open to all authenticated users
<ProtectedRoute>
  <Component />
</ProtectedRoute>

// Restricted to specific roles
<ProtectedRoute allowedRoles={["admin", "HOD"]}>
  <Component />
</ProtectedRoute>

// SuperAdmin only
<SuperAdminRoute>
  <Component />
</SuperAdminRoute>
```

### Adding New Routes
1. Import the page component in `App.jsx`
2. Add a `<Route>` inside the `<Routes>` block
3. Wrap with appropriate `ProtectedRoute` and `allowedRoles`
4. If it's a sub-system page, use the correct wrapper (`HrWrapper`, `PettyWrapper`, etc.)

---

## Styling Rules

1. **Primary framework:** Tailwind CSS 4.0
2. **Use Tailwind utilities** for most styling
3. **Custom CSS** goes in module-level `index.css` or `App.css` files
4. **Color palette:** Follow existing red/slate theme (login page uses `red-600`, `slate-800`)
5. **Responsive design:** Always use `sm:`, `md:`, `lg:` breakpoints
6. **Animations:** Use `framer-motion` for complex animations, Tailwind for simple transitions
7. **Icons:** Use `lucide-react` (primary) or `@fortawesome/fontawesome-free` (legacy)
8. **UI Components:** Use `shadcn/ui` components via `@radix-ui` primitives

### CSS Import Order in App.jsx
```jsx
import "./index.css"                    // Global
import "./Hr-sysytem/src/index.css"     // HR
import "./Hr-sysytem/src/App.css"       // HR
import "./Petty-Cash/src/index.css"     // Petty Cash
import "./Daily-Shedular/src/index.css" // Scheduler
import "./Daily-Shedular/src/App.css"   // Scheduler
import "./CoalSystem/src/index.css"     // Coal
import "./CoalSystem/src/App.css"       // Coal
```
> ⚠️ Order matters — later imports override earlier ones.

---

## Git & Version Control

1. **Never commit `.env`** — it contains API keys and secrets
2. **Never commit `node_modules/`** or `dist/`
3. **Write meaningful commit messages:**
   - `feat: add sauda scale page to coal system`
   - `fix: resolve payslip calculation error`
   - `refactor: extract WhatsApp template logic`
4. **Branch naming:** `feature/feature-name`, `fix/bug-description`, `hotfix/critical-fix`
5. **Pull before push:** Always `git pull` before pushing

---

## Security Rules

1. **API keys:** Only `VITE_`-prefixed env variables are exposed to the client. Never expose service_role keys.
2. **Authentication:** Custom auth via `users` table (NOT Supabase Auth). Session stored in localStorage.
3. **Passwords:** Currently stored in plaintext — should be migrated to hashed storage.
4. **RLS:** Enable Row Level Security on sensitive tables.
5. **CORS:** Express proxy (`server.js`) has `cors()` enabled — restrict origins in production.
6. **WhatsApp tokens:** Access tokens expire periodically — update in `.env` when refreshed.

---

## WhatsApp Integration Rules

1. **Template messages** must be pre-approved in Meta Business Manager
2. **Template language fallback:** If `en` fails, try `en_US` then `en_GB`
3. **Phone number format:** Always use international format without `+` (e.g., `919131749390`)
4. **Rate limiting:** WhatsApp has messaging limits — don't spam
5. **Audio messages:** Send as separate message after a 1-second delay
6. **Admin number** for OTP: Hardcoded in `sendPasswordResetOTP` — update if admin changes
7. **Enable/disable toggle:** Set `ENABLE_WHATSAPP = true/false` in `whatsappService.js`

---

## Performance Rules

1. **Avoid fetching all data on mount** — paginate large tables
2. **Use `.select('column1, column2')` instead of `.select('*')`** where possible to reduce payload
3. **Debounce search inputs** (use 300ms delay)
4. **Memoize expensive calculations** with `useMemo`
5. **Use `React.lazy()` for code-splitting** sub-systems (planned improvement)
6. **Optimize images** before uploading to Supabase Storage
7. **Limit Realtime subscriptions** — only subscribe to channels you need

---

## Do's and Don'ts

### ✅ Do's
- ✅ Handle loading and error states in every page
- ✅ Show toast notifications for all user actions
- ✅ Use existing components (SearchableSelect, CalendarComponent, etc.) before creating new ones
- ✅ Follow the existing pattern when adding new task types
- ✅ Test on both desktop and mobile viewports
- ✅ Keep SQL schema files (`sql.query`) updated when modifying database tables
- ✅ Use `date-fns` for date formatting (not `moment.js`)
- ✅ Export PDF where required (jsPDF + html2canvas)
- ✅ Send WhatsApp notifications for task-related events

### ❌ Don'ts
- ❌ Don't rename legacy folders (`Hr-sysytem`, `Daily-Shedular`) — it breaks imports
- ❌ Don't use Supabase Auth — the project uses custom auth via `users` table
- ❌ Don't store sensitive data in localStorage beyond session needs
- ❌ Don't create new Redux slices for modules that use direct Supabase calls (HR, Coal)
- ❌ Don't use inline styles except for truly dynamic values
- ❌ Don't skip error handling on Supabase calls
- ❌ Don't hardcode API URLs — use environment variables
- ❌ Don't commit `.env`, `node_modules/`, or `dist/`
- ❌ Don't add new dependencies without discussion

---
