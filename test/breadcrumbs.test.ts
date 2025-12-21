import { BreadcrumbManager } from '../src/breadcrumbs';
import type { Breadcrumb } from '../src/types';

describe('BreadcrumbManager', () => {
  let manager: BreadcrumbManager;

  beforeEach(() => {
    manager = new BreadcrumbManager(5);
  });

  describe('add', () => {
    it('should add a breadcrumb', () => {
      const breadcrumb: Breadcrumb = {
        timestamp: Date.now(),
        type: 'navigation',
        message: 'Test breadcrumb',
      };

      manager.add(breadcrumb);

      const all = manager.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(breadcrumb);
    });

    it('should auto-add timestamp if not provided', () => {
      const breadcrumb: Breadcrumb = {
        timestamp: 0,
        message: 'Test',
      };

      const before = Date.now();
      manager.add(breadcrumb);
      const after = Date.now();

      const all = manager.getAll();
      expect(all[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(all[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should maintain FIFO order when exceeding max limit', () => {
      for (let i = 0; i < 10; i++) {
        manager.add({
          timestamp: i,
          message: `Breadcrumb ${i}`,
        });
      }

      const all = manager.getAll();
      expect(all).toHaveLength(5); // Max is 5
      expect(all[0].message).toBe('Breadcrumb 5'); // Oldest should be removed
      expect(all[4].message).toBe('Breadcrumb 9');
    });

    it('should add all breadcrumb properties', () => {
      const breadcrumb: Breadcrumb = {
        timestamp: Date.now(),
        type: 'http',
        category: 'fetch',
        message: 'GET /api/users',
        level: 'info',
        data: {
          status: 200,
          duration: 150,
        },
      };

      manager.add(breadcrumb);

      const all = manager.getAll();
      expect(all[0]).toEqual(breadcrumb);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no breadcrumbs', () => {
      expect(manager.getAll()).toEqual([]);
    });

    it('should return a copy of breadcrumbs', () => {
      manager.add({ timestamp: Date.now(), message: 'Test' });

      const all1 = manager.getAll();
      const all2 = manager.getAll();

      expect(all1).toEqual(all2);
      expect(all1).not.toBe(all2); // Different array instances
    });

    it('should not allow external modification', () => {
      manager.add({ timestamp: Date.now(), message: 'Test' });

      const all = manager.getAll();
      all.push({ timestamp: Date.now(), message: 'External' });

      expect(manager.getAll()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all breadcrumbs', () => {
      manager.add({ timestamp: Date.now(), message: 'Test 1' });
      manager.add({ timestamp: Date.now(), message: 'Test 2' });

      expect(manager.getAll()).toHaveLength(2);

      manager.clear();

      expect(manager.getAll()).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    it('should return the number of breadcrumbs', () => {
      expect(manager.getCount()).toBe(0);

      manager.add({ timestamp: Date.now(), message: 'Test 1' });
      expect(manager.getCount()).toBe(1);

      manager.add({ timestamp: Date.now(), message: 'Test 2' });
      expect(manager.getCount()).toBe(2);
    });

    it('should not exceed max breadcrumbs', () => {
      for (let i = 0; i < 10; i++) {
        manager.add({ timestamp: Date.now(), message: `Test ${i}` });
      }

      expect(manager.getCount()).toBe(5);
    });
  });
});
