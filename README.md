# @keplog/node

Official Keplog SDK for Node.js error tracking and monitoring.

[![npm version](https://img.shields.io/npm/v/@keplog/node.svg)](https://www.npmjs.com/package/@keplog/node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✨ **Automatic Error Capture** - Catches uncaught exceptions and unhandled promise rejections
- 🐛 **Comprehensive Error Support** - All JS error types: Error, TypeError, ReferenceError, RangeError, SyntaxError, custom errors, and more
- 🔍 **Enhanced Stack Frames** - Code snippets with class/method detection and vendor/app classification
- 🗂️ **Context Separation** - Automatic separation of system vs user-defined context (v2.0)
- 🔒 **Reserved Key Protection** - Prevents accidental override of SDK-managed fields (v2.0)
- 🍞 **Breadcrumb Tracking** - Track user actions leading up to errors
- 🏷️ **Tags & Context** - Add custom metadata to all errors
- 👤 **User Tracking** - Identify users affected by errors
- 🎯 **Zero Dependencies** - Built using only Node.js native APIs
- 📦 **Dual Package** - Supports both CommonJS and ESM
- 🔍 **TypeScript Support** - Full type definitions included
- 🪝 **beforeSend Hook** - Filter or modify events before sending
- 🎛️ **Flexible Configuration** - Extensive customization options

## Installation

```bash
npm install @keplog/node
# or
yarn add @keplog/node
# or
pnpm add @keplog/node
```

## Quick Start

```javascript
const { KeplogClient } = require('@keplog/node');

// Initialize the client
const keplog = new KeplogClient({
  ingestKey: 'kep_ingest_your-ingest-key',
  environment: 'production',
  release: 'v1.0.0'
});

// Capture errors manually
try {
  riskyOperation();
} catch (error) {
  keplog.captureError(error);
}

// Capture messages
keplog.captureMessage('Payment processed successfully', 'info');

// Errors are automatically captured (uncaught exceptions, unhandled rejections)
```

## Configuration

### Basic Configuration

```javascript
const keplog = new KeplogClient({
  ingestKey: 'kep_ingest_your-ingest-key',     // Required: Your project Ingest Key
  environment: 'production',       // Optional: defaults to NODE_ENV
  release: 'v1.0.0',              // Optional: your app version
  serverName: 'api-server-01',    // Optional: defaults to hostname
});
```

### Advanced Configuration

```javascript
const keplog = new KeplogClient({
  // Required
  ingestKey: 'kep_ingest_your-ingest-key',

  // Optional
  baseUrl: 'https://api.keplog.com',  // API base URL
  environment: 'production',           // Environment name
  release: 'v1.2.3',                  // Release version
  serverName: 'web-01',               // Server name
  maxBreadcrumbs: 100,                // Max breadcrumbs to keep
  enabled: true,                       // Enable/disable tracking
  debug: false,                        // Debug logging
  timeout: 5000,                       // HTTP timeout (ms)

  // Hooks
  beforeSend: (event) => {
    // Modify or filter events before sending
    if (event.message.includes('ignore')) {
      return null; // Don't send
    }
    return event;
  },

  // Automatic error handling
  autoHandleUncaught: true,           // Capture uncaught errors
  exitOnUncaught: true,               // Exit on uncaught exception
});
```

## API Reference

### Error Capture

#### `captureError(error, context?)`

Capture an Error object.

```javascript
try {
  throw new Error('Something went wrong');
} catch (error) {
  keplog.captureError(error, {
    userId: '123',
    orderId: 'ORD-456'
  });
}
```

#### `captureMessage(message, level?, context?)`

Capture a message without a stack trace.

```javascript
keplog.captureMessage(
  'User completed checkout',
  'info',
  { orderId: '123', amount: 99.99 }
);
```

**Levels:** `critical`, `error`, `warning`, `info`, `debug`

### Breadcrumbs

Track user actions that occurred before an error.

#### `addBreadcrumb(breadcrumb)`

```javascript
keplog.addBreadcrumb({
  type: 'navigation',
  category: 'ui',
  message: 'User navigated to checkout',
  data: {
    from: '/cart',
    to: '/checkout'
  }
});

keplog.addBreadcrumb({
  type: 'http',
  category: 'fetch',
  message: 'GET /api/products/123',
  level: 'info',
  data: {
    status: 200,
    duration: 150
  }
});
```

### Context & Tags

Set global data that applies to all future errors.

#### `setContext(key, value)`

```javascript
keplog.setContext('build', {
  version: '1.2.3',
  commit: 'abc123'
});
```

#### `setTag(key, value)` / `setTags(tags)`

```javascript
// Single tag
keplog.setTag('region', 'us-east-1');

// Multiple tags
keplog.setTags({
  region: 'us-east-1',
  service: 'api',
  cluster: 'main'
});
```

#### `setUser(user)`

```javascript
keplog.setUser({
  id: '12345',
  email: 'user@example.com',
  username: 'johndoe',
  subscription: 'premium'
});
```

### Scope Management

#### `clearScope()`

Clear all context, tags, user data, and breadcrumbs.

```javascript
keplog.clearScope();
```

### Control

#### `setEnabled(enabled)`

Enable or disable error tracking.

```javascript
keplog.setEnabled(false); // Disable tracking
keplog.setEnabled(true);  // Re-enable tracking
```

#### `isEnabled()`

Check if tracking is enabled.

```javascript
if (keplog.isEnabled()) {
  // Tracking is active
}
```

#### `close()`

Gracefully shutdown the client and remove error handlers.

```javascript
await keplog.close();
```

## v2.0 Features

### Enhanced Stack Frames

The SDK automatically captures code snippets around error lines and classifies frames as vendor or application code.

**What's Included:**

```javascript
// Each stack frame includes:
{
  file: '/path/to/file.js',
  line: 42,
  column: 15,
  function: 'processPayment',
  code_snippet: {
    39: '  const user = await User.findById(userId);',
    40: '  if (!user) {',
    41: '    throw new Error("User not found");',
    42: '  const payment = processPayment(user);  <- error here',
    43: '  return payment;',
    44: '}',
    45: ''
  },
  is_vendor: false,       // Code from node_modules
  is_application: true    // Your application code
}
```

**Benefits:**
- See code context without opening files
- Quickly identify vendor vs application errors
- Better debugging with 3 lines of context before/after error

### Context Separation

The SDK automatically separates **system context** (SDK-managed) from **extra context** (user-defined).

**System Context (`context`):**
```javascript
{
  exception_class: 'TypeError',
  frames: [...],           // Enhanced stack frames
  queries: [],            // Database queries (if provided)
  request: {...},         // HTTP request data (if provided)
  user: {...},            // User data (if provided)
  breadcrumbs: [...]      // Event breadcrumbs
}
```

**Extra Context (`extra_context`):**
```javascript
{
  order_id: 12345,
  cart_total: 99.99,
  feature_flags: {...},
  // ... all your custom fields
}
```

**Example:**
```javascript
keplog.captureError(error, {
  // These go to context (reserved keys)
  user: { id: '123', email: 'user@example.com' },
  request: { url: '/api/checkout', method: 'POST' },
  queries: [{ sql: 'SELECT * FROM orders' }],

  // These go to extra_context (custom fields)
  order_id: 12345,
  payment_method: 'credit_card',
  shipping_address: {...}
});
```

### Reserved Context Keys

The SDK protects certain keys from being accidentally overwritten:

**Reserved Keys:**
- `exception_class` - SDK adds automatically
- `frames` - SDK adds automatically
- `queries` - You can pass (optional)
- `request` - You can pass (optional)
- `breadcrumbs` - SDK manages

**What's Blocked:**

```javascript
// ❌ This will throw an error
keplog.setContext('exception_class', 'MyError');
keplog.setContext('frames', []);

// ❌ This will also throw an error
keplog.captureError(error, {
  exception_class: 'CustomError',  // Not allowed
  frames: [],                       // Not allowed
  breadcrumbs: []                   // Not allowed
});

// ✅ This works fine
keplog.setContext('custom_key', 'value');
keplog.captureError(error, {
  user: { id: '123' },      // Allowed
  request: {...},            // Allowed
  queries: [...],            // Allowed
  my_custom_field: 'value'   // Allowed
});
```

**Check Reserved Keys:**
```javascript
const { Scope } = require('@keplog/node');

const reservedKeys = Scope.getReservedKeys();
console.log(reservedKeys);
// ['exception_class', 'frames', 'queries', 'request', 'breadcrumbs']
```

## Usage Examples

### Basic Error Tracking

```javascript
const { KeplogClient } = require('@keplog/node');

const keplog = new KeplogClient({
  ingestKey: 'kep_ingest_your-ingest-key',
  environment: 'production'
});

// Manual error capture
try {
  processPayment();
} catch (error) {
  keplog.captureError(error, {
    userId: '123',
    action: 'payment'
  });
}
```

### Express.js Integration

```javascript
const express = require('express');
const { KeplogClient } = require('@keplog/node');

const app = express();
const keplog = new KeplogClient({ ingestKey: 'kep_ingest_your-ingest-key' });

// Add breadcrumb for each request
app.use((req, res, next) => {
  keplog.addBreadcrumb({
    type: 'http',
    message: `${req.method} ${req.path}`,
    data: {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    }
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  keplog.captureError(err, {
    request: {
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body
    }
  });

  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(3000);
```

### Breadcrumb Tracking

```javascript
const keplog = new KeplogClient({ ingestKey: 'kep_ingest_your-ingest-key' });

// Track user journey
keplog.addBreadcrumb({
  type: 'navigation',
  message: 'User viewed product list'
});

keplog.addBreadcrumb({
  type: 'user',
  message: 'User added item to cart',
  data: { productId: '123', quantity: 1 }
});

keplog.addBreadcrumb({
  type: 'navigation',
  message: 'User navigated to checkout'
});

// When error occurs, all breadcrumbs are included
try {
  processCheckout();
} catch (error) {
  keplog.captureError(error);
  // Error report will include all 3 breadcrumbs
}
```

### Global Context

```javascript
const keplog = new KeplogClient({ ingestKey: 'kep_ingest_your-ingest-key' });

// Set global tags
keplog.setTags({
  service: 'payment-api',
  region: 'us-east-1',
  version: '2.1.5'
});

// Set global context
keplog.setContext('runtime', {
  nodeVersion: process.version,
  platform: process.platform
});

// Set user (all errors will include this user)
keplog.setUser({
  id: '12345',
  email: 'user@example.com'
});

// All future errors include tags, context, and user
keplog.captureError(new Error('Test error'));
```

### beforeSend Hook

```javascript
const keplog = new KeplogClient({
  apiKey: 'kep_your-api-key',
  beforeSend: (event) => {
    // Filter out errors from bots
    if (event.context?.userAgent?.includes('bot')) {
      return null; // Don't send
    }

    // Remove sensitive data
    if (event.context?.password) {
      delete event.context.password;
    }

    // Add custom field
    event.context.processed = true;

    return event;
  }
});
```

### Automatic Error Capture

```javascript
const keplog = new KeplogClient({
  apiKey: 'kep_your-api-key',
  autoHandleUncaught: true,  // Enable automatic capture (default)
  exitOnUncaught: true,       // Exit after uncaught exception (default)
});

// Uncaught exceptions are automatically captured
setTimeout(() => {
  throw new Error('This will be automatically captured');
}, 1000);

// Unhandled promise rejections are automatically captured
Promise.reject(new Error('This will also be captured'));
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions.

```typescript
import { KeplogClient, type KeplogConfig, type Breadcrumb } from '@keplog/node';

const config: KeplogConfig = {
  ingestKey: 'kep_ingest_your-ingest-key',
  environment: 'production',
  release: 'v1.0.0'
};

const keplog = new KeplogClient(config);

const breadcrumb: Breadcrumb = {
  type: 'navigation',
  message: 'User navigated',
  data: { from: '/home', to: '/profile' }
};

keplog.addBreadcrumb(breadcrumb);
```

## Field Size Limits

The SDK automatically handles field size constraints:

- **Message**: 10KB max (truncated with `...[truncated]`)
- **Stack Trace**: 500KB max (truncated)
- **Context**: 256KB max when serialized (replaced with error object if exceeded)

## Environment Variables

The SDK respects these environment variables:

- `NODE_ENV` - Auto-detected as the environment if not explicitly configured
- Ingest Key should be configured programmatically, not via environment variables

## Best Practices

1. **Initialize Early**: Create the Keplog client as early as possible in your application to catch all errors.

2. **Use Breadcrumbs**: Add breadcrumbs for important user actions to help debug errors.

3. **Set User Context**: Use `setUser()` when users log in to track which users are affected by errors.

4. **Use Tags for Filtering**: Add tags for service names, regions, versions to filter errors in the dashboard.

5. **Test Ingest Key**: Always test your Ingest Key in development to ensure events are being sent.

6. **beforeSend Hook**: Use the `beforeSend` hook to filter sensitive data or ignore certain errors.

7. **Environment-Specific Config**: Disable tracking in test environments:
   ```javascript
   const keplog = new KeplogClient({
     ingestKey: 'kep_ingest_your-ingest-key',
     enabled: process.env.NODE_ENV !== 'test'
   });
   ```

## Documentation

Comprehensive guides are available in the `docs/` directory:

- **[ERROR_CAPTURE.md](docs/ERROR_CAPTURE.md)** - Complete guide to error capture capabilities
  - What errors can/cannot be captured
  - Configuration for maximum coverage
  - Best practices and debugging
- **[ERROR_FORMATTING.md](docs/ERROR_FORMATTING.md)** - Error formatting and stack trace details
  - Enhanced stack frames with code snippets
  - Class and method detection
  - Alternative approaches (Youch integration)

## Examples

See the `examples/` directory for complete working examples:

- **basic.js** - Simple error capture
- **breadcrumbs.js** - Breadcrumb tracking
- **advanced.js** - All features (tags, context, hooks)
- **error-types-demo.js** - All error types that can be captured
- **error-formatting-demo.js** - Error formatting with enhanced stack frames

Run examples:
```bash
npm run build  # Build first

node examples/basic.js
node examples/breadcrumbs.js
node examples/advanced.js
node examples/error-types-demo.js
node examples/error-formatting-demo.js
```

## Development

### Build

```bash
npm run build
```

### Development Mode (Watch)

```bash
npm run dev
```

### Test

```bash
npm test
```

## Package Details

- **Zero Runtime Dependencies**: Uses only Node.js built-in APIs
- **Dual Package**: Supports both CommonJS (`require`) and ESM (`import`)
- **TypeScript**: Full type definitions included
- **Node.js Compatibility**: Requires Node.js 14 or higher

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/keplog/keplog/issues
- Documentation: https://docs.keplog.com

## Contributing

Contributions are welcome! Please see our contributing guidelines.

---

Made with ❤️ by the Keplog team
