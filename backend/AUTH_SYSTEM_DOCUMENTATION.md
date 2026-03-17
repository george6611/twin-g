
# 🔐 UNIFIED AUTHENTICATION & AUTHORIZATION SYSTEM
## Production-Ready Auth Core for Delivery Platform

Complete implementation: Authentication + Authorization (RBAC) + Rate Limiting + Session Management

---

## 📋 TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Security Features](#security-features)
3. [Token Structure](#token-structure)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Middleware Reference](#middleware-reference)
7. [Usage Examples](#usage-examples)
8. [Configuration](#configuration)
9. [Security Checklist](#security-checklist)
10. [Performance & Scalability](#performance--scalability)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Single Auth Core - All Clients Share

```
┌─────────────────────────────────────────────────────────┐
│                  UNIFIED AUTH SYSTEM                     │
│                 /api/auth/login (for all)                │
│                /api/auth/refresh (all clients)           │
│                  /api/auth/logout (all roles)            │
└─────────────────────────────────────────────────────────┘
        ↙                    ↓                   ↘
    ┌─────┐            ┌──────────┐          ┌──────┐
    │ WEB │            │ ROUTING  │          │MOBILE│
    │DASH │            │ BASED ON │          │ APP  │
    │BOARD│            │  TOKEN   │          │(APK) │
    └─────┘            │ & ROLE   │          └──────┘
    (Cookies)          └──────────┘        (JSON Body)
                            ↓
        ┌───────────────────────────────────────────┐
        │     ROLE-BASED ACCESS CONTROL (RBAC)      │
        │                                            │
        │  ✓ Role Authorization (vendor, customer)  │
        │  ✓ Permission Checking (manage_inventory)│
        │  ✓ Resource Ownership (vendor/branch)    │
        └───────────────────────────────────────────┘
```

### Supported Roles

```
├─ customer        → Mobile app user
├─ rider           → Delivery partner
├─ vendor          → Main vendor (all branches)
├─ vendor_staff    → Branch staff (assigned branch only)
├─ admin           → Platform admin
└─ superadmin      → System admin (full access)
```

---

## 🔐 SECURITY FEATURES

### 1. Password Security
- ✅ Bcrypt hashing (salt: 10)
- ✅ Password never returned in API responses
- ✅ Password reset tokens with expiration

### 2. JWT Token Security
- ✅ HS256 algorithm (HMAC-SHA256)
- ✅ Contextual payload (vendorId, branchId, permissions)
- ✅ Separate access & refresh tokens
- ✅ Access token: 15 minutes (short-lived)
- ✅ Refresh token: 7 days (stored in DB, rotated on use)

### 3. Refresh Token Management
- ✅ Tokens stored as SHA256 hash only (not plain text)
- ✅ Token rotation on every refresh
- ✅ Old tokens marked as revoked (revocation chain tracking)
- ✅ All user sessions can be revoked (security breach scenario)
- ✅ Expiration auto-cleanup (30 days after revocation)

### 4. Account Security
- ✅ Account lockout after 5 failed login attempts
- ✅ 15-minute lockout period automatically resets
- ✅ Login activity logging (IP, user agent, success/fail)
- ✅ Account disabling by admins
- ✅ Suspicious activity detection (if needed)

### 5. Web Dashboard Security (HTTP-only Cookies)
- ✅ `httpOnly: true` - Cannot access via JavaScript
- ✅ `secure: true` - HTTPS only in production
- ✅ `sameSite: strict` - CSRF protection
- ✅ Signed cookies - Tamper detection

### 6. Mobile Security
- ✅ Tokens in response body (app stores securely)
- ✅ Stateless authentication (no server-side sessions)
- ✅ Device identification tracking
- ✅ Device-specific refresh tokens

### 7. Rate Limiting
- ✅ Login endpoint: 5 attempts per 15 minutes per IP
- ✅ Account lockout: Auto-lock after max attempts
- ✅ IP-based rate limiting (general API endpoints)
- ✅ Per-user rate limiting (spam prevention)

### 8. Multi-Tenant Security
- ✅ Vendor ownership validation
- ✅ Branch scope enforcement for staff
- ✅ Cross-vendor data access prevented
- ✅ Ownership verification before data modification

---

## 🎫 TOKEN STRUCTURE

### Access Token Payload
```javascript
{
  id: "user_id",
  role: "vendor",
  vendorId: "vendor_id",
  branchId: "branch_id",
  permissions: ["view_orders", "edit_orders", "manage_inventory"],
  iat: 1234567890,
  exp: 1234571490  // 15 minutes
}
```

### Token Lifespan

```
Access Token: 15 minutes
├─ Includes: id, role, vendorId, branchId, permissions
├─ Used for: API authorization
├─ Renewal: Automatic via refresh endpoint

Refresh Token: 7 days
├─ Stored as: SHA256 hash in RefreshToken model
├─ Used for: Issuing new access tokens
├─ Rotation: Every refresh operation (old token revoked)
└─ Revocation: Can override (security breach scenario)
```

---

## 📊 DATABASE MODELS

### User Model

```javascript
{
  // Basic Info
  name: String,
  phone: String (unique),
  email: String (unique),
  password: String (bcrypt hashed),
  profileImage: String,

  // Role & Permissions
  role: String (enum: customer, vendor, rider, vendor_staff, admin, superadmin),
  permissions: [String],

  // Multi-tenant Organization
  vendorId: ObjectId,           // For vendor / vendor_staff
  branchId: ObjectId,           // For vendor_staff only
  customerId: ObjectId,
  riderId: ObjectId,

  // Security
  isActive: Boolean,
  isVerified: Boolean,
  loginAttempts: Number,        // Failed attempts counter
  lockUntil: Date,              // Account lock expiration
  refreshTokenHash: String,     // Hash of current refresh token
  refreshTokenExpire: Date,

  // Device & Notifications
  deviceToken: [{
    token: String,
    platform: String (ios|android|web),
    lastUsed: Date
  }],

  // Audit Trail
  lastLogin: Date,
  lastSeen: Date,
  lastLoginIp: String,
  loginHistory: [{
    timestamp: Date,
    ip: String,
    userAgent: String,
    success: Boolean
  }],

  // Location
  lastLoginLocation: {
    latitude: Number,
    longitude: Number,
    city: String
  }
}
```

### RefreshToken Model

```javascript
{
  userId: ObjectId,             // Reference to User
  tokenHash: String,            // SHA256 hash of token
  expiresAt: Date,              // 7 days from creation
  
  // Device Info
  deviceInfo: {
    platform: String (web|ios|android),
    userAgent: String,
    ipAddress: String,
    deviceId: String
  },
  
  // Location
  location: {
    latitude: Number,
    longitude: Number,
    city: String
  },

  // Revocation
  isRevoked: Boolean,
  revokedAt: Date,
  revokeReason: String,         // logout, password_change, admin_revoke, etc

  // Usage Tracking
  usedAt: Date,
  usedCount: Number,
  lastUsedIp: String,

  // Rotation Chain
  rotatedTo: ObjectId,          // New token if rotated
  rotatedFrom: ObjectId         // Previous token if rotated
}
```

---

## 🌐 API ENDPOINTS

### PUBLIC ENDPOINTS (No Authentication Required)

#### `POST /api/auth/login`
Login for all roles (web + mobile)

**Request:**
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "phone_or_email",
  "password": "password"
}
```

**Response - Web (Tokens in cookies):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "vendor",
    "profileImage": "url",
    "vendorId": "vendor_id",
    "branchId": null,
    "permissions": ["view_orders", "edit_orders"]
  },
  "message": "Logged in successfully"
}
```

**Response - Mobile (Tokens in body):**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "a1b2c3d4...",
    "expiresIn": 900,
    "refreshExpiresIn": 604800
  },
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "vendor",
    "profileImage": "url",
    "vendorId": "vendor_id",
    "branchId": null,
    "permissions": ["view_orders", "edit_orders"]
  }
}
```

**Error Responses:**
- `400`: Invalid credentials or missing fields
- `403`: Account disabled or locked
- `429`: Too many login attempts

---

#### `POST /api/auth/refresh`
Rotate refresh token and issue new access token

**Request - Mobile:**
```javascript
POST /api/auth/refresh
Content-Type: application/json
Authorization: Bearer access_token (optional, for extra security)

{
  "refreshToken": "existing_refresh_token"
}
```

**Request - Web:**
```javascript
POST /api/auth/refresh
Cookie: refreshToken=existing_token; accessToken=existing_token
```

**Response - Mobile:**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": 900,
    "refreshExpiresIn": 604800
  },
  "user": { ... }
}
```

**Response - Web:**
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

---

### PROTECTED ENDPOINTS (Authentication Required)

#### `POST /api/auth/logout`
Logout current user and revoke session

**Request:**
```javascript
POST /api/auth/logout
Authorization: Bearer access_token
Content-Type: application/json

{
  "revokeAll": false  // Optional: revoke ALL sessions
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/verify`
Verify current token and return decoded payload

**Request:**
```javascript
GET /api/auth/verify
Authorization: Bearer access_token
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "token": {
    "id": "user_id",
    "role": "vendor",
    "vendorId": "vendor_id",
    "branchId": null,
    "permissions": ["view_orders", "edit_orders"]
  },
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "role": "vendor"
  }
}
```

---

#### `GET /api/auth/sessions`
Get active sessions for current user

**Request:**
```javascript
GET /api/auth/sessions
Authorization: Bearer access_token
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_id_1",
      "device": "web",
      "ip": "192.168.1.1",
      "location": "New York",
      "lastActive": "2024-02-28T10:30:00Z",
      "createdAt": "2024-02-21T10:30:00Z"
    },
    {
      "id": "session_id_2",
      "device": "android",
      "ip": "10.0.0.1",
      "location": "Los Angeles",
      "lastActive": "2024-02-27T15:20:00Z",
      "createdAt": "2024-02-20T15:20:00Z"
    }
  ]
}
```

---

#### `POST /api/auth/sessions/:sessionId/revoke`
Revoke a specific session (Admin only)

**Request:**
```javascript
POST /api/auth/sessions/:sessionId/revoke
Authorization: Bearer access_token (admin token)
```

**Response:**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

## 🛡️ MIDDLEWARE REFERENCE

### Core Middleware

#### `protect`
Verify JWT and attach user to request. Supports both Bearer tokens (mobile) and cookies (web).

```javascript
router.get("/orders", protect, orderController);
```

#### `authorizeRole(...roles)`
Check if user has required role(s)

```javascript
router.post("/", protect, authorizeRole(["admin", "vendor"]), controller);
router.post("/", protect, authorizeRole("admin"), controller);
```

#### `authorizePermission(...perms)`
Check if user has required permission(s)

```javascript
router.post("/", protect, authorizePermission("edit_orders"), controller);
router.post("/", protect, authorizePermission(["view_orders", "edit_orders"], "OR"), controller);
```

#### `authorizeVendorOwnership`
Check if user owns the vendor

```javascript
router.get("/:vendorId/orders", protect, authorizeVendorOwnership, controller);
```

#### `authorizeBranchOwnership`
Check if user owns the branch

```javascript
router.get("/:branchId/staff", protect, authorizeBranchOwnership, controller);
```

#### `verifyOwnership(checkFn)`
Custom ownership verification

```javascript
router.patch("/:orderId", protect, verifyOwnership(async (req, id) => {
  const order = await Order.findById(id);
  return order.vendorId.toString() === req.user.vendorId.toString();
}), controller);
```

### Enforcement Middleware

#### `enforceVendorScope`
Force vendor_staff to their vendor

```javascript
router.use("/", protect, enforceVendorScope);
```

#### `enforceBranchScope`
Force vendor_staff to their branch

```javascript
router.use("/", protect, enforceBranchScope);
```

### Restriction Middleware

#### `restrictToClient(client)`
Restrict by client type

```javascript
router.post("/", protect, restrictToClient("web"), controller);
router.post("/", protect, restrictToClient(["ios", "android"]), controller);
```

#### `restrictAccountType(options)`
Prevent account type mixing

```javascript
router.use("/api/vendor/*", protect, restrictAccountType({
  client: "web",
  deniedRoles: ["customer", "rider"]
}));
```

### Rate Limiting

#### `loginRateLimiter(maxAttempts, lockoutMinutes)`
Rate limit login attempts

```javascript
router.post("/login", loginRateLimiter(5, 15), loginController);
```

#### `ipRateLimiter(limit, windowMinutes)`
IP-based rate limiting

```javascript
router.use("/api/orders", ipRateLimiter(100, 15));
```

#### `userRateLimiter(limit, windowMinutes)`
Per-user rate limiting

```javascript
router.post("/feedback", protect, userRateLimiter(30, 1), feedbackController);
```

---

## 💻 USAGE EXAMPLES

### WEB DASHBOARD (Next.js)

```javascript
// Frontend hook for login
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include", // Include cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: email,
        password
      })
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      // Tokens are in HTTP-only cookies automatically
    }
    setLoading(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    setUser(null);
  };

  return { user, login, logout, loading };
};

// Usage in component
export default function Dashboard() {
  const { user, logout } = useAuth();

  if (!user) return <Redirect to="/login" />;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### MOBILE APP (React Native / Expo)

```javascript
// Mobile login function
const login = async (phone, password) => {
  try {
    const response = await fetch("https://api.example.com/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: phone,
        password
      })
    });

    const data = await response.json();

    if (data.success) {
      const { accessToken, refreshToken } = data.tokens;

      // Securely store tokens in device storage
      await AsyncStorage.setItem("accessToken", accessToken);
      await AsyncStorage.setItem("refreshToken", refreshToken);

      setUser(data.user);
    }
  } catch (error) {
    console.error("Login failed:", error);
  }
};

// API client with automatic token refresh
const api = axios.create({
  baseURL: "https://api.example.com"
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      const { data } = await api.post("/auth/refresh", { refreshToken });

      await AsyncStorage.setItem("accessToken", data.tokens.accessToken);
      await AsyncStorage.setItem("refreshToken", data.tokens.refreshToken);

      // Retry original request
      return api(error.config);
    }
    throw error;
  }
);
```

### BACKEND ROUTE PROTECTION

```javascript
const express = require("express");
const router = express.Router();
const { protect, authorizeRole, authorizeVendorOwnership } = require("../middleware/rbac");

// 🔐 Get vendor orders (vendor must own vendor)
router.get(
  "/:vendorId/orders",
  protect,                           // Verify token
  authorizeVendorOwnership,          // Check vendor ownership
  getVendorOrders
);

// 🔐 Admin-only: View all analytics
router.get(
  "/admin/analytics",
  protect,
  authorizeRole(["admin", "superadmin"]),
  getAnalytics
);

// 🔐 Edit order (with permission check)
router.post(
  "/:orderId/edit",
  protect,
  authorizePermission("edit_orders"),
  editOrder
);

module.exports = router;
```

---

## ⚙️ CONFIGURATION

### Environment Variables

```bash
# .env

# JWT Configuration
JWT_SECRET=your_super_secret_key_min_32_chars  # Use strong, random key
JWT_EXPIRE=15m                                  # Access token expiration

# Token Config
REFRESH_TOKEN_EXPIRE=7d                        # Refresh token expiration
REFRESH_TOKEN_MAX_AGE=604800000                # In milliseconds (7 days)

# Node Environment
NODE_ENV=production                            # development, production, staging

# Server
PORT=5000
CLIENT_URL=https://app.example.com

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Security
CORS_ORIGIN=https://app.example.com,https://mobile.example.com
```

### Setup in server.js

```javascript
const express = require("express");
const cookieParser = require("cookie-parser");
const { protect } = require("./middleware/rbac");
const authRoutes = require("./routes/auth/unified");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));  // For signed cookies

// Auth routes
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/vendor", protect, vendorRoutes);
app.use("/api/admin", protect, adminRoutes);
app.use("/api/customer", protect, customerRoutes);

module.exports = app;
```

---

## ✅ SECURITY CHECKLIST

- [ ] JWT_SECRET is 32+ characters, random, and stored in environment variables
- [ ] NODE_ENV set to "production" (enables secure cookies)
- [ ] HTTPS enforced in production
- [ ] CORS configured with specific origins
- [ ] Rate limiting enabled on login endpoint
- [ ] Passwords hashed with bcrypt (salt: 10+)
- [ ] Refresh tokens stored as hashes only
- [ ] HTTP-only cookies enabled for web
- [ ] CSRF tokens implemented (for state-changing operations)
- [ ] Account lockout implemented after N failed attempts
- [ ] Login activity logging enabled
- [ ] Refresh token rotation on every use
- [ ] Old tokens can be revoked in bulk
- [ ] Vendor ownership validated on all vendor endpoints
- [ ] Branch scope enforced for vendor_staff
- [ ] Permissions verified server-side only
- [ ] Sensitive data (passwords, tokens) never logged
- [ ] Error messages don't leak information
- [ ] Database indexes optimized for performance
- [ ] Session tracking enabled
- [ ] Admin ability to revoke sessions
- [ ] Security headers configured (Content-Security-Policy, etc)

---

## 📈 PERFORMANCE & SCALABILITY

### Token Size
- Access token: ~300 bytes (fits in HTTP headers)
- Refresh token: ~32-64 bytes (random hex string)

### Database Indexes
```javascript
// User model indexes
user.collection.createIndex({ phone: 1 });
user.collection.createIndex({ email: 1 });
user.collection.createIndex({ vendorId: 1, role: 1 });
user.collection.createIndex({ branchId: 1, role: 1 });
user.collection.createIndex({ lastLogin: -1 });

// RefreshToken model indexes
refreshToken.collection.createIndex({ userId: 1 });
refreshToken.collection.createIndex({ tokenHash: 1 });
refreshToken.collection.createIndex({ expiresAt: 1 });
refreshToken.collection.createIndex({ isRevoked: 1 });
```

### Scalability Considerations

#### Current (Single Server)
- Uses in-memory Maps for rate limiting
- Suitable for: < 1000 concurrent users

#### For Production (Multiple Servers)
- Replace in-memory Maps with Redis
- Implement distributed rate limiting
- Use Redis for token blacklisting
- Implement session store (Redis/MongoDB)

### Performance Targets
- Login: < 200ms
- Token refresh: < 100ms
- Authorization check: < 10ms
- Logout: < 50ms

### Optimization Tips
1. Cache user objects in memory/Redis (with TTL)
2. Pre-compute permissions on login
3. Use lazy-loading for role definitions
4. Implement token caching for high-traffic endpoints
5. Run cleanup jobs (old tokens) during off-peak hours

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All .env variables configured
- [ ] MongoDB connection tested
- [ ] Rate limiter tuned for expected load
- [ ] Error logging configured
- [ ] Session tracking enabled
- [ ] Backup strategy for refresh tokens
- [ ] Monitoring for login failures/anomalies
- [ ] API documentation accessible
- [ ] Staging environment tested thoroughly
- [ ] HTTPS certificate installed
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Regular security audits scheduled

---

## 📚 ADDITIONAL RESOURCES

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Bcrypt Password Hashing](https://auth0.com/blog/hashing-passwords-one-way-road-to-security/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

**Generated**: February 28, 2024
**Version**: 1.0  
**Status**: Production-Ready
