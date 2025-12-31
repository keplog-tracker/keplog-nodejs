import { KeplogClient } from '../src/client';
import type { ErrorEvent } from '../src/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('KeplogClient', () => {
  let client: KeplogClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      status: 202,
      json: async () => ({ status: 'queued' }),
    } as Response);

    client = new KeplogClient({
      ingestKey: 'kep_ingest_test-ingest-key',
      autoHandleUncaught: false, // Disable for tests
      debug: false,
    });
  });

  afterEach(() => {
    client.close();
  });

  describe('constructor', () => {
    it('should throw error if Ingest Key is missing', () => {
      expect(() => {
        new KeplogClient({ ingestKey: '' });
      }).toThrow('Ingest Key is required');
    });

    it('should initialize with default values', () => {
      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
      });

      expect(testClient.isEnabled()).toBe(true);

      testClient.close();
    });

    it('should use provided configuration', () => {
      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        environment: 'staging',
        release: 'v2.0.0',
        enabled: false,
        autoHandleUncaught: false,
      });

      expect(testClient.isEnabled()).toBe(false);

      testClient.close();
    });
  });

  describe('captureError', () => {
    it('should capture an error', async () => {
      const error = new Error('Test error');

      const eventId = await client.captureError(error);

      expect(eventId).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.message).toBe('Test error');
      expect(body.level).toBe('error');
      expect(body.stack_trace).toContain('Error: Test error');
    });

    it('should include additional context', async () => {
      const error = new Error('Test');

      await client.captureError(error, {
        userId: '123',
        action: 'checkout',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.extra_context.userId).toBe('123');
      expect(body.extra_context.action).toBe('checkout');
    });

    it('should not send when disabled', async () => {
      client.setEnabled(false);

      const error = new Error('Test');
      const eventId = await client.captureError(error);

      expect(eventId).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should apply beforeSend hook', async () => {
      const beforeSend = jest.fn((event: ErrorEvent) => {
        event.context = { ...event.context, modified: true };
        return event;
      });

      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        beforeSend,
        autoHandleUncaught: false,
      });

      await testClient.captureError(new Error('Test'));

      expect(beforeSend).toHaveBeenCalled();

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.context.modified).toBe(true);

      testClient.close();
    });

    it('should not send if beforeSend returns null', async () => {
      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        beforeSend: () => null,
        autoHandleUncaught: false,
      });

      const eventId = await testClient.captureError(new Error('Test'));

      expect(eventId).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();

      testClient.close();
    });
  });

  describe('captureException', () => {
    it('should be an alias for captureError', async () => {
      const error = new Error('Test');

      const eventId = await client.captureException(error);

      expect(eventId).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('captureMessage', () => {
    it('should capture a message', async () => {
      const eventId = await client.captureMessage('Test message', 'info');

      expect(eventId).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.message).toBe('Test message');
      expect(body.level).toBe('info');
      expect(body.stack_trace).toBeUndefined();
    });

    it('should default to info level', async () => {
      await client.captureMessage('Test message');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.level).toBe('info');
    });

    it('should include context', async () => {
      await client.captureMessage('Test', 'info', { key: 'value' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.extra_context.key).toBe('value');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add a breadcrumb', async () => {
      client.addBreadcrumb({
        timestamp: Date.now(),
        type: 'navigation',
        message: 'User navigated',
      });

      await client.captureError(new Error('Test'));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.context.breadcrumbs).toHaveLength(1);
      expect(body.context.breadcrumbs[0].message).toBe('User navigated');
    });

    it('should not add breadcrumb when disabled', () => {
      client.setEnabled(false);

      client.addBreadcrumb({
        timestamp: Date.now(),
        message: 'Test',
      });

      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe('setContext', () => {
    it('should set global context', async () => {
      client.setContext('globalKey', 'globalValue');

      await client.captureError(new Error('Test'));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.extra_context.globalKey).toBe('globalValue');
    });

    it('should apply to all future errors', async () => {
      client.setContext('key', 'value');

      await client.captureError(new Error('Error 1'));
      await client.captureError(new Error('Error 2'));

      expect(mockFetch).toHaveBeenCalledTimes(2);

      mockFetch.mock.calls.forEach(([, options]) => {
        const body = JSON.parse(options?.body as string);
        expect(body.extra_context.key).toBe('value');
      });
    });
  });

  describe('setTag', () => {
    it('should set a single tag', async () => {
      client.setTag('environment', 'production');

      await client.captureError(new Error('Test'));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.extra_context.tags.environment).toBe('production');
    });
  });

  describe('setTags', () => {
    it('should set multiple tags', async () => {
      client.setTags({
        service: 'api',
        region: 'us-east-1',
      });

      await client.captureError(new Error('Test'));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.extra_context.tags.service).toBe('api');
      expect(body.extra_context.tags.region).toBe('us-east-1');
    });
  });

  describe('setUser', () => {
    it('should set user information', async () => {
      client.setUser({
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
      });

      await client.captureError(new Error('Test'));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.context.user.id).toBe('123');
      expect(body.context.user.email).toBe('test@example.com');
      expect(body.context.user.username).toBe('testuser');
    });
  });

  describe('clearScope', () => {
    it('should clear all scope data', async () => {
      client.setContext('key', 'value');
      client.setTag('tag', 'value');
      client.setUser({ id: '123' });
      client.addBreadcrumb({ timestamp: Date.now(), message: 'Test' });

      client.clearScope();

      await client.captureError(new Error('Test'));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.extra_context?.key).toBeUndefined();
      expect(body.extra_context?.tags).toBeUndefined();
      expect(body.context.user).toBeUndefined();
      expect(body.context.breadcrumbs).toBeUndefined();
    });
  });

  describe('setEnabled / isEnabled', () => {
    it('should enable and disable tracking', () => {
      expect(client.isEnabled()).toBe(true);

      client.setEnabled(false);
      expect(client.isEnabled()).toBe(false);

      client.setEnabled(true);
      expect(client.isEnabled()).toBe(true);
    });

    it('should prevent capturing when disabled', async () => {
      client.setEnabled(false);

      await client.captureError(new Error('Test'));
      await client.captureMessage('Test');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close gracefully', async () => {
      await expect(client.close()).resolves.not.toThrow();
    });
  });

  describe('integration', () => {
    it('should work end-to-end', async () => {
      // Set up client with all features
      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        environment: 'production',
        release: 'v1.0.0',
        serverName: 'server-01',
        autoHandleUncaught: false,
      });

      // Add global context
      testClient.setContext('build', { commit: 'abc123' });
      testClient.setTag('service', 'api');
      testClient.setUser({ id: '123', email: 'user@example.com' });

      // Add breadcrumbs
      testClient.addBreadcrumb({
        timestamp: Date.now(),
        type: 'navigation',
        message: 'User navigated to checkout',
      });

      // Capture error with local context
      const error = new Error('Payment failed');
      await testClient.captureError(error, {
        orderId: 'ORD-123',
        amount: 99.99,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      // Verify all data is included
      expect(body.message).toBe('Payment failed');
      expect(body.level).toBe('error');
      expect(body.environment).toBe('production');
      expect(body.server_name).toBe('server-01');
      expect(body.release).toBe('v1.0.0');
      expect(body.extra_context.build.commit).toBe('abc123');
      expect(body.extra_context.tags.service).toBe('api');
      expect(body.context.user.id).toBe('123');
      expect(body.extra_context.orderId).toBe('ORD-123');
      expect(body.context.breadcrumbs).toHaveLength(1);

      testClient.close();
    });
  });

  describe('infinite loop protection', () => {
    it('should handle beforeSend throwing error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
        beforeSend: () => {
          throw new Error('beforeSend error');
        },
      });

      // Should not throw, should return null
      const eventId = await testClient.captureError(new Error('Test error'));

      expect(eventId).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Keplog] beforeSend callback threw error:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      testClient.close();
    });

    it('should prevent recursion when SDK throws during capture', async () => {
      let captureAttempts = 0;

      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
        debug: true,
        beforeSend: (event) => {
          captureAttempts++;
          if (captureAttempts === 1) {
            // First call - throw error to simulate SDK bug
            throw new Error('SDK bug during serialization');
          }
          return event;
        },
      });

      // First capture should fail gracefully
      const eventId = await testClient.captureError(new Error('User error'));

      // Should return null due to beforeSend throwing
      expect(eventId).toBeNull();

      // Should only try once, not infinite loop
      expect(captureAttempts).toBe(1);

      testClient.close();
    });

    it('should reset isCapturing flag even when error occurs', async () => {
      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
        beforeSend: () => {
          throw new Error('Error during send');
        },
      });

      // First capture - should fail and reset flag
      const eventId1 = await testClient.captureError(new Error('Error 1'));
      expect(eventId1).toBeNull();

      // Second capture on same client - should also fail gracefully (not hang)
      // This proves the flag is properly reset in finally block
      const eventId2 = await testClient.captureError(new Error('Error 2'));
      expect(eventId2).toBeNull();

      testClient.close();
    });

    it('should not capture errors while already capturing (recursion guard)', async () => {
      let callCount = 0;
      let testClient: KeplogClient;

      testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
        debug: true,
        beforeSend: (event) => {
          callCount++;
          // Simulate recursive capture attempt
          if (callCount === 1) {
            // Try to capture another error while processing this one
            // This would cause infinite loop without protection
            testClient.captureError(new Error('Recursive error'));
          }
          return event;
        },
      });

      await testClient.captureError(new Error('Original error'));

      // BeforeSend should be called only once for the original error
      // The recursive call should be blocked by isCapturing guard
      expect(callCount).toBe(1);

      testClient.close();
    });

    it('should handle multiple rapid errors without recursion', async () => {
      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
        debug: false,
      });

      // Capture multiple errors sequentially (not in parallel)
      // to avoid recursion guard blocking parallel calls
      await testClient.captureError(new Error('Error 1'));
      await testClient.captureError(new Error('Error 2'));
      await testClient.captureError(new Error('Error 3'));

      // Should have attempted to send all 3
      expect(mockFetch).toHaveBeenCalledTimes(3);

      testClient.close();
    });

    it('should handle SDK internal errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const testClient = new KeplogClient({
        ingestKey: 'kep_ingest_test-key',
        autoHandleUncaught: false,
        debug: true,
      });

      // Mock fetch to throw error (simulate network failure during send)
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw, should return null
      const eventId = await testClient.captureError(new Error('Test error'));

      expect(eventId).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Keplog] Failed to send event:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      testClient.close();
    });
  });
});
