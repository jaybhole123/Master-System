import { combineReducers, configureStore } from '@reduxjs/toolkit';
import notificationsReducer from './slice/notificationsSlice';
import permissionsReducer from './slice/permissionsSlice';
import userAccountReducer from './slice/userAccountData';

// Slim store for the standalone IMS copy — only the slices IMS (and the
// shared auth interceptor) actually read. The full app also registers
// dashBoard / quickTask / signup slices from other modules.
const rootReducer = combineReducers({
  userAccount: userAccountReducer,
  permissions: permissionsReducer,
  notifications: notificationsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
