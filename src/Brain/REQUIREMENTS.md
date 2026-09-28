# 📋 REQUIREMENTS.md — Jay Bhole Master System

> Complete functional and non-functional requirements for the Jay Bhole Master System.

---

## 1. Functional Requirements

### 1.1 Authentication & Authorization

| ID | Requirement | Status |
|---|---|---|
| AUTH-01 | Users must log in with username and password (verified against Supabase `users` table) | ✅ Done |
| AUTH-02 | After login, user data (name, role, designation, system_access, page_access) stored in `localStorage` | ✅ Done |
| AUTH-03 | SuperAdmin (role=`superadmin` or username=`admin`) redirects to Master Dashboard | ✅ Done |
| AUTH-04 | Regular users redirect to Profile Page after login | ✅ Done |
| AUTH-05 | Role-based route protection: `superadmin`, `admin`, `HOD`, `user` | ✅ Done |
| AUTH-06 | Custom `system_access` and `page_access` fields for granular permission control | ✅ Done |
| AUTH-07 | Forgot password flow via WhatsApp OTP to admin | ✅ Done |
| AUTH-08 | Realtime logout listener — if user is logged out from another session/tab, auto-logout | ✅ Done |
| AUTH-09 | Password stored in plaintext in `users` table (matched on login) | ⚠️ Active (not hashed) |

### 1.2 Task Management

#### 1.2.1 Quick Task
| ID | Requirement | Status |
|---|---|---|
| QT-01 | Create quick/urgent tasks assigned to any user | ✅ Done |
| QT-02 | Task fields: doer name, description, planned date, status, given_by, duration | ✅ Done |
| QT-03 | Task statuses: `pending`, `done`, `extended` | ✅ Done |
| QT-04 | WhatsApp notification on task assignment | ✅ Done |
| QT-05 | Audio/voice note attachment support | ✅ Done |
| QT-06 | Image proof upload on task completion | ✅ Done |
| QT-07 | Admin approval workflow (admin_done flag) | ✅ Done |

#### 1.2.2 Checklist Task
| ID | Requirement | Status |
|---|---|---|
| CL-01 | Recurring/periodic tasks with frequency (daily, weekly, monthly, etc.) | ✅ Done |
| CL-02 | Enable reminder toggle per task | ✅ Done |
| CL-03 | Require attachment toggle per task | ✅ Done |
| CL-04 | Instruction attachment support (URL + type) | ✅ Done |
| CL-05 | Department-based filtering | ✅ Done |

#### 1.2.3 Delegation Task
| ID | Requirement | Status |
|---|---|---|
| DL-01 | Delegate tasks with start date, planned date, and submission tracking | ✅ Done |
| DL-02 | Task extension workflow (next_extend_date, reason) | ✅ Done |
| DL-03 | `delegation_done` table for completed/extended task history | ✅ Done |
| DL-04 | Color coding support for task priority | ✅ Done |
| DL-05 | Admin approval with approval date and approved_by tracking | ✅ Done |

#### 1.2.4 Maintenance Task
| ID | Requirement | Status |
|---|---|---|
| MT-01 | Machine-based maintenance tasks (machine_name, part_name, part_area) | ✅ Done |
| MT-02 | Buddy system — assign secondary person | ✅ Done |
| MT-03 | Frequency and reminder support | ✅ Done |
| MT-04 | Delay tracking | ✅ Done |

#### 1.2.5 Repair Task
| ID | Requirement | Status |
|---|---|---|
| RP-01 | Record machine breakdowns with issue description | ✅ Done |
| RP-02 | Track part replacements and vendor details | ✅ Done |
| RP-03 | Bill amount and bill copy upload | ✅ Done |
| RP-04 | Work photo upload | ✅ Done |

#### 1.2.6 EA Task (Executive Assistant)
| ID | Requirement | Status |
|---|---|---|
| EA-01 | Tasks with end_date support | ✅ Done |
| EA-02 | Dedicated status flow: pending → done/extended | ✅ Done |
| EA-03 | Done tasks move to `ea_tasks_done` with FK reference | ✅ Done |

#### 1.2.7 Common Task Features
| ID | Requirement | Status |
|---|---|---|
| TF-01 | All task types support WhatsApp notifications (assignment, extension, completion, rejection, reassignment) | ✅ Done |
| TF-02 | Voice note recording and playback | ✅ Done |
| TF-03 | Admin approval workflow across all task types | ✅ Done |
| TF-04 | Task reassignment / shift to another user | ✅ Done |
| TF-05 | Daily task summary WhatsApp notification | ✅ Done |
| TF-06 | Calendar view for task visualization | ✅ Done |
| TF-07 | MIS Report generation | ✅ Done |
| TF-08 | Bulk import via Excel/CSV (BulkImportModal) | ✅ Done |
| TF-09 | Role-based data pages (Director, COO, Admin, Account, Jockey, Purchase, Service, Warehouse, Managing Director) | ✅ Done |

### 1.3 HR System

| ID | Requirement | Status |
|---|---|---|
| HR-01 | Employee Master — full profile (personal, bank, documents, photos) | ✅ Done |
| HR-02 | Document uploads (Aadhar, PAN, DL, Bank passbook) stored in Supabase Storage | ✅ Done |
| HR-03 | Monthly attendance tracking (day_1 to day_31 grid or JSON-based) | ✅ Done |
| HR-04 | Leave management (CL, SL, EL) with allotments and request/approval workflow | ✅ Done |
| HR-05 | Salary structure per employee (Basic, HRA, Allowances, PF, ESIC, P.Tax) | ✅ Done |
| HR-06 | Payroll processing with auto-calculation of deductions | ✅ Done |
| HR-07 | Net salary view with detailed breakdown | ✅ Done |
| HR-08 | Payslip generation (PDF via jsPDF) | ✅ Done |
| HR-09 | Bank transfer sheet generation | ✅ Done |
| HR-10 | Indent creation (department-wise procurement requests with items) | ✅ Done |
| HR-11 | Inventory management (item stock with categories & units) | ✅ Done |
| HR-12 | Offer letter generation (company-wise templates) | ✅ Done |
| HR-13 | Coal-specific offer letter template | ✅ Done |
| HR-14 | Employee joining workflow | ✅ Done |
| HR-15 | Work order generation | ✅ Done |

### 1.4 Coal Trading System

| ID | Requirement | Status |
|---|---|---|
| CS-01 | Auction management — record coal auctions with bid dates, coal company, mine details | ✅ Done |
| CS-02 | Auction items — mine, coal grade, quantity offered, base price | ✅ Done |
| CS-03 | SECL Intimation — bidder info, grade/size, winning bid price, PDF upload | ✅ Done |
| CS-04 | SECL Payment Advice — payment breakdowns (TCS, requisite payment, grand total) | ✅ Done |
| CS-05 | Sales Order management — order numbers, quantity, rate, royalty, DMF, NEMT, TCS | ✅ Done |
| CS-06 | Dispatch tracking | ✅ Done |
| CS-07 | Invoice management — full GST invoice (IRN, E-way bill, CGST/SGST/IGST) | ✅ Done |
| CS-08 | Transport payment tracking | ✅ Done |
| CS-09 | Refund/Lapse management | ✅ Done |
| CS-10 | Sauda Scale — buy/sell deal tracking with broker, delivery terms, payment conditions | ✅ Done |
| CS-11 | Sauda Purchase — order quantity, rate per MT, quantity received, balance pending | ✅ Done |
| CS-12 | Raw material stock tracking (opening, inward, consumption, crushing, fines, closing) | ✅ Done |
| CS-13 | Coal stock tracking (FC, moisture loss, landed cost) | ✅ Done |
| CS-14 | Sponge production tracking (kiln-wise) | ✅ Done |
| CS-15 | Item transfers (incoming/outgoing with party, vehicle, qty, rate) | ✅ Done |

### 1.5 Petty Cash System

| ID | Requirement | Status |
|---|---|---|
| PC-01 | Add cash credits (person, date, amount, payment mode, receipt) | ✅ Done |
| PC-02 | Record expenses (person, particulars, amount, group head, receipt) | ✅ Done |
| PC-03 | Expense approval workflow (PENDING → APPROVED/REJECTED) | ✅ Done |
| PC-04 | Running balance calculation | ✅ Done |
| PC-05 | Ledger view with filtering | ✅ Done |
| PC-06 | Summary reports | ✅ Done |
| PC-07 | Settings — manage group heads and payment modes | ✅ Done |

### 1.6 Daily Scheduler

| ID | Requirement | Status |
|---|---|---|
| DS-01 | Create tasks assigned to staff with date, start/end time | ✅ Done |
| DS-02 | Task statuses: Pending, In Progress, Completed, Not Done, Overdue | ✅ Done |
| DS-03 | Waiting list for unscheduled tasks | ✅ Done |
| DS-04 | Someday/Maybe tasks (priority, category, assigned staff) | ✅ Done |
| DS-05 | Full calendar view | ✅ Done |
| DS-06 | Reports and analytics | ✅ Done |

### 1.7 Document & Subscription Module

| ID | Requirement | Status |
|---|---|---|
| DM-01 | Document management — upload, renewal tracking, shared documents | ✅ Done |
| DM-02 | Insurance master data | ✅ Done |
| DM-03 | Vehicle reports | ✅ Done |
| DM-04 | Reminder calendar for document renewals | ✅ Done |
| DM-05 | Car insurance management | ✅ Done |
| DM-06 | Subscription tracking — all subscriptions, approval, payment, renewal | ✅ Done |
| DM-07 | Loan management — all loans, foreclosure, NOC | ✅ Done |
| DM-08 | Bank Guarantee (BG) management | ✅ Done |
| DM-09 | Resource manager | ✅ Done |
| DM-10 | Master page for settings | ✅ Done |

### 1.8 Other Features

| ID | Requirement | Status |
|---|---|---|
| OT-01 | Help Slip — employees submit challenges with 3 proposed solutions, admin replies | ✅ Done |
| OT-02 | Rent Management — property master with monthly rent tracking | ✅ Done |
| OT-03 | Insurance Policies — company, type, premium, sum assured, coverage dates | ✅ Done |
| OT-04 | Holiday List management | ✅ Done |
| OT-05 | Working Day Calendar | ✅ Done |
| OT-06 | In-app notification system (with read/unread tracking per user) | ✅ Done |
| OT-07 | Training videos page | ✅ Done |
| OT-08 | Profile page with editable user details | ✅ Done |

---

## 2. Non-Functional Requirements

### 2.1 Performance
| ID | Requirement | Status |
|---|---|---|
| NFR-01 | Page load time under 3 seconds on 4G network | ✅ Done (Vite optimized) |
| NFR-02 | Lazy loading for sub-system modules | ⬜ Planned |
| NFR-03 | Image compression before upload | ⬜ Planned |

### 2.2 Security
| ID | Requirement | Status |
|---|---|---|
| NFR-04 | Supabase Row Level Security (RLS) on critical tables | ✅ Partial (insurance has RLS) |
| NFR-05 | API keys exposed only via `VITE_` env prefix (client-side only) | ✅ Done |
| NFR-06 | Password hashing (bcrypt or similar) | ⬜ Not Implemented |
| NFR-07 | Session timeout / auto-logout | ✅ Done (RealtimeLogoutListener) |

### 2.3 Scalability
| ID | Requirement | Status |
|---|---|---|
| NFR-08 | Supabase handles DB scaling automatically | ✅ Done |
| NFR-09 | Vercel handles CDN & edge deployment | ✅ Done |
| NFR-10 | Pagination for large data tables | ⬜ Partial |

### 2.4 Usability
| ID | Requirement | Status |
|---|---|---|
| NFR-11 | Responsive design (mobile + desktop) | ✅ Done |
| NFR-12 | Dark mode support | ⬜ Partial (AuthProvider has toggle, not fully applied) |
| NFR-13 | Toast notifications for all user actions | ✅ Done |
| NFR-14 | Voice input for task descriptions | ✅ Done |
| NFR-15 | Excel/CSV export for reports | ✅ Done |
| NFR-16 | PDF export for invoices, payslips, offer letters | ✅ Done |

### 2.5 Integrations
| ID | Requirement | Status |
|---|---|---|
| NFR-17 | WhatsApp Business API (Meta Cloud) for notifications | ✅ Done |
| NFR-18 | Google Sheets API (via Apps Script) for data sync | ✅ Done |
| NFR-19 | Google Drive for file storage | ✅ Done |
| NFR-20 | Supabase Realtime for live updates | ✅ Done |
| NFR-21 | Supabase Storage for file uploads | ✅ Done |

---

## 3. User Roles & Access Matrix

| Feature | SuperAdmin | Admin | HOD | User |
|---|:---:|:---:|:---:|:---:|
| Master Dashboard | ✅ | ❌ | ❌ | ❌ |
| Admin Dashboard | ✅ | ✅ | ✅ | ❌ |
| Assign Task | ✅ | ✅ | ✅ | ❌ |
| Quick Task | ✅ | ✅ | ✅ | ✅ |
| Checklist / Delegation | ✅ | ✅ | ✅ | ✅ |
| Maintenance / Repair / EA | ✅ | ✅ | ✅ | ✅ |
| Admin Approval | ✅ | ✅ | ✅ | ❌ |
| My Tasks | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ |
| Global Settings | ✅ | ✅ | ❌ | ❌ |
| MIS Report | ✅ | ✅ | ❌ | ❌ |
| Data Pages | ✅ | ✅ | ✅ | ❌ |
| Delegation Data | ✅ | ✅ | ✅ | ❌ |
| Holiday List | ✅ | ✅ | ❌ | ❌ |
| HR System | ✅ | ✅ | ✅ | ✅* |
| Petty Cash | ✅ | ✅ | ✅ | ✅* |
| Coal System | ✅ | ✅ | ✅ | ✅* |
| Daily Scheduler | ✅ | ✅ | ✅ | ✅* |
| Documents / Subscriptions | ✅ | ✅ | ✅ | ✅* |
| Rent Management | ✅ | ✅ | ✅ | ❌ |
| Profile | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ |

> *\* Access depends on `system_access` and `page_access` fields in the user record.*

---
