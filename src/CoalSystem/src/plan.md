
## Implementation Plan

### Layout Change: Sidebar-based App Shell

**Reference**: Coal ERP sidebar (dark theme, ember accent)

### Pages to build:
1. **Dashboard** — stats cards + welcome
2. **Payment Advice Reader** — existing PDF upload + results
3. **Upload History** — placeholder page
4. **Reports** — placeholder page
5. **Settings** — placeholder page

### Component structure:
- `Sidebar.jsx` — fixed left nav with collapsible groups
- `Topbar.jsx` — page title left + user avatar right
- `pages/Dashboard.jsx`
- `pages/PaymentAdvicePage.jsx` (existing logic moved here)
- `pages/HistoryPage.jsx`
- `pages/ReportsPage.jsx`
- `pages/SettingsPage.jsx`
- `App.jsx` — layout shell (sidebar + topbar + page content)

### CSS changes:
- `.layout` = `display: grid; grid-template-columns: 240px 1fr`
- Sidebar fixed height, scrollable nav
- Topbar: `position: sticky; top: 0`
