import { Scope } from '../src/scope';
import type { User } from '../src/types';

describe('Scope', () => {
  let scope: Scope;

  beforeEach(() => {
    scope = new Scope();
  });

  describe('context', () => {
    it('should set and get context', () => {
      scope.setContext('key1', 'value1');
      scope.setContext('key2', { nested: 'value' });

      const context = scope.getContext();

      expect(context.key1).toBe('value1');
      expect(context.key2).toEqual({ nested: 'value' });
    });

    it('should return a copy of context', () => {
      scope.setContext('key', 'value');

      const context1 = scope.getContext();
      const context2 = scope.getContext();

      expect(context1).toEqual(context2);
      expect(context1).not.toBe(context2);
    });

    it('should not allow external modification of context', () => {
      scope.setContext('key', 'value');

      const context = scope.getContext();
      context.external = 'modified';

      expect(scope.getContext()).not.toHaveProperty('external');
    });
  });

  describe('tags', () => {
    it('should set and get a single tag', () => {
      scope.setTag('environment', 'production');

      const tags = scope.getTags();

      expect(tags.environment).toBe('production');
    });

    it('should set multiple tags at once', () => {
      scope.setTags({
        service: 'api',
        region: 'us-east-1',
        version: '1.0.0',
      });

      const tags = scope.getTags();

      expect(tags.service).toBe('api');
      expect(tags.region).toBe('us-east-1');
      expect(tags.version).toBe('1.0.0');
    });

    it('should merge tags when setting multiple times', () => {
      scope.setTag('tag1', 'value1');
      scope.setTags({ tag2: 'value2', tag3: 'value3' });

      const tags = scope.getTags();

      expect(tags.tag1).toBe('value1');
      expect(tags.tag2).toBe('value2');
      expect(tags.tag3).toBe('value3');
    });

    it('should return a copy of tags', () => {
      scope.setTag('key', 'value');

      const tags1 = scope.getTags();
      const tags2 = scope.getTags();

      expect(tags1).toEqual(tags2);
      expect(tags1).not.toBe(tags2);
    });
  });

  describe('user', () => {
    it('should set and get user', () => {
      const user: User = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
      };

      scope.setUser(user);

      const retrievedUser = scope.getUser();

      expect(retrievedUser).toEqual(user);
    });

    it('should return undefined when no user is set', () => {
      expect(scope.getUser()).toBeUndefined();
    });

    it('should return a copy of user', () => {
      const user: User = { id: '123', email: 'test@example.com' };
      scope.setUser(user);

      const user1 = scope.getUser();
      const user2 = scope.getUser();

      expect(user1).toEqual(user2);
      expect(user1).not.toBe(user2);
    });
  });

  describe('clear', () => {
    it('should clear all scope data', () => {
      scope.setContext('key', 'value');
      scope.setTag('tag', 'value');
      scope.setUser({ id: '123' });

      scope.clear();

      expect(scope.getContext()).toEqual({});
      expect(scope.getTags()).toEqual({});
      expect(scope.getUser()).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should merge global scope with local context', () => {
      scope.setContext('global1', 'value1');
      scope.setContext('global2', 'value2');

      const merged = scope.merge({
        local1: 'localValue1',
        local2: 'localValue2',
      });

      expect(merged.global1).toBe('value1');
      expect(merged.global2).toBe('value2');
      expect(merged.local1).toBe('localValue1');
      expect(merged.local2).toBe('localValue2');
    });

    it('should let local context override global', () => {
      scope.setContext('key', 'globalValue');

      const merged = scope.merge({
        key: 'localValue',
      });

      expect(merged.key).toBe('localValue');
    });

    it('should merge tags', () => {
      scope.setTag('globalTag', 'globalValue');

      const merged = scope.merge({
        tags: {
          localTag: 'localValue',
        },
      });

      expect(merged.tags.globalTag).toBe('globalValue');
      expect(merged.tags.localTag).toBe('localValue');
    });

    it('should let local tags override global tags', () => {
      scope.setTag('tag', 'globalValue');

      const merged = scope.merge({
        tags: {
          tag: 'localValue',
        },
      });

      expect(merged.tags.tag).toBe('localValue');
    });

    it('should merge user data', () => {
      scope.setUser({ id: '123', email: 'test@example.com' });

      const merged = scope.merge({
        user: {
          username: 'testuser',
        },
      });

      expect(merged.user.id).toBe('123');
      expect(merged.user.email).toBe('test@example.com');
      expect(merged.user.username).toBe('testuser');
    });

    it('should work with no local context', () => {
      scope.setContext('key', 'value');
      scope.setTag('tag', 'value');

      const merged = scope.merge();

      expect(merged.key).toBe('value');
      expect(merged.tags.tag).toBe('value');
    });

    it('should include tags only if they exist', () => {
      scope.setContext('key', 'value');

      const merged = scope.merge();

      expect(merged.tags).toBeUndefined();
    });

    it('should include user only if it exists', () => {
      scope.setContext('key', 'value');

      const merged = scope.merge();

      expect(merged.user).toBeUndefined();
    });
  });

  describe('reserved keys protection', () => {
    it('should throw error when setting reserved key via setContext', () => {
      const reservedKeys = ['exception_class', 'frames', 'queries', 'request', 'breadcrumbs'];

      reservedKeys.forEach((key) => {
        expect(() => {
          scope.setContext(key, 'value');
        }).toThrow(`Cannot set reserved context key '${key}'`);
      });
    });

    it('should allow setting non-reserved keys via setContext', () => {
      expect(() => {
        scope.setContext('custom_key', 'value');
        scope.setContext('user_id', 123);
        scope.setContext('order_id', 'abc');
      }).not.toThrow();
    });

    it('should throw error when merging forbidden reserved keys', () => {
      expect(() => {
        scope.merge({
          exception_class: 'CustomError',
        });
      }).toThrow(`Cannot set reserved context key 'exception_class'`);

      expect(() => {
        scope.merge({
          frames: [],
        });
      }).toThrow(`Cannot set reserved context key 'frames'`);

      expect(() => {
        scope.merge({
          breadcrumbs: [],
        });
      }).toThrow(`Cannot set reserved context key 'breadcrumbs'`);
    });

    it('should allow merging allowed reserved keys', () => {
      expect(() => {
        scope.merge({
          user: { id: '123' },
          request: { url: '/api/test' },
          queries: [{ sql: 'SELECT *' }],
        });
      }).not.toThrow();
    });

    it('should return list of reserved keys', () => {
      const reservedKeys = Scope.getReservedKeys();

      expect(reservedKeys).toEqual([
        'exception_class',
        'frames',
        'queries',
        'request',
        'breadcrumbs',
      ]);
    });
  });
});
