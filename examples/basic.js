/**
 * Basic usage example for Keplog Node.js SDK
 *
 * This example demonstrates:
 * - Initializing the SDK
 * - Capturing errors manually
 * - Capturing messages
 * - Adding context to errors
 */

const { KeplogClient } = require('../dist/index.js');

// Initialize the Keplog client
const keplog = new KeplogClient({
  apiKey: 'kep_3968962e-e50a-42ae-9cc0-21eb48c2b874',
  environment: 'development',
  release: 'v1.0.0',
  debug: true, // Enable debug logging
});

console.log('='.repeat(50));
console.log('Keplog Node.js SDK - Basic Usage Example');
console.log('='.repeat(50));
console.log();

// Example 1: Capture a simple error
console.log('Example 1: Capturing a simple error...');
try {
  // Simulate an error
  throw new Error('This is a test error from the SDK example');
} catch (error) {
  keplog.captureError(error);
  console.log('✓ Error captured');
}
console.log();

// Wait a moment before the next example
setTimeout(() => {
  // Example 2: Capture an error with additional context
  console.log('Example 2: Capturing error with context...');
  try {
    const userId = '12345';
    const action = 'checkout';

    // Simulate an error during checkout
    throw new Error('Payment processing failed');
  } catch (error) {
    keplog.captureError(error, {
      userId: '12345',
      action: 'checkout',
      amount: 99.99,
      currency: 'USD',
    });
    console.log('✓ Error with context captured');
  }
  console.log();

  setTimeout(() => {
    // Example 3: Capture a message (not an error)
    console.log('Example 3: Capturing a message...');
    keplog.captureMessage('User completed checkout successfully', 'info', {
      orderId: 'ORD-12345',
      amount: 99.99,
    });
    console.log('✓ Message captured');
    console.log();

    setTimeout(() => {
      // Example 4: Capture different severity levels
      console.log('Example 4: Capturing different severity levels...');
      keplog.captureMessage('This is a debug message', 'debug');
      keplog.captureMessage('This is an info message', 'info');
      keplog.captureMessage('This is a warning', 'warning');
      keplog.captureMessage('This is a critical message', 'critical');
      console.log('✓ Multiple severity levels captured');
      console.log();

      setTimeout(() => {
        console.log('='.repeat(50));
        console.log('All examples completed!');
        console.log('Check your Keplog dashboard to see the captured errors');
        console.log('='.repeat(50));

        // Close the client
        keplog.close();
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);
