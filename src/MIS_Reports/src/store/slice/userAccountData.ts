import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Role } from '@/types/permissions';

// Session-only persistence (sessionStorage — cleared when the tab closes,
// never persisted beyond that) for the user's own explicit orgViewMode
// choice, so it survives an ordinary page refresh. Without this, orgViewMode
// only ever lived in in-memory Redux state, which resets to the hardcoded
// default below on every full reload — the one-shot SKIP_AUTO_ALL_VIEW_KEY
// flag in useAutoDefaultOrgViewMode.ts only covers the single reload
// immediately triggered by switching companies, so any refresh after that
// found no flag left and fell through to "auto-default a multi-company
// person to All", silently overriding a company the user had explicitly
// picked. This persists the real value across every refresh, not just one.
const ORG_VIEW_MODE_STORAGE_KEY = 'botivate_org_view_mode';

function readPersistedOrgViewMode(): 'single' | 'all' | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ORG_VIEW_MODE_STORAGE_KEY);
    return raw === 'single' || raw === 'all' ? raw : null;
  } catch {
    return null;
  }
}

function persistOrgViewMode(mode: 'single' | 'all') {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ORG_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Private browsing / storage disabled — falls back to in-memory-only
    // behavior (today's behavior), never breaks the app.
  }
}

function clearPersistedOrgViewMode() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ORG_VIEW_MODE_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string | null;
}

export interface UserData {
  id: string;
  email: string;
  fullName: string;
  role: Role | null;
  mobile?: string;
  companyName?: string;
  employeeId?: string;
  tenantId?: string;
  createdAt?: string | Date;
  lastLogin?: string | Date;
  isActive?: boolean;
  isEmailVerified?: boolean;
  status?: string;
  mustChangePassword?: boolean;
  hasSeenSuperAdminTour?: boolean;
  reportingPerson?: string;
  hodName?: string;
  weekendOff?: string;
  department?: DepartmentInfo | null;
  userDepartments?: { department: DepartmentInfo }[];
  // Non-null only for the auto-provisioned SUPERADMIN identity an org admin
  // gets inside a company under an Organization (see OrgCompanyMembership on
  // the backend) — null for every standalone/individual company's users.
  orgAdminAccountId?: string | null;
  // Non-null only for an ordinary employee granted real access to 2+
  // companies under one shared login (see UserIdentity on the backend) —
  // null for every single-company user, including a normal org owner's own
  // per-company SUPERADMIN row. Drives LinkedCompanyBanner.tsx. A person is
  // never both this and orgAdminAccountId at once.
  identityId?: string | null;
  [key: string]: unknown;
}

interface UserAccountState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Client-only view preference: 'single' (current tenant, the default) or
  // 'all' (merged across every company this person has access to). Shared
  // by two independent populations that are never the same person — an org
  // owner (CompanySwitcher.tsx, driven by user.orgAdminAccountId) and an
  // ordinary multi-company identity user (LinkedCompanyBanner.tsx, driven
  // by user.identityId) — since both drive the exact same
  // X-Org-View-Mode header (axiosInterceptors.ts) and the backend resolves
  // whichever membership check actually applies to the caller (Section 11).
  // Deliberately a sibling of `user`, not a field on it — `user` gets fully
  // replaced on every setUser/profile refresh (the backend never returns
  // this), so storing it there would silently reset it back to undefined on
  // the next refresh. Inert (never read or set) for every individual
  // company and every normal single-company user — both gating fields are
  // null for them.
  orgViewMode: 'single' | 'all';
  // Once true, useAutoDefaultOrgViewMode.ts stops touching orgViewMode for
  // the rest of this session — set the instant orgViewMode is first decided,
  // whether that's the auto-default to 'all' for a multi-company person or
  // an explicit dropdown click (setOrgViewMode below sets this too). Reset
  // only on logout, so a fresh login gets a fresh auto-default decision.
  orgViewModeDefaulted: boolean;
  // Flips true when any page's mutating action (add/edit/delete) is blocked
  // because orgViewMode is 'all' — see useRequireCompanySelected.ts.
  // CompanySelectSpotlight.tsx watches this to fire its one-step joyride
  // pointing at the switcher, then flips it back off.
  companySelectPromptOpen: boolean;
}

const persistedOrgViewMode = readPersistedOrgViewMode();

const initialState: UserAccountState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  orgViewMode: persistedOrgViewMode ?? 'single',
  // A persisted value means this session already knows the right mode —
  // useAutoDefaultOrgViewMode.ts must not override it with its own
  // "default a multi-company person to All" logic on this boot.
  orgViewModeDefaulted: persistedOrgViewMode !== null,
  companySelectPromptOpen: false,
};

// orgViewMode (in memory AND in its sessionStorage persistence) is set
// independently of `user` — nothing about the value itself says WHICH
// account it belongs to. sessionStorage survives across a token
// refresh/re-login in the same tab (it's only cleared on an explicit
// logoutUser dispatch, see below), so if this browser session ever had an
// Organization owner or identity-linked multi-company user switch to "All
// Companies", then a DIFFERENT, plain individual account subsequently loads
// in that same tab without an intervening logout, it would silently inherit
// 'all' — even though it has neither orgAdminAccountId nor identityId, the
// only two fields anything else in this feature ever gates on. Every
// consumer of orgViewMode (CompanySelectField's callers, useRequireCompanySelected,
// etc.) trusts the flag at face value and never re-derives eligibility
// itself, so this is the one place that must catch it: the instant a real
// user becomes known, force the flag back in line with what THAT user is
// actually allowed to see.
function reconcileOrgViewModeWithUser(state: UserAccountState) {
  const eligible = Boolean(state.user?.orgAdminAccountId) || Boolean(state.user?.identityId);
  if (!eligible && state.orgViewMode === 'all') {
    state.orgViewMode = 'single';
    state.orgViewModeDefaulted = false;
    clearPersistedOrgViewMode();
  }
}

const userAccountSlice = createSlice({
  name: 'userAccount',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserData>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      reconcileOrgViewModeWithUser(state);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.orgViewMode = 'single';
      state.orgViewModeDefaulted = false;
      clearPersistedOrgViewMode();
    },
    updateProfile: (state, action: PayloadAction<Partial<UserData>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        reconcileOrgViewModeWithUser(state);
      }
    },
    setOrgViewMode: (state, action: PayloadAction<'single' | 'all'>) => {
      state.orgViewMode = action.payload;
      state.orgViewModeDefaulted = true;
      persistOrgViewMode(action.payload);
    },
    // Consumes a "skip the auto-default" signal (see useAutoDefaultOrgViewMode.ts)
    // without changing orgViewMode's actual value — used right after an
    // explicit "enter/switch to Company X" reload, which already landed the
    // session on that single company and must not be flipped to 'all'.
    markOrgViewModeDefaulted: (state) => {
      state.orgViewModeDefaulted = true;
      persistOrgViewMode(state.orgViewMode);
    },
    setCompanySelectPromptOpen: (state, action: PayloadAction<boolean>) => {
      state.companySelectPromptOpen = action.payload;
    },
  },
});

export const {
  setUser,
  setLoading,
  setError,
  logoutUser,
  updateProfile,
  setOrgViewMode,
  markOrgViewModeDefaulted,
  setCompanySelectPromptOpen,
} = userAccountSlice.actions;

// Selectors
export const selectUser = (state: { userAccount: UserAccountState }) => state.userAccount.user;
export const selectIsAuthenticated = (state: { userAccount: UserAccountState }) =>
  state.userAccount.isAuthenticated;
export const selectIsUserLoading = (state: { userAccount: UserAccountState }) =>
  state.userAccount.isLoading;
export const selectUserError = (state: { userAccount: UserAccountState }) =>
  state.userAccount.error;
export const selectOrgViewMode = (state: { userAccount: UserAccountState }) =>
  state.userAccount.orgViewMode;
export const selectOrgViewModeDefaulted = (state: { userAccount: UserAccountState }) =>
  state.userAccount.orgViewModeDefaulted;
export const selectCompanySelectPromptOpen = (state: { userAccount: UserAccountState }) =>
  state.userAccount.companySelectPromptOpen;

export default userAccountSlice.reducer;
