
# 🛡️ AUTH SYSTEM - SECURITY HARDENING & BEST PRACTICES

---

## 🔐 THREAT MODEL & MITIGATIONS

### 1. BRUTE FORCE ATTACKS
**Threat**: Attacker tries many password combinations

**Mitigations**:
- ✅ Rate limiting: 5 attempts per 15 minutes per IP
- ✅ Account lockout: Auto-lock after 5 failed attempts
- ✅ CAPTCHA: (Implement for additional protection)
- ✅ MONITORING: Log all failed attempts

```javascript
// Monitor failed logins
async function alertOnMultipleFailures(userId, attempts) {
  if (attempts >= 3) {
    // Send security alert email to user
    await sendSecurityAlertEmail(userId, {
      reason: "Multiple failed login attempts",
      timestamp: new Date(),
      action: "Review your account security"
    });
  }
}
```

---

### 2. CREDENTIAL STUFFING
**Threat**: Attacker uses leaked credentials from other services

**Mitigations**:
- ✅ Strong password requirements
- ✅ Password history: Prevent reuse of old passwords
- ✅ Have I Been Pwned API check (on signup)
- ✅ IP reputation checking

```javascript
// Check if password appears in breach databases
async function isPwnedPassword(password) {
  const crypto = require('crypto');
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const data = await response.text();
  return data.includes(suffix);
}
```

---

### 3. TOKEN THEFT
**Threat**: XSS attack steals token from localStorage

**Mitigations**:
- ✅ Web: HTTP-only cookies (JavaScript cannot access)
- ✅ Web: Signed cookies (tamper detection)
- ✅ Web: CSP headers (prevent inline scripts)
- ✅ Mobile: Secure storage (Keychain on iOS, Keystore on Android)
- ✅ Token rotation: New token on each refresh

```javascript
// Content Security Policy header
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src *; font-src 'self'; connect-src 'self'"
  );
  next();
});
```

---

### 4. MAN-IN-THE-MIDDLE (MITM)
**Threat**: Attacker intercepts traffic and steals tokens

**Mitigations**:
- ✅ HTTPS/TLS 1.3 enforced
- ✅ HSTS header: Force HTTPS on repeat visits
- ✅ Certificate pinning: Mobile apps
- ✅ Token signing: Prevent tampering

```javascript
// Force HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
});

// HSTS Header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

### 5. PRIVILEGE ESCALATION
**Threat**: User modifies token to gain higher privileges

**Mitigations**:
- ✅ JWT signature verification (tamper detected)
- ✅ Server-side permission checks (never trust token)
- ✅ Role validation on every request
- ✅ Audit logging

```javascript
// NEVER trust client-provided role
// Example of WRONG approach:
const userRole = req.body.role; // ❌ WRONG - can be faked

// CORRECT approach:
const user = await User.findById(decoded.id); // ✅ Fetch from DB
const role = user.role; // ✅ Use server truth
```

---

### 6. ACCOUNT HIJACKING
**Threat**: Attacker gains access to user account

**Mitigations**:
- ✅ Device tracking: Store device fingerprints
- ✅ Login notifications: Email on new login
- ✅ Suspicious activity detection
- ✅ Session management: Revoke old sessions on password change

```javascript
// Email alert on new device login
async function alertNewDeviceLogin(user, deviceInfo) {
  const lastKnownDevices = await RefreshToken.find({
    userId: user._id,
    isRevoked: false
  }).distinct('deviceInfo.deviceId');

  if (!lastKnownDevices.includes(deviceInfo.deviceId)) {
    await sendNewDeviceAlertEmail(user.email, {
      device: deviceInfo.platform,
      ip: deviceInfo.ipAddress,
      time: new Date(),
      action: "If this wasn't you, verify your account security"
    });
  }
}
```

---

### 7. INSECURE DIRECT OBJECT REFERENCE (IDOR)
**Threat**: User accesses other users' data by changing ID in URL

**Mitigations**:
- ✅ `authorizeVendorOwnership`: Check vendor ownership
- ✅ `authorizeBranchOwnership`: Check branch ownership
- ✅ `verifyOwnership`: Custom ownership checks
- ✅ Row-level security in DB queries

```javascript
// ❌ VULNERABLE - No ownership check
router.get('/:vendorId/orders', protect, getOrders);

// ✅ SECURE - Ownership verified
router.get('/:vendorId/orders', protect, authorizeVendorOwnership, getOrders);

// Example controller with additional validation:
async function getOrders(req, res) {
  const { vendorId } = req.params;

  // Double-check ownership (defense in depth)
  if (req.user.role === 'vendor') {
    if (req.user.vendorId.toString() !== vendorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
  }

  const orders = await Order.find({ vendorId });
  res.json(orders);
}
```

---

### 8. UNAUTHORIZED DATA EXPOSURE
**Threat**: Sensitive data returned in API responses

**Mitigations**:
- ✅ Never return passwords
- ✅ Filter sensitive fields from responses
- ✅ Role-based response filtering
- ✅ Data classification

```javascript
// Secure response building
function formatUserResponse(user, requestingUser) {
  const response = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  // Only include if same user or admin
  if (requestingUser._id.toString() === user._id.toString() || requestingUser.role === 'admin') {
    response.phone = user.phone;
    response.lastLogin = user.lastLogin;
  }

  // Never include
  // response.password - ❌
  // response.refreshTokenHash - ❌
  // response.loginAttempts - ❌

  return response;
}
```

---

## 🔐 HARDENING CHECKLIST

### Environment Configuration

```bash
# .env Hardening

# 🔐 Use strong random values
JWT_SECRET=<use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
COOKIE_SECRET=<use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# 🔐 Security settings
NODE_ENV=production
FORCE_HTTPS=true
SESSION_TIMEOUT=900000  # 15 minutes
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000 # 15 minutes

# 🔐 Rate limits
LOGIN_RATE_LIMIT=5
LOGIN_RATE_WINDOW=900000  # 15 minutes

# 🔐 Password policy
MIN_PASSWORD_LENGTH=12
REQUIRE_UPPERCASE=true
REQUIRE_NUMBERS=true
REQUIRE_SPECIAL_CHARS=true
```

### Application Hardening

```javascript
// security.js - Centralized security middleware
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

module.exports = function applySecurity(app) {
  // Helmet: Set security headers
  app.use(helmet());

  // Data sanitization
  app.use(mongoSanitize()); // NoSQL injection prevention

  // Rate limiting (global)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests'
  });
  app.use(generalLimiter);

  // No expose header
  app.disable('x-powered-by');

  // CORS strict
  app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Prevent parameter pollution
  app.use(hpp());

  console.log('✅ Security middleware applied');
};
```

---

## 🔍 MONITORING & ALERTING

### Login Anomalies

```javascript
// Detect suspicious login patterns
async function detectAnomalousLogin(user, deviceInfo) {
  const recentLogins = await user.collection
    .find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const anomalies = [];

  // Check for rapid logins from different locations
  if (recentLogins.length > 0) {
    const lastLogin = recentLogins[0];
    const timeDiff = Date.now() - lastLogin.createdAt.getTime();

    if (timeDiff < 300000) { // Less than 5 minutes
      const locationDiff = calculateDistance(
        lastLogin.location,
        deviceInfo.location
      );

      if (locationDiff > 100) { // More than 100km
        anomalies.push('Geographic impossibility -rapid travel');
      }
    }
  }

  // Check for unusual time of login
  const hour = new Date().getHours();
  const userPattern = await getTypicalUserLoginHours(user._id);

  if (!userPattern.includes(hour)) {
    anomalies.push('Unusual login time');
  }

  return anomalies;
}

// Alert if anomalies detected
if (anomalies.length > 0) {
  await sendSecurityAlert(user.email, {
    subject: 'Unusual login activity',
    anomalies,
    action: 'Verify this is you or change your password'
  });
}
```

### Failed Login Tracking

```javascript
async function trackFailedLogin(identifier, ip) {
  const attempt = new LoginAttempt({
    identifier,
    ip,
    timestamp: new Date(),
    success: false
  });
  await attempt.save();

  // Alert after 3 failed attempts
  const recentFailures = await LoginAttempt.countDocuments({
    identifier,
    success: false,
    timestamp: { $gt: new Date(Date.now() - 3600000) } // Last hour
  });

  if (recentFailures >= 3) {
    await notifySecurityTeam({
      alert: 'Multiple failed login attempts',
      identifier,
      count: recentFailures,
      period: '1 hour'
    });
  }
}
```

---

## 📊 AUDIT LOGGING

```javascript
// Log all authentication events
async function auditLog(event, data) {
  const log = new AuditLog({
    timestamp: new Date(),
    event, // login_success, login_failed, token_refresh, logout, etc
    userId: data.userId,
    ip: data.ip,
    userAgent: data.userAgent,
    details: data.details
  });
  await log.save();
}

// Usage
await auditLog('login_success', {
  userId: user._id,
  ip: clientInfo.ip,
  userAgent: clientInfo.userAgent,
  details: { role: user.role }
});

await auditLog('unauthorized_access_attempt', {
  userId: req.user._id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  details: { attempted_resource: '/api/admin' }
});
```

---

## 🚀 PRODUCTION SECURITY RUNBOOK

### Pre-Deployment

- [ ] All secrets rotated
- [ ] JWT_SECRET: Min 32 chars, random
- [ ] COOKIE_SECRET: Min 32 chars, random
- [ ] HTTPS certificate installed
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Alerting configured

### Post-Deployment

- [ ] Test login flow
- [ ] Test rate limiting
- [ ] Test account lockout
- [ ] Verify HTTPS enforcement
- [ ] Check security headers
- [ ] Monitor error rates
- [ ] Review audit logs

### Ongoing Maintenance

- [ ] Daily: Monitor failed logins
- [ ] Weekly: Review audit logs for anomalies
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security review
- [ ] Annually: Penetration testing

---

## 📚 SECURITY RESOURCES

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## ⚖️ COMPLIANCE

### GDPR Compliance
- ✅ User data encrypted at rest
- ✅ Audit logs for all data access
- ✅ Right to be forgotten: Delete all user tokens
- ✅ Data portability: Export user data

### PCI DSS (Payment Card Industry)
- ✅ Never store passwords in plaintext
- ✅ No card data in logs
- ✅ TLS 1.2+ for all data transmission
- ✅ Validated security controls

---

**Document Version**: 1.0  
**Last Updated**: February 28, 2024  
**Security Level**: Production-Grade
