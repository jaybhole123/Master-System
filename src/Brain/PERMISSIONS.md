# Global Permission Management Workflow
# READ, WRITE & MIS Permissions

## 1. Objective
Implement one centralized permission-management system through the Global Settings page. Administrators must be able to manage permissions for individual users across all modules and pages without making page-specific hardcoded changes.

The existing user table and its `page_access` column must be analyzed first and used as the source of page-wise permission data. Do not create a duplicate permission system or overwrite existing permission data blindly.

## 2. Permission Structure
Global Settings must provide these three permission types for each applicable user and module/page:

| Permission | Meaning | Allowed actions |
| :--- | :--- | :--- |
| **READ** | View-only access | View page and permitted records |
| **WRITE** | Full page access | View, Add, Edit, Update and Delete |
| **MIS** | MIS score eligibility | Include the user in the applicable MIS score generation/reporting process |

`READ` and `WRITE` define page access. `MIS` is a separate permission for MIS score eligibility; it must not be treated as a substitute for `READ` or `WRITE`.

### READ — View only
When a user has `READ` access to a page:
- The user can open the page and view the data they are otherwise authorized to see.
- Add, Edit, Update and Delete actions must not be available.
- Direct UI attempts to open an edit form or trigger a mutation must be blocked.
- Backend/database operations must also reject unauthorized insert, update and delete requests.

### WRITE — Full access
When a user has `WRITE` access to a page:
- The user can view the page.
- The user can Add new records.
- The user can Edit and Update existing records.
- The user can Delete records, subject to any existing business rules or confirmation requirements.
- `WRITE` includes the ability to read the page. The user should not need a separate `READ` grant for the same page.

### MIS — MIS score eligibility
When a user's MIS permission is **YES** for the applicable MIS scope:
- The user is eligible to be included in MIS score generation and applicable MIS reports.
- The existing MIS calculation formula, scoring rules, date logic and report layout must remain unchanged unless separately requested.

When MIS is **NO** or not enabled:
- Do not generate or include an MIS score for that user in the applicable MIS output.
- Do not treat a missing/unknown MIS value as YES. Use a safe default of disabled until an authorized administrator enables it.

*MIS permission controls score eligibility only. It does not automatically grant page READ or WRITE access.*

## 3. Global Settings — Administrator Workflow
1. An authorized administrator opens Global Settings.
2. The system loads the available modules and their pages from the existing application structure/permission configuration.
3. The administrator selects a module and a page, then selects the relevant user.
4. Global Settings displays the user's current READ, WRITE and MIS settings for that page/scope.
5. The administrator changes the required permission(s) and saves.
6. The system validates the change and persists it using the existing `user.page_access` structure, after confirming its actual schema and conventions.
7. A successful save updates the effective permissions across the application. The administrator should not need to open or edit that module's page separately.
8. When the user next loads the page or refreshes their permission state, the updated permissions take effect. If the application supports live permission refresh, apply the change without requiring a full sign-out.
9. The Global Settings screen is the central control panel. Do not implement separate, hardcoded permission settings inside individual module pages.

## 4. Application Runtime Workflow
Whenever a user signs in or opens a page:
1. Identify the authenticated user securely from the authentication session. Do not trust a user ID supplied by the browser as proof of identity.
2. Read that user's existing `page_access` data.
3. Resolve the permission for the current module and page using the same canonical module/page identifiers used by Global Settings.
4. Apply the permission consistently to navigation, page rendering, action controls and data operations.

### Effective page access
Use the following decision order for a page:
- If `WRITE` is enabled, allow view and write actions.
- Otherwise, if `READ` is enabled, allow view-only access.
- Otherwise, deny access to the page and its data.

*This makes WRITE implicitly include READ and avoids contradictory states.*

### UI behavior
- **WRITE**: show the normal page and its permitted Add, Edit, Update and Delete controls.
- **READ**: show the page in view-only mode; hide or disable all mutation controls (Add, Edit, Update, Delete, Upload, Done, Submit).
- **No READ and no WRITE**: hide or block the page, according to the application's existing access-denied pattern.
- Do not rely on hiding buttons alone as security.

## 5. MIS Score Generation Workflow
1. Start with the users who are otherwise in scope for the existing MIS process.
2. Read each user's MIS permission from the configured Global Settings / existing `page_access` data.
3. Include only users whose MIS permission is explicitly enabled (YES).
4. Exclude users whose MIS permission is NO, missing or invalid.
5. Run the existing MIS score calculation unchanged for the eligible users.
6. Display/export the resulting scores using the existing MIS report flow.

*Important: MIS permission must be checked at the point where the score-generation dataset is built, not merely by hiding a score column in the frontend. A user with MIS = NO must not receive a newly generated score in that run or appear in the applicable MIS score output.*

## 6. Existing user.page_access — Structure
- Database column: `users.page_access` (JSON / text)
- Format:
```json
{
  "Module::Page": {
    "read": true,
    "write": false,
    "mis": false
  }
}
```
- Username check: Only `user_name === 'admin'` gets superadmin bypass. Non-admin users are strictly governed by their `page_access` map.

## 7. Centralized and Consistent Enforcement
The same permission decision must be used throughout the application:
- Sidebar and navigation visibility.
- Direct URL/page access.
- Add, Edit, Update, Delete, Upload and Done buttons/forms.
- Frontend event handlers and API calls.
- MIS score-generation queries and reports.
