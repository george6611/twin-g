# Branch Details Page Documentation

**Status:** ✅ Production Ready  
**Route:** `/app/(dashboard)/vendor/branches/[branchId]/page.jsx`  
**Error Count:** 0

---

## 📖 Overview

The Branch Details page provides a comprehensive view of a single vendor branch, including:

- **Branch Information:** Location, contact details, manager info
- **Performance Metrics:** Daily/weekly orders, revenue, inventory status
- **Staff Management:** List of branch staff with roles and activity
- **Order History:** Recent orders for the branch
- **Activity Log:** Complete timeline of branch events

---

## 🔐 Access Control

### Who Can Access
- ✅ **Main Vendor:** Can access all branches
- ✅ **Branch Staff:** Can access only their assigned branch
- ❌ **Other Staff:** Cannot access (403)
- ❌ **Unauthenticated:** Redirected to login (401)

### URL Pattern
```
/dashboard/vendor/branches/{branchId}
```

### Access Validation
```javascript
// Frontend checks
const isMainVendor = (isVendor && !isVendorStaff) || userRole === 'vendor_main';
const isStaff = isVendorStaff || userRole === 'vendor_staff';

// For staff, validate branch assignment
if (isStaff && assignedBranchId !== branchId) {
  return 403; // Backend enforced
}
```

---

## 📊 Data Structure

### Branch Object
```javascript
{
  _id: "branch_123",
  vendorId: "vendor_456",
  name: "Downtown Branch",
  location: "New York, NY",
  address: "123 Main St, Suite 100",
  phone: "+1 (555) 123-4567",
  email: "downtown@vendor.com",
  managerName: "John Doe",
  status: "active", // "active" | "inactive"
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-02-28T14:30:00Z",
  staffCount: 5,
  activeOrders: 4,
  totalOrders30d: 42,
}
```

### Stats Object
```javascript
{
  ordersToday: 5,
  ordersThisWeek: 12,
  completedOrders: 18,
  pendingOrders: 4,
  totalRevenue: 12500,
  staffCount: 5,
  lowStockItems: 2,
  activeOrders: 4,
}
```

### Staff Object
```javascript
{
  _id: "staff_123",
  name: "Jane Smith",
  role: "Manager", // "Manager" | "Staff" | "Supervisor"
  status: "active", // "active" | "inactive"
  lastLogin: "2025-02-28T09:15:00Z",
  email: "jane@vendor.com",
  phone: "+1 (555) 987-6543",
}
```

### Order Object (Branch Context)
```javascript
{
  _id: "order_123",
  orderNumber: "ORD-001",
  customerName: "John Smith",
  status: "pending", // "pending" | "confirmed" | "in_progress" | "delivered" | "cancelled"
  totalAmount: 250.00,
  createdAt: "2025-02-28T10:00:00Z",
  branchId: "branch_123",
}
```

### Activity Object
```javascript
{
  _id: "activity_123",
  type: "staff_created", // "staff_created" | "order_completed" | "status_updated" | "inventory_updated"
  description: "Staff created by Admin",
  timestamp: "2025-02-28T10:00:00Z",
  userId: "user_123",
}
```

---

## 🎨 UI Sections

### 1. Hero Section
```
┌─────────────────────────────────────────────────────────────┐
│  Downtown Branch                                    Active   │
│  New York, NY • Created Jan 15, 2025                        │
├─────────────────────────────────────────────────────────────┤
│ Today Orders  │ This Week │ Completed │ Pending Orders      │
│     5         │    12     │    18     │       4             │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- Branch name (large heading)
- Location and creation date
- Status badge (Active/Inactive)
- 4 key stats in grid

**Styling:**
- Gradient background (orange-50 to orange-100)
- Orange border
- Dark mode: orange-900/20 background

---

### 2. Branch Information Card
```
┌────────────────────┬─────────────────────┐
│ Location           │ Email               │
│ New York, NY       │ downtown@vendor.com │
├────────────────────┼─────────────────────┤
│ Address            │ Manager             │
│ 123 Main St        │ John Doe            │
├────────────────────┼─────────────────────┤
│ Phone              │ Status              │
│ +1 (555) 123-4567  │ [Active Badge]      │
└────────────────────┴─────────────────────┘
```

**Features:**
- 2-column grid layout
- Clean label/value presentation
- Responsive to single column on mobile
- "Back to Branches" button for navigation

---

### 3. Performance Stats
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Total Revenue    │ Staff Count      │ Low Stock Items  │ Active Orders    │
│ $12,500          │ 5                │ 2                │ 4                │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

**Metrics:**
- Total Revenue (formatted as currency)
- Staff Count (simple number)
- Low Stock Items (inventory alert count)
- Active Orders (current orders)

---

### 4. Branch Staff Table
```
┌──────────┬──────────┬──────────┬──────────────┬─────────────────────┐
│ Name     │ Role     │ Status   │ Last Login   │ Actions (Main only) │
├──────────┼──────────┼──────────┼──────────────┼─────────────────────┤
│ Jane SMT │ Manager  │ Active   │ Today        │ [Edit] [Deact]      │
│ Bob Jim  │ Staff    │ Active   │ 2 days ago   │ [Edit] [Deact]      │
│ Alice CM │ Inactive │ Inactive │ Never        │ [Edit] [Deact]      │
└──────────┴──────────┴──────────┴──────────────┴─────────────────────┘
```

**Columns:**
- Name
- Role (Manager | Staff | Supervisor)
- Status (badge)
- Last Login (formatted date)
- Actions (main vendor only):
  - Edit: Modify role
  - Deactivate: Change status to inactive
  - Reset Password: Send password reset link

**Empty State:**
```
No staff members assigned to this branch.
```

---

### 5. Recent Orders Table
```
┌──────────┬──────────────┬────────────┬────────┬──────────┬────────┐
│ Order ID │ Customer     │ Status     │ Amount │ Created  │ View   │
├──────────┼──────────────┼────────────┼────────┼──────────┼────────┤
│ ORD-001  │ John Smith   │ Pending    │ $250   │ Today    │ [View] │
│ ORD-002  │ Mary Jane    │ Delivered  │ $180   │ Yesterday│ [View] │
│ ORD-003  │ Bob Johnson  │ Confirmed  │ $320   │ 2 days   │ [View] │
└──────────┴──────────────┴────────────┴────────┴──────────┴────────┘
```

**Features:**
- Last 10 orders for branch
- Color-coded status badges
- Currency formatting for amounts
- "View" button links to order details page

**Empty State:**
```
No orders for this branch yet.
```

---

### 6. Activity Timeline
```
←─ Staff created by Admin                      2 hours ago
←─ Order ORD-123 completed                     5 hours ago
←─ Branch status updated to active             1 day ago
←─ 3 new staff members added                   3 days ago
```

**Features:**
- Chronological order (newest first)
- Icons for different activity types
- Formatted timestamps (relative)
- Scrollable for many entries

---

## 🔄 Data Flow

### 1. Page Load
```
User navigates to /vendor/branches/{branchId}
↓
useParams() extracts branchId
↓
useAuth() gets user info
↓
Validate: isAuthenticated? → else redirect /login
↓
Validate: isStaff && assignedBranchId !== branchId? → else set forbidden
↓
Start loading: setLoading(true)
↓
Parallel fetch:
  ├→ getBranchById(vendorId, branchId)
  ├→ getBranchStats(vendorId, branchId)
  ├→ getBranchStaff(vendorId, branchId)
  ├→ getBranchOrders(vendorId, branchId, { limit: 10 })
  └→ getBranchActivity(vendorId, branchId, { limit: 20 })
↓
Handle responses:
  ├→ Update branch state
  ├→ Update stats state
  ├→ Update staff state
  ├→ Update orders state
  └→ Update activity state
↓
Set loading(false)
↓
Render page with data
```

### 2. Error Handling
```
If status === 401:
  → Redirect to /login
↓
If status === 403:
  → Set forbidden(true)
  → Render: "Access Denied" alert
↓
If status === 404:
  → Set notFound(true)
  → Render: "Branch Not Found" alert
↓
If error occurs:
  → Set error message
  → Render: "Error Loading Branch" alert with retry
```

---

## 🧩 Component Dependencies

```
BranchDetailsPage
├── DashboardLayout
│   └── Dashboard wrapper (min-h-screen, bg-gray-50)
│
├── Hero Section
│   ├── Badge (status)
│   └── StatsCard x4
│
├── Branch Information SectionWrapper
│   └── Text content (no special components)
│
├── Performance Stats SectionWrapper
│   └── StatsCard x4
│
├── Branch Staff SectionWrapper
│   └── Native HTML table
│       └── Badge (role, status)
│
├── Recent Orders SectionWrapper
│   └── Native HTML table
│       ├── Badge (status)
│       └── Button (View)
│
└── Activity Timeline SectionWrapper
    └── ActivityFeed (custom component)
```

---

## 🔗 API Integration

### Fetch Branch Details
```javascript
const branchResult = await BranchesAPI.getBranchById(vendorId, branchId);
// Returns: { success: true, data: branch }
```

### Fetch Branch Stats
```javascript
const statsResult = await BranchesAPI.getBranchStats(vendorId, branchId);
// Returns: { success: true, data: { ordersToday, ... } }
```

### Fetch Branch Staff
```javascript
const staffResult = await BranchesAPI.getBranchStaff(vendorId, branchId);
// Returns: { success: true, data: [staff1, staff2, ...] }
```

### Fetch Branch Orders
```javascript
const ordersResult = await BranchesAPI.getBranchOrders(vendorId, branchId, {
  limit: 10,
});
// Returns: { success: true, data: [order1, order2, ...] }
```

### Fetch Branch Activity
```javascript
const activityResult = await BranchesAPI.getBranchActivity(vendorId, branchId, {
  limit: 20,
});
// Returns: { success: true, data: [activity1, activity2, ...] }
```

---

## 📱 Responsive Behavior

### Desktop (≥1024px)
- All sections visible
- Multi-column grids
- Inline action buttons
- Large text sizes

### Tablet (≥768px)
- 2-column layouts where appropriate
- Touch-friendly buttons (44px min)
- Scrollable tables
- Stacked sections

### Mobile (<768px)
- Single column layout
- Collapsible sections
- Scrollable tables with overflow
- Large touch targets
- Simplified stats grid (2-col)

---

## ✅ Testing Scenarios

### Scenario 1: Main Vendor Views Branch
```
1. Log in as main vendor
2. Navigate to /vendor/branches/branch_123
3. Page loads all sections successfully
4. Can click "View" on orders → goes to order details
5. Can edit staff (buttons visible)
```

### Scenario 2: Staff Views Their Branch
```
1. Log in as branch staff
2. Navigate to /vendor/branches/{assignedBranchId}
3. Page loads successfully
4. Cannot edit staff (buttons disabled for staff)
5. Can view all information read-only
```

### Scenario 3: Staff Tries to Access Wrong Branch
```
1. Log in as branch staff for Branch A
2. Navigate to /vendor/branches/branch_b_id
3. Page returns 403 Forbidden
4. See: "Access Denied" alert
```

### Scenario 4: Branch Not Found
```
1. Navigate to /vendor/branches/invalid_id
2. Backend returns 404
3. Page shows: "Branch Not Found" alert
4. Can click "Back to Branches" to return to list
```

### Scenario 5: Unauthenticated Access
```
1. Not logged in
2. Navigate to /vendor/branches/branch_123
3. useAuth() returns isAuthenticated=false
4. Redirect to /login
```

---

## 🎯 Performance Considerations

### Current Optimizations
- ✅ Parallel data fetching (Promise.all)
- ✅ Pagination on orders/activity (limit: 10, 20)
- ✅ Single branch query (not list)
- ✅ Lazy state initialization

### Future Improvements
- [ ] Virtual scrolling for large staff lists
- [ ] Caching with stale-while-revalidate
- [ ] Image optimization for manager photos
- [ ] Lazy load activity feed on scroll

---

## 🔒 Audit & Logging

### Backend Should Log
```javascript
{
  userId: "user_123",
  action: "VIEW_BRANCH",
  branchId: "branch_456",
  vendorId: "vendor_789",
  timestamp: "2025-02-28T10:00:00Z",
  ipAddress: "192.168.1.1",
}
```

### Actions to Log
- VIEW_BRANCH
- EDIT_BRANCH_STAFF (future)
- RESET_STAFF_PASSWORD (future)
- All staff actions

---

## 📋 Requirements Coverage

| Requirement | Status | Details |
|-------------|--------|---------|
| Access Control (Main Vendor) | ✅ | Can access all branches |
| Access Control (Staff) | ✅ | Can access only assigned branch |
| Branch Overview | ✅ | Displays location, contact, manager, status |
| Performance Stats | ✅ | Shows orders, revenue, staff, inventory |
| Staff Section | ✅ | Lists staff with roles, status, last login |
| Orders Section | ✅ | Shows recent orders, links to details |
| Activity Log | ✅ | Chronological timeline display |
| Responsive Design | ✅ | Mobile, tablet, desktop layouts |
| Error Handling | ✅ | 401, 403, 404, network errors |
| Dark Mode | ✅ | Full dark theme support |
| Orange Theme | ✅ | Gradient hero, orange accents |

---

## Last Updated
February 28, 2026  
Status: ✅ Production Ready
