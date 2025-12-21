/**
 * Breadcrumbs example for Keplog Node.js SDK
 *
 * This example demonstrates:
 * - Adding breadcrumbs to track user actions
 * - How breadcrumbs are automatically included in error reports
 * - Different types of breadcrumbs (navigation, http, user actions)
 */

const { KeplogClient } = require('../dist/index.js');

const keplog = new KeplogClient({
  apiKey: 'kep_3968962e-e50a-42ae-9cc0-21eb48c2b874',
  environment: 'development',
  debug: true,
});

console.log('='.repeat(50));
console.log('Keplog Node.js SDK - Breadcrumbs Example');
console.log('='.repeat(50));
console.log();

// Simulate a user journey with breadcrumbs
console.log('Simulating user journey...\n');

// User opens the app
keplog.addBreadcrumb({
  type: 'navigation',
  category: 'ui',
  message: 'User opened the application',
  level: 'info',
});
console.log('1. User opened the application');

setTimeout(() => {
  // User views the product list
  keplog.addBreadcrumb({
    type: 'navigation',
    category: 'ui',
    message: 'User navigated to /products',
    data: {
      from: '/home',
      to: '/products',
    },
  });
  console.log('2. User navigated to /products');

  setTimeout(() => {
    // User clicks on a product
    keplog.addBreadcrumb({
      type: 'user',
      category: 'click',
      message: 'User clicked on product',
      data: {
        productId: 'prod_123',
        productName: 'Awesome Widget',
      },
    });
    console.log('3. User clicked on a product');

    setTimeout(() => {
      // API call to fetch product details
      keplog.addBreadcrumb({
        type: 'http',
        category: 'fetch',
        message: 'GET /api/products/123',
        data: {
          url: '/api/products/123',
          method: 'GET',
          status: 200,
          duration: 150,
        },
      });
      console.log('4. Fetched product details from API');

      setTimeout(() => {
        // User adds to cart
        keplog.addBreadcrumb({
          type: 'user',
          category: 'action',
          message: 'User added product to cart',
          data: {
            productId: 'prod_123',
            quantity: 1,
          },
        });
        console.log('5. User added product to cart');

        setTimeout(() => {
          // User navigates to checkout
          keplog.addBreadcrumb({
            type: 'navigation',
            category: 'ui',
            message: 'User navigated to /checkout',
            data: {
              from: '/cart',
              to: '/checkout',
            },
          });
          console.log('6. User navigated to checkout');

          setTimeout(() => {
            // API call to process payment (this fails!)
            keplog.addBreadcrumb({
              type: 'http',
              category: 'fetch',
              message: 'POST /api/payments',
              level: 'warning',
              data: {
                url: '/api/payments',
                method: 'POST',
                status: 500,
                duration: 2000,
              },
            });
            console.log('7. Payment API call failed\n');

            // Now an error occurs!
            console.log('An error occurred during payment processing...\n');
            try {
              throw new Error('Payment processing failed - Card declined');
            } catch (error) {
              keplog.captureError(error, {
                userId: 'user_789',
                orderId: 'ORD-12345',
                amount: 99.99,
              });
              console.log('✓ Error captured with all breadcrumbs');
              console.log('  (Check the error in Keplog - it will include all 7 breadcrumbs)');
            }

            setTimeout(() => {
              console.log();
              console.log('='.repeat(50));
              console.log('Breadcrumbs example completed!');
              console.log('The error report includes the complete trail of user actions');
              console.log('='.repeat(50));

              keplog.close();
            }, 1000);
          }, 500);
        }, 500);
      }, 500);
    }, 500);
  }, 500);
}, 500);
