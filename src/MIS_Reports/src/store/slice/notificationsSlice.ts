import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isOpen: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<AppNotification[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const idx = state.items.findIndex((n) => n.id === action.payload);
      if (idx !== -1) {
        if (!state.items[idx]?.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.items.splice(idx, 1);
      }
    },
    togglePanel: (state) => {
      state.isOpen = !state.isOpen;
    },
    closePanel: (state) => {
      state.isOpen = false;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  togglePanel,
  closePanel,
} = notificationsSlice.actions;

export const selectNotifications = (state: { notifications: NotificationsState }) =>
  state.notifications.items;
export const selectUnreadCount = (state: { notifications: NotificationsState }) =>
  state.notifications.unreadCount;
export const selectNotificationPanelOpen = (state: { notifications: NotificationsState }) =>
  state.notifications.isOpen;

export default notificationsSlice.reducer;
