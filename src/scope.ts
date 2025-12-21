import type { User } from './types';

/**
 * Manages global context and scope for error events
 * Stores tags, context data, and user information that applies to all errors
 */
export class Scope {
  /**
   * Reserved context keys that cannot be set manually via setContext()
   * These are managed by the SDK
   */
  private static readonly RESERVED_KEYS = [
    'exception_class',
    'frames',
    'queries',
    'request',
    'breadcrumbs',
  ];

  /**
   * Reserved keys that can be passed in captureException/captureMessage
   */
  private static readonly ALLOWED_IN_CAPTURE = ['user', 'request', 'queries'];

  private context: Record<string, any> = {};
  private tags: Record<string, string> = {};
  private user?: User;

  /**
   * Set a context value
   * @param key Context key
   * @param value Context value
   * @throws Error if key is reserved
   */
  setContext(key: string, value: any): void {
    if (Scope.RESERVED_KEYS.includes(key)) {
      throw new Error(
        `Cannot set reserved context key '${key}'. Reserved keys are: ${Scope.RESERVED_KEYS.join(', ')}`
      );
    }
    this.context[key] = value;
  }

  /**
   * Get all context data
   * @returns Context object
   */
  getContext(): Record<string, any> {
    return { ...this.context };
  }

  /**
   * Set a single tag
   * @param key Tag key
   * @param value Tag value
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /**
   * Set multiple tags at once
   * @param tags Object containing tag key-value pairs
   */
  setTags(tags: Record<string, string>): void {
    this.tags = { ...this.tags, ...tags };
  }

  /**
   * Get all tags
   * @returns Tags object
   */
  getTags(): Record<string, string> {
    return { ...this.tags };
  }

  /**
   * Set user information
   * @param user User object
   */
  setUser(user: User): void {
    this.user = user;
  }

  /**
   * Get user information
   * @returns User object or undefined
   */
  getUser(): User | undefined {
    return this.user ? { ...this.user } : undefined;
  }

  /**
   * Clear all scope data (context, tags, user)
   */
  clear(): void {
    this.context = {};
    this.tags = {};
    this.user = undefined;
  }

  /**
   * Merge global scope with local context
   * Local context takes precedence over global scope
   *
   * @param localContext Optional local context to merge
   * @returns Merged context object
   * @throws Error if local context contains reserved keys that are not allowed
   */
  merge(localContext?: Record<string, any>): Record<string, any> {
    // Validate local context doesn't contain reserved keys (except allowed ones)
    if (localContext) {
      for (const key of Object.keys(localContext)) {
        if (
          Scope.RESERVED_KEYS.includes(key) &&
          !Scope.ALLOWED_IN_CAPTURE.includes(key)
        ) {
          throw new Error(
            `Cannot set reserved context key '${key}'. Use SDK methods to set this field.`
          );
        }
      }
    }

    const merged: Record<string, any> = {
      ...this.context,
      ...(localContext || {}),
    };

    // Add tags if they exist
    if (Object.keys(this.tags).length > 0 || localContext?.tags) {
      merged.tags = {
        ...this.tags,
        ...(localContext?.tags || {}),
      };
    }

    // Add user if it exists
    if (this.user || localContext?.user) {
      merged.user = {
        ...(this.user || {}),
        ...(localContext?.user || {}),
      };
    }

    return merged;
  }

  /**
   * Get the list of reserved context keys
   * @returns Array of reserved key names
   */
  static getReservedKeys(): string[] {
    return [...Scope.RESERVED_KEYS];
  }
}
