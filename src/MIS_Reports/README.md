# MIS Frontend — Standalone

A self-contained copy of the MIS module from `botivate_os_frontend`
(Next.js 16, React 19, Tailwind v4, shadcn/ui). The original project was not changed.

## Run

```bash
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL to the backend
npm install
npm run dev                   # http://localhost:3000 → /mis/dashboard
```

## What's included

| Path | What |
|---|---|
| `src/features/mis/` | **The MIS module** (components, hooks, API calls, types), copied unchanged |
| `src/app/(dashboard)/(system)/mis/` | MIS routes: dashboard, today_tasks, pending_tasks, history_commitment, kpi_kra, department |
| `src/components/ui/` | Only the shadcn/ui pieces MIS uses |
| `src/features/organization/` | Multi-company helpers (`actAsTenant`, `useCrossCompanyWrite`) |
| `src/features/profile/shared/` | Profile query (loads the logged-in user into Redux) |
| `src/store/`, `src/lib/`, `src/utils/axiosInterceptors.ts` | Redux (user slice), TanStack Query, axios + token refresh |

## Changed vs. the original

- `src/store/store.ts`: keeps only the `userAccount`, `permissions` and `notifications` slices. The C&D and signup slices and redux-persist are gone.
- `src/lib/axios.ts`: no longer refreshes other modules' cached data (purchase, C&D, SFMS and so on) after a save.
- `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/page.tsx`: a minimal shell with a simple top nav instead of the full app sidebar and navbar.
- `next.config.ts`, `package.json`: trimmed to what MIS needs.

## Integrating into another project

- **Backend:** talks to the same Express API. Set `NEXT_PUBLIC_API_URL`.
- **Auth:** uses the backend's `accessToken` cookie (`withCredentials`). There is **no login page** in this copy. On a 401 the interceptor redirects to `/login`, so either provide that route in your project or log in through the main app on the same domain.
- **Logged-in user:** MIS reads `useAppSelector(selectUser)`. The dashboard layout calls `useGetProfileQuery()` to populate it. Keep that call, or set the user yourself, if you replace the layout.
- **Path aliases:** imports use `@/*` → `src/*` (see `tsconfig.json`). Keep the same alias or rewrite imports.
- **Styling:** relies on the theme CSS variables in `src/app/globals.css` (Tailwind v4). Copy them into your project's global CSS.
