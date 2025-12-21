import type { Breadcrumb } from './types';

/**
 * Manages breadcrumbs - a trail of user actions/events before an error
 * Helps developers understand what led to an error
 */
export class BreadcrumbManager {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs: number = 100) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  /**
   * Add a breadcrumb to the trail
   * @param breadcrumb Breadcrumb to add
   */
  add(breadcrumb: Breadcrumb): void {
    // Ensure timestamp is set
    if (!breadcrumb.timestamp) {
      breadcrumb.timestamp = Date.now();
    }

    // Add to the list
    this.breadcrumbs.push(breadcrumb);

    // Maintain max breadcrumbs limit (FIFO - remove oldest)
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift(); // Remove the first (oldest) breadcrumb
    }
  }

  /**
   * Get all breadcrumbs
   * @returns Array of breadcrumbs
   */
  getAll(): Breadcrumb[] {
    // Return a copy to prevent external modifications
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Get the number of breadcrumbs currently stored
   */
  getCount(): number {
    return this.breadcrumbs.length;
  }
}
