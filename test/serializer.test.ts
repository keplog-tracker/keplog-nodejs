import { ErrorSerializer } from '../src/serializer';
import { Scope } from '../src/scope';
import type { Breadcrumb } from '../src/types';

describe('ErrorSerializer', () => {
  let scope: Scope;

  beforeEach(() => {
    scope = new Scope();
  });

  describe('serialize', () => {
    it('should serialize an Error object', () => {
      const error = new Error('Test error');
      const breadcrumbs: Breadcrumb[] = [];

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        breadcrumbs,
        undefined,
        'production',
        'server-01',
        'v1.0.0'
      );

      expect(event.message).toBe('Test error');
      expect(event.level).toBe('error');
      expect(event.stack_trace).toContain('Error: Test error');
      expect(event.environment).toBe('production');
      expect(event.server_name).toBe('server-01');
      expect(event.release).toBe('v1.0.0');
      expect(event.timestamp).toBeDefined();
      expect(event.context).toBeDefined();
    });

    it('should include global scope in extra_context', () => {
      const error = new Error('Test');
      scope.setContext('globalKey', 'globalValue');
      scope.setTag('service', 'api');
      scope.setUser({ id: '123' });

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.extra_context?.globalKey).toBe('globalValue');
      expect(event.extra_context?.tags?.service).toBe('api');
      expect(event.context?.user?.id).toBe('123');
    });

    it('should merge local context with global scope in extra_context', () => {
      const error = new Error('Test');
      scope.setContext('globalKey', 'globalValue');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        [],
        { localKey: 'localValue' }
      );

      expect(event.extra_context?.globalKey).toBe('globalValue');
      expect(event.extra_context?.localKey).toBe('localValue');
    });

    it('should include breadcrumbs in context', () => {
      const error = new Error('Test');
      const breadcrumbs: Breadcrumb[] = [
        { timestamp: Date.now(), message: 'Action 1' },
        { timestamp: Date.now(), message: 'Action 2' },
      ];

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        breadcrumbs
      );

      expect(event.context?.breadcrumbs).toEqual(breadcrumbs);
    });

    it('should not include breadcrumbs if empty', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.context?.breadcrumbs).toBeUndefined();
    });

    it('should handle Error-like objects', () => {
      const errorLike = {
        message: 'Custom error',
        stack: 'Error: Custom\n    at test',
      };

      const event = ErrorSerializer.serialize(
        errorLike,
        'error',
        scope,
        []
      );

      expect(event.message).toBe('Custom error');
      expect(event.stack_trace).toBe('Error: Custom\n    at test');
    });

    it('should handle string errors', () => {
      const event = ErrorSerializer.serialize(
        'String error',
        'error',
        scope,
        []
      );

      expect(event.message).toBe('String error');
    });

    it('should handle null/undefined errors', () => {
      const event = ErrorSerializer.serialize(
        null,
        'error',
        scope,
        []
      );

      expect(event.message).toBe('Unknown error');
    });

    it('should generate ISO 8601 timestamp', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should support all severity levels', () => {
      const error = new Error('Test');
      const levels = ['critical', 'error', 'warning', 'info', 'debug'] as const;

      levels.forEach((level) => {
        const event = ErrorSerializer.serialize(
          error,
          level,
          scope,
          []
        );

        expect(event.level).toBe(level);
      });
    });

    it('should omit optional fields when not provided', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.environment).toBeUndefined();
      expect(event.server_name).toBeUndefined();
      expect(event.release).toBeUndefined();
    });

    it('should include exception_class in context', () => {
      const error = new TypeError('Type error');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.context?.exception_class).toBe('TypeError');
    });

    it('should include enhanced frames in context', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.context?.frames).toBeDefined();
      expect(Array.isArray(event.context?.frames)).toBe(true);
      if (event.context?.frames && event.context.frames.length > 0) {
        const frame = event.context.frames[0];
        expect(frame).toHaveProperty('file');
        expect(frame).toHaveProperty('line');
        expect(frame).toHaveProperty('is_vendor');
        expect(frame).toHaveProperty('is_application');
      }
    });

    it('should initialize empty queries array in context', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.context?.queries).toBeDefined();
      expect(Array.isArray(event.context?.queries)).toBe(true);
      expect(event.context?.queries).toEqual([]);
    });

    it('should preserve queries if provided in local context', () => {
      const error = new Error('Test');
      const queries = [{ sql: 'SELECT * FROM users', time: 5 }];

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        [],
        { queries }
      );

      expect(event.context?.queries).toEqual(queries);
    });

    it('should separate system context and extra_context', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        [],
        {
          user: { id: '123', email: 'test@example.com' },
          request: { url: '/api/test', method: 'POST' },
          queries: [{ sql: 'SELECT *' }],
          custom_field: 'custom_value',
          order_id: 12345,
        }
      );

      // System context should have reserved keys
      expect(event.context?.exception_class).toBe('Error');
      expect(event.context?.frames).toBeDefined();
      expect(event.context?.queries).toBeDefined();
      expect(event.context?.user).toEqual({ id: '123', email: 'test@example.com' });
      expect(event.context?.request).toEqual({ url: '/api/test', method: 'POST' });

      // Extra context should have user-defined fields only
      expect(event.extra_context?.custom_field).toBe('custom_value');
      expect(event.extra_context?.order_id).toBe(12345);

      // Extra context should NOT have reserved keys
      expect(event.extra_context?.exception_class).toBeUndefined();
      expect(event.extra_context?.frames).toBeUndefined();
      expect(event.extra_context?.user).toBeUndefined();
      expect(event.extra_context?.request).toBeUndefined();
      expect(event.extra_context?.queries).toBeUndefined();
    });

    it('should omit extra_context when empty', () => {
      const error = new Error('Test');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.extra_context).toBeUndefined();
    });

    it('should include extra_context only when has user-defined fields', () => {
      const error = new Error('Test');
      scope.setContext('custom_key', 'custom_value');

      const event = ErrorSerializer.serialize(
        error,
        'error',
        scope,
        []
      );

      expect(event.extra_context).toBeDefined();
      expect(event.extra_context?.custom_key).toBe('custom_value');
    });
  });

  describe('serializeMessage', () => {
    it('should serialize a message', () => {
      const event = ErrorSerializer.serializeMessage(
        'Test message',
        'info',
        scope,
        [],
        undefined,
        'production',
        'server-01',
        'v1.0.0'
      );

      expect(event.message).toBe('Test message');
      expect(event.level).toBe('info');
      expect(event.stack_trace).toBeUndefined();
      expect(event.environment).toBe('production');
      expect(event.server_name).toBe('server-01');
      expect(event.release).toBe('v1.0.0');
    });

    it('should not include stack trace for messages', () => {
      const event = ErrorSerializer.serializeMessage(
        'Test message',
        'info',
        scope,
        []
      );

      expect(event.stack_trace).toBeUndefined();
    });

    it('should include context and breadcrumbs', () => {
      scope.setContext('key', 'value');
      const breadcrumbs: Breadcrumb[] = [
        { timestamp: Date.now(), message: 'Action' },
      ];

      const event = ErrorSerializer.serializeMessage(
        'Test message',
        'info',
        scope,
        breadcrumbs,
        { localKey: 'localValue' }
      );

      expect(event.extra_context?.key).toBe('value');
      expect(event.extra_context?.localKey).toBe('localValue');
      expect(event.context?.breadcrumbs).toEqual(breadcrumbs);
    });

    it('should handle all severity levels', () => {
      const levels = ['critical', 'error', 'warning', 'info', 'debug'] as const;

      levels.forEach((level) => {
        const event = ErrorSerializer.serializeMessage(
          'Message',
          level,
          scope,
          []
        );

        expect(event.level).toBe(level);
      });
    });
  });
});
