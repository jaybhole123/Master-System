import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Role, SystemPermission, UserPermissionsData } from '@/types/permissions';

interface PermissionsState {
  role: Role | null;
  systems: SystemPermission[];
  isLoaded: boolean;
}

const initialState: PermissionsState = {
  role: null,
  systems: [],
  isLoaded: false,
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissions: (state, action: PayloadAction<UserPermissionsData>) => {
      state.role = action.payload.role;
      state.systems = action.payload.systems;
      state.isLoaded = true;
    },
    clearPermissions: (state) => {
      state.role = null;
      state.systems = [];
      state.isLoaded = false;
    },
    updateSystemPermission: (state, action: PayloadAction<SystemPermission>) => {
      const index = state.systems.findIndex((sys) => sys.id === action.payload.id);
      if (index !== -1) {
        state.systems[index] = action.payload;
      }
    },
  },
});

export const { setPermissions, clearPermissions, updateSystemPermission } =
  permissionsSlice.actions;

// Selectors
export const selectUserRole = (state: { permissions: PermissionsState }) => state.permissions.role;

export const selectAllSystems = (state: { permissions: PermissionsState }) =>
  state.permissions.systems;

export const selectIsPermissionsLoaded = (state: { permissions: PermissionsState }) =>
  state.permissions.isLoaded;

export const selectSystemByKey =
  (systemKey: string) => (state: { permissions: PermissionsState }) =>
    state.permissions.systems.find((sys) => sys.key === systemKey);

export const selectSectionPermission =
  (systemKey: string, sectionKey: string) => (state: { permissions: PermissionsState }) => {
    const system = state.permissions.systems.find((sys) => sys.key === systemKey);
    return system?.sections.find((sec) => sec.key === sectionKey);
  };

export default permissionsSlice.reducer;
