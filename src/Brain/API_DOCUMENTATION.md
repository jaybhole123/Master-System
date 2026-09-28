# 📡 API_DOCUMENTATION.md — Jay Bhole Master System

> API endpoints, Supabase queries, and external service integrations documentation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Supabase Client Configuration](#supabase-client-configuration)
- [Authentication API](#authentication-api)
- [Task Management APIs](#task-management-apis)
- [HR System APIs](#hr-system-apis)
- [Coal System APIs](#coal-system-apis)
- [Petty Cash APIs](#petty-cash-apis)
- [Daily Scheduler APIs](#daily-scheduler-apis)
- [Notification APIs](#notification-apis)
- [WhatsApp Service API](#whatsapp-service-api)
- [Google Services APIs](#google-services-apis)
- [Express Proxy Server](#express-proxy-server)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                React Frontend (Vite)              │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Redux    │  │  Zustand  │  │ Direct       │    │
│  │  Toolkit  │  │  (Petty)  │  │ supabase.*() │    │
│  └─────┬────┘  └─────┬────┘  └──────┬───────┘    │
│        │              │              │             │
└────────┼──────────────┼──────────────┼─────────────┘
         │              │              │
         ▼              ▼              ▼
┌──────────────────────────────────────────────────┐
│              Supabase (Backend-as-a-Service)       │
│  ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ PostgreSQL│ │ Realtime │ │ Storage (Files)  │  │
│  │ Database  │ │ (WS)    │ │                  │  │
│  └───────────┘ └──────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────┘
         │
    ┌────┴────────────────────────────┐
    ▼                                 ▼
┌──────────────┐          ┌─────────────────────┐
│ WhatsApp API │          │ Google Apps Script   │
│ (Meta Cloud) │          │ (Sheets/Drive)       │
└──────────────┘          └─────────────────────┘
```

**Data Flow Pattern:**
1. Frontend components dispatch Redux actions or call Supabase directly
2. Redux async thunks (`redux/api/*.js`) contain all Supabase queries
3. Results are stored in Redux slices (`redux/slice/*.js`)
4. Some modules (Petty Cash, Coal System) use Zustand or direct Supabase calls
5. WhatsApp notifications are sent via Meta Cloud API from the frontend

---

## Supabase Client Configuration

**File:** `src/SupabaseClient.js`

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseURL, supabaseKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export default supabase;
```

> Realtime is configured with 10 events/second for live updates (used by `RealtimeLogoutListener`).

---

## Authentication API

**File:** `src/redux/api/loginApi.js`

### Login
```javascript
// Fetches user by username and password from 'users' table
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('user_name', username)
  .eq('password', password)
  .single();
```

**Stored in localStorage after login:**
| Key | Source |
|---|---|
| `user-name` | `userData.user_name` |
| `user-id` | `userData.id` |
| `role` | `userData.role` |
| `email_id` | `userData.email_id` |
| `user_access` | `userData.user_access` |
| `profile_image` | `userData.profile_image` |
| `can_self_assign` | `userData.can_self_assign` |
| `designation` | `userData.Designation` |
| `system_access` | `userData.system_access` |
| `page_access` | `userData.page_access` |

### Forgot Password (OTP via WhatsApp)
```javascript
// Step 1: Verify user exists
const { data } = await supabase.from('users')
  .select('user_name').eq('user_name', username).single();

// Step 2: Generate 6-digit OTP and send via WhatsApp to admin
const otp = Math.floor(100000 + Math.random() * 900000).toString();
await sendPasswordResetOTP(username, otp);

// Step 3: After OTP verification, update password
const { error } = await supabase.from('users')
  .update({ password: newPassword })
  .eq('user_name', username);
```

---

## Task Management APIs

### Common Pattern
All task APIs follow this structure:

```javascript
// File: src/redux/api/{taskType}Api.js
// Each file exports async thunks used by Redux slices

// FETCH tasks
export const fetchTasks = createAsyncThunk('taskType/fetch', async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .order('created_at', { ascending: false });
  return data;
});

// CREATE task
export const createTask = createAsyncThunk('taskType/create', async (taskData) => {
  const { data, error } = await supabase
    .from('table_name')
    .insert([taskData])
    .select();
  return data;
});

// UPDATE task
export const updateTask = createAsyncThunk('taskType/update', async ({ id, updates }) => {
  const { data, error } = await supabase
    .from('table_name')
    .update(updates)
    .eq('task_id', id)  // or .eq('id', id)
    .select();
  return data;
});

// DELETE task
export const deleteTask = createAsyncThunk('taskType/delete', async (id) => {
  const { error } = await supabase
    .from('table_name')
    .delete()
    .eq('task_id', id);
  return id;
});
```

### Quick Task / EA Task API
**File:** `src/redux/api/quickTaskApi.js`, `src/redux/api/eaApi.js`

| Operation | Table | Method |
|---|---|---|
| Fetch all | `ea_tasks` | `select('*').order('created_at', { ascending: false })` |
| Create | `ea_tasks` | `insert([taskData]).select()` |
| Update status | `ea_tasks` | `update({ status }).eq('task_id', id)` |
| Mark done | `ea_tasks_done` | `insert([doneData])` + update `ea_tasks` status |
| Extend | `ea_tasks` | `update({ extended_date, status: 'extended' })` |
| Delete | `ea_tasks` | `delete().eq('task_id', id)` |

### Checklist API
**File:** `src/redux/api/checkListApi.js`

| Operation | Table | Method |
|---|---|---|
| Fetch all | `checklist` | `select('*').order('created_at', { ascending: false })` |
| Create | `checklist` | `insert([data]).select()` |
| Update | `checklist` | `update(data).eq('task_id', id)` |
| Delete | `checklist` | `delete().eq('task_id', id)` |
| Filter by department | `checklist` | `select('*').eq('department', dept)` |

### Delegation API
**File:** `src/redux/api/delegationApi.js`

| Operation | Table | Method |
|---|---|---|
| Fetch active | `delegation` | `select('*').order('created_at', { ascending: false })` |
| Fetch done | `delegation_done` | `select('*').order('created_at', { ascending: false })` |
| Create | `delegation` | `insert([data]).select()` |
| Update | `delegation` | `update(data).eq('task_id', id)` |
| Complete/Extend | `delegation_done` | `insert([data])` + update `delegation` |

### Maintenance API
**File:** `src/redux/api/maintenanceApi.js`

| Operation | Table | Method |
|---|---|---|
| Fetch all | `maintenance_tasks` | `select('*').order('created_at', { ascending: false })` |
| Create | `maintenance_tasks` | `insert([data]).select()` |
| Update | `maintenance_tasks` | `update(data).eq('id', id)` |
| Delete | `maintenance_tasks` | `delete().eq('id', id)` |

### Repair API
**File:** `src/redux/api/repairApi.js`

| Operation | Table | Method |
|---|---|---|
| Fetch all | `repair_tasks` | `select('*').order('created_at', { ascending: false })` |
| Create | `repair_tasks` | `insert([data]).select()` |
| Update | `repair_tasks` | `update(data).eq('id', id)` |

### Dashboard API
**File:** `src/redux/api/dashboardApi.js`

Aggregates data from multiple tables for dashboard statistics:
```javascript
// Fetches counts and summaries from:
// - ea_tasks, ea_tasks_done
// - checklist
// - delegation, delegation_done
// - maintenance_tasks
// - repair_tasks
// - users
```

### Settings API
**File:** `src/redux/api/settingApi.js`

Manages:
- User CRUD (create, update, delete from `users` table)
- Department CRUD (`departments` table)
- Dropdown options CRUD (`dropdown_options` table)
- Assign-from list (`assign_from` table)

---

## HR System APIs

HR system pages make **direct Supabase calls** (no Redux for HR module).

### Employee Master
```javascript
// Fetch all employees
const { data } = await supabase.from('users')
  .select('*')
  .order('display_order', { ascending: true });

// Create employee
const { data } = await supabase.from('users')
  .insert([employeeData]).select();

// Update employee
const { data } = await supabase.from('users')
  .update(updates).eq('id', employeeId).select();
```

### Attendance
```javascript
// Fetch monthly attendance
const { data } = await supabase.from('monthly_attendance')
  .select('*')
  .eq('month_year', monthYear);

// Upsert attendance record
const { data } = await supabase.from('monthly_attendance')
  .upsert(attendanceData, { onConflict: 'employee_id,month_year' });
```

### Leave Management
```javascript
// Fetch leave allotments
const { data } = await supabase.from('leave_allotments')
  .select('*').eq('employee_id', empId);

// Create leave request
const { data } = await supabase.from('leave_requests')
  .insert([leaveData]).select();

// Approve/Reject leave
const { data } = await supabase.from('leave_requests')
  .update({ status: 'Approved' }).eq('id', requestId);
```

### Salary & Payroll
```javascript
// Fetch salary structure
const { data } = await supabase.from('salary_structures')
  .select('*').eq('employee_id', empId);

// Process payroll
const { data } = await supabase.from('processed_payroll')
  .insert([payrollData]).select();

// Fetch payroll settings
const { data } = await supabase.from('payroll_settings')
  .select('*').eq('id', 1).single();
```

### Indent & Inventory
```javascript
// Create indent
const { data: indent } = await supabase.from('indents')
  .insert([{ indent_number, department_name }]).select();

// Add indent items
const { data } = await supabase.from('indent_items')
  .insert(items.map(i => ({ ...i, indent_id: indent[0].id })));

// Fetch inventory
const { data } = await supabase.from('inventory_items')
  .select('*').order('item_name');
```

---

## Coal System APIs

Coal system pages make **direct Supabase calls** from each page component.

### Auctions
```javascript
// Fetch auctions with items
const { data } = await supabase.from('auctions')
  .select('*, auction_items(*)').order('created_at', { ascending: false });

// Create auction
const { data: auction } = await supabase.from('auctions')
  .insert([auctionData]).select();
const { data: items } = await supabase.from('auction_items')
  .insert(itemsData.map(i => ({ ...i, auction_id: auction[0].id })));
```

### SECL Operations
```javascript
// SECL Intimation
const { data } = await supabase.from('secl_intimation_format_1')
  .select('*').order('created_at', { ascending: false });

// SECL Payment Advice
const { data } = await supabase.from('secl_payment_advices')
  .select('*').order('created_at', { ascending: false });
```

### Sales Orders
```javascript
const { data } = await supabase.from('sales_orders')
  .select('*').order('created_at', { ascending: false });
```

### Invoices
```javascript
const { data } = await supabase.from('invoices')
  .select('*').order('created_at', { ascending: false });
```

### Sauda Scale
```javascript
// Sauda Sale
const { data } = await supabase.from('sauda_sale')
  .select('*').order('date', { ascending: false });

// Sauda Purchase
const { data } = await supabase.from('sauda_purchase')
  .select('*').order('date', { ascending: false });

// Sauda Scale 2
const { data } = await supabase.from('sauda_scale_2')
  .select('*').order('created_at', { ascending: false });
```

### Stock & Production
```javascript
// Raw Material Stock
const { data } = await supabase.from('raw_material_stock')
  .select('*').eq('report_date', date).order('created_at');

// Coal Stock
const { data } = await supabase.from('coal_stock')
  .select('*').eq('report_date', date);

// Sponge Production
const { data } = await supabase.from('sponge_production')
  .select('*').eq('report_date', date);

// Item Transfers
const { data } = await supabase.from('item_transfers')
  .select('*').eq('report_date', date);
```

---

## Petty Cash APIs

Petty Cash uses **Zustand store** + direct Supabase calls.

```javascript
// Credits (Add Cash)
const { data } = await supabase.from('petty_cash_addcash_credits')
  .select('*').order('date', { ascending: false });

// Expenses
const { data } = await supabase.from('petty_cash_expenses')
  .select('*').order('date', { ascending: false });

// Approve/Reject Expense
const { data } = await supabase.from('petty_cash_expenses')
  .update({ status: 'APPROVED' }).eq('id', expenseId);

// Settings
const { data } = await supabase.from('petty_cash_setting')
  .select('*');
```

---

## Daily Scheduler APIs

Uses **Context API** (`SchedulerContext`) + direct Supabase calls.

```javascript
// Fetch tasks for a date
const { data } = await supabase.from('tasks')
  .select('*, users(user_name)')
  .eq('date', dateString)
  .order('start_time');

// Create task
const { data } = await supabase.from('tasks')
  .insert([{ description, date, start_time, end_time, assigned_staff, created_by }])
  .select();

// Update task status
const { data } = await supabase.from('tasks')
  .update({ status, actual_done_date: new Date() })
  .eq('id', taskId);

// Someday tasks
const { data } = await supabase.from('someday_tasks')
  .select('*, users(user_name)')
  .order('created_at', { ascending: false });
```

---

## Notification APIs

**File:** `src/redux/api/notificationApi.js`

```javascript
// Create notification
const { data } = await supabase.from('notifications')
  .insert([{ title, message, role_target, created_by }]).select();

// Create user-notification mappings
const { data } = await supabase.from('user_notifications')
  .insert(userIds.map(uid => ({
    user_id: uid,
    notification_id: notifId,
    notification_date: new Date()
  })));

// Fetch user's notifications
const { data } = await supabase.from('user_notifications')
  .select('*, notifications(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Mark as read
const { data } = await supabase.from('user_notifications')
  .update({ is_read: true }).eq('id', notifId);
```

---

## WhatsApp Service API

**File:** `src/services/whatsappService.js`

**Provider:** Meta Cloud API (WhatsApp Business Platform)

**Base URL:** `https://graph.facebook.com/v21.0`

### Send Text Message
```
POST /{PHONE_NUMBER_ID}/messages
Headers: Authorization: Bearer {ACCESS_TOKEN}
Body: {
  messaging_product: "whatsapp",
  to: "91XXXXXXXXXX",
  type: "text",
  text: { preview_url: false, body: "message" }
}
```

### Send Template Message
```
POST /{PHONE_NUMBER_ID}/messages
Body: {
  messaging_product: "whatsapp",
  to: "91XXXXXXXXXX",
  type: "template",
  template: {
    name: "template_name",
    language: { code: "en" },
    components: [{
      type: "body",
      parameters: [{ type: "text", text: "value" }]
    }]
  }
}
```

### Send Voice Message (Audio)
```
POST /{PHONE_NUMBER_ID}/messages
Body: {
  messaging_product: "whatsapp",
  to: "91XXXXXXXXXX",
  type: "audio",
  audio: { link: "https://..." }
}
```

### WhatsApp Templates Used

| Template Name | Parameters | Use Case |
|---|---|---|
| `urgent_task_assigned` | doerName, taskId, description, startDate, givenBy, link | Quick task assignment |
| `new_checklist_task_assign` | doerName, givenBy, department, description, startDate, frequency | Checklist task |
| `maintenance_task_assigned` | doerName, taskId, machineName, partName, department, description, startDate, duration, givenBy, link | Maintenance task |
| `repair_task_notification` | doerName, taskId, machineName, department, description, startDate, duration, givenBy, link | Repair task |
| `ea_task_notification` | doerName, taskId, description, startDate, duration, givenBy, link | EA task |
| `new_delegation_task_assign` | doerName, taskId, givenBy, description, startDate, dueDate | Delegation task |
| `task_extend_notification` | doerName, taskId, description, nextExtendDate, givenBy, link | Task extension |
| `task_completed_notification` | description, completedAt, doerName | Task completion (to admin) |
| `task_rejected_notification` | doerName, taskId, description, reason, link | Task rejection |
| `task_transfer_notification` | doerName, taskId, taskType, department, description, startDate, link, originalDoer | Task reassignment |
| `pending_task_reminder` | doerName, description, dueDate, link | Daily reminder |
| `daily_summary` | doerName, totalTasks, todayTasks, pendingTasks | Daily summary |
| `purchase_delivered` | transporterName, lrNo, date, productName, size1, size2 | Purchase delivery |

### Exported Functions

| Function | Description |
|---|---|
| `sendWhatsAppMessage(phone, message)` | Send free-text message |
| `sendUrgentTaskNotification(details)` | Quick task assigned |
| `sendChecklistTaskNotification(details)` | Checklist task assigned |
| `sendMaintenanceTaskNotification(details)` | Maintenance task assigned |
| `sendRepairTaskNotification(details)` | Repair task assigned |
| `sendEATaskNotification(details)` | EA task assigned |
| `sendDelegationTaskNotification(details)` | Delegation task assigned |
| `sendTaskExtensionNotification(details)` | Task extended |
| `sendTaskCompletionNotification(details)` | Task completed (notify admin) |
| `sendTaskRejectionNotification(details)` | Task rejected |
| `sendTaskReassignmentNotification(details)` | Task reassigned |
| `sendTaskAssignmentNotification(details)` | Smart router — auto-selects template by `taskType` |
| `sendTaskReminderNotification(details)` | Pending task reminder |
| `sendDailyTaskSummaryNotification(details)` | Daily summary |
| `sendPasswordResetOTP(username, otp)` | Password reset OTP to admin |
| `sendAdminExtensionRemarkNotification(details)` | Admin remark on extension |
| `sendPurchaseDeliveredNotification(details)` | Purchase delivery notification |

---

## Google Services APIs

### Google Apps Script
**File:** `.env` → `VITE_GOOGLE_SCRIPT_URL`

Used for:
- Google Sheets data sync
- Google Drive file uploads (subscriptions, loans, renewals)

### Google Drive Folders
| Folder | Env Variable | Purpose |
|---|---|---|
| Main Drive | `VITE_GOOGLE_DRIVE_FOLDER_ID` | General file storage |
| Subscription | `VITE_GOOGLE_SUBSCRIPTION_FOLDER_ID` | Subscription documents |
| Loan | `VITE_GOOGLE_LOAN_FOLDER_ID` | Loan documents |
| Renewal | `VITE_GOOGLE_RENEWAL_FOLDER_ID` | Renewal documents |

---

## Express Proxy Server

**File:** `server.js`

A minimal Express server that proxies requests to Google Apps Script (to bypass CORS).

```
GET /proxy
→ Proxies to Google Apps Script URL
→ Returns JSON response

Server Port: 5000
```

### Start Server
```bash
npm start  # or: node server.js
```

> **Note:** This proxy is only needed for specific Google Sheets integrations. The main app runs on Vite dev server (port 5174).

---

## Supabase Realtime

### RealtimeLogoutListener
**File:** `src/components/RealtimeLogoutListener.jsx`

Subscribes to realtime changes on the `users` table to detect forced logouts:
```javascript
supabase
  .channel('user-status-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'users',
    filter: `id=eq.${userId}`
  }, (payload) => {
    // If user status changed to inactive, force logout
  })
  .subscribe();
```

---

## File Upload (Supabase Storage)

Various components upload files to Supabase Storage buckets:

```javascript
// Upload file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(`path/${fileName}`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('bucket-name')
  .getPublicUrl(`path/${fileName}`);
```

**Common buckets used:**
- Employee documents (Aadhar, PAN, DL, passbook)
- Task proof images
- Voice notes / audio recordings
- Invoice PDFs
- Receipt copies
- Rent agreement documents

---
