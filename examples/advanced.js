/**
 * Advanced usage example for Keplog Node.js SDK
 *
 * This example demonstrates:
 * - Global context and tags
 * - User identification
 * - beforeSend hook for filtering/modifying events
 * - Enabling/disabling the SDK
 * - Automatic error capture (uncaught exceptions)
 */

const { KeplogClient } = require('../dist/index.js');

console.log('='.repeat(50));
console.log('Keplog Node.js SDK - Advanced Features Example');
console.log('='.repeat(50));
console.log();

// Initialize with advanced configuration
const keplog = new KeplogClient({
  apiKey: 'kep_3968962e-e50a-42ae-9cc0-21eb48c2b874',
  environment: 'production',
  release: 'v2.1.5',
  serverName: 'api-server-01',
  debug: true,

  // beforeSend hook - modify or filter events before sending
  beforeSend: (event) => {
    console.log('[beforeSend] Processing event:', event.message);

    // Filter out events containing certain keywords
    if (event.message.includes('IGNORE')) {
      console.log('[beforeSend] Event filtered out');
      return null; // Don't send this event
    }

    // Add custom fields to all events
    event.context = event.context || {};
    event.context.custom_field = 'Added by beforeSend hook';

    return event;
  },

  // Automatic error capture enabled (default)
  autoHandleUncaught: true,

  // Don't exit on uncaught exceptions (for demo purposes)
  exitOnUncaught: false,
});

// Example 1: Set global tags
console.log('Example 1: Setting global tags...');
keplog.setTag('service', 'payment-api');
keplog.setTag('region', 'us-east-1');
keplog.setTag('version', '2.1.5');

// Or set multiple tags at once
keplog.setTags({
  deployment: 'production',
  cluster: 'main',
});
console.log('✓ Global tags set\n');

setTimeout(() => {
  // Example 2: Set global context
  console.log('Example 2: Setting global context...');
  keplog.setContext('build', {
    commit: 'abc123def456',
    branch: 'main',
    timestamp: new Date().toISOString(),
  });
  keplog.setContext('runtime', {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  });
  console.log('✓ Global context set\n');

  setTimeout(() => {
    // Example 3: Set user information
    console.log('Example 3: Setting user information...');
    keplog.setUser({
      id: 'user_12345',
      email: 'john.doe@example.com',
      username: 'johndoe',
      subscription: 'premium',
    });
    console.log('✓ User information set\n');

    setTimeout(() => {
      // Example 4: Capture an error (will include all global data)
      console.log('Example 4: Capturing error with global data...');
      try {
        throw new Error('Test error with global context');
      } catch (error) {
        keplog.captureError(error, {
          localData: 'This is local to this error',
          transactionId: 'txn_789',
        });
        console.log('✓ Error captured (check it includes tags, context, and user)\n');
      }

      setTimeout(() => {
        // Example 5: beforeSend hook filtering
        console.log('Example 5: Testing beforeSend filter...');
        try {
          throw new Error('IGNORE - This error should be filtered');
        } catch (error) {
          keplog.captureError(error);
          console.log('✓ Error filtered by beforeSend hook\n');
        }

        setTimeout(() => {
          // Example 6: Enable/Disable SDK
          console.log('Example 6: Testing enable/disable...');
          keplog.setEnabled(false);
          console.log('SDK disabled');

          try {
            throw new Error('This error will not be sent');
          } catch (error) {
            keplog.captureError(error);
            console.log('✓ Error not sent (SDK disabled)\n');
          }

          // Re-enable
          keplog.setEnabled(true);
          console.log('SDK re-enabled\n');

          setTimeout(() => {
            // Example 7: Automatic uncaught exception handling
            console.log('Example 7: Testing automatic error capture...');
            console.log('Note: Uncaught exceptions are automatically captured\n');

            // Trigger an uncaught exception (only if not in a test environment)
            // Uncomment the following line to test automatic capture:
            // setTimeout(() => { throw new Error('Automatic uncaught exception'); }, 1000);

            setTimeout(() => {
              // Example 8: Clear scope
              console.log('Example 8: Clearing scope...');
              keplog.clearScope();
              console.log('✓ All context, tags, user, and breadcrumbs cleared\n');

              setTimeout(() => {
                console.log('='.repeat(50));
                console.log('Advanced features example completed!');
                console.log('='.repeat(50));
                console.log();
                console.log('Features demonstrated:');
                console.log('  ✓ Global tags');
                console.log('  ✓ Global context');
                console.log('  ✓ User identification');
                console.log('  ✓ beforeSend hook for filtering/modifying');
                console.log('  ✓ Enable/disable SDK');
                console.log('  ✓ Automatic error capture');
                console.log('  ✓ Clear scope');
                console.log();

                keplog.close();
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);
