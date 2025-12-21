import type { KeplogConfig, Breadcrumb, User, Level } from './types';
import { BreadcrumbManager } from './breadcrumbs';
import { Scope } from './scope';
import { Transport } from './transport';
import { ErrorSerializer } from './serializer';
import { NodeIntegration } from './integrations/node';
import { detectEnvironment, detectServerName } from './utils/environment';

/**
 * Main Keplog SDK client for error tracking
 *
 * @example
 * ```typescript
 * const keplog = new KeplogClient({
 *   apiKey: 'kep_your-api-key',
 *   environment: 'production'
 * });
 *
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   keplog.captureError(error);
 * }
 * ```
 */
export class KeplogClient {
  private config: Required<KeplogConfig>;
  private breadcrumbs: BreadcrumbManager;
  private scope: Scope;
  private transport: Transport;
  private enabled: boolean;
  private nodeIntegration?: NodeIntegration;

  constructor(config: KeplogConfig) {
    // Validate required config
    if (!config.apiKey) {
      throw new Error('Keplog API key is required');
    }

    // Set config with defaults
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'http://localhost:8080',
      environment: config.environment || detectEnvironment(),
      release: config.release || undefined as any,
      serverName: config.serverName || detectServerName(),
      maxBreadcrumbs: config.maxBreadcrumbs || 100,
      enabled: config.enabled !== undefined ? config.enabled : true,
      debug: config.debug || false,
      timeout: config.timeout || 5000,
      beforeSend: config.beforeSend || undefined as any,
      autoHandleUncaught: config.autoHandleUncaught !== undefined ? config.autoHandleUncaught : true,
      exitOnUncaught: config.exitOnUncaught !== undefined ? config.exitOnUncaught : true,
    };

    this.enabled = this.config.enabled;

    // Initialize components
    this.breadcrumbs = new BreadcrumbManager(this.config.maxBreadcrumbs);
    this.scope = new Scope();
    this.transport = new Transport({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      debug: this.config.debug,
    });

    // Install automatic error handlers if enabled
    if (this.config.autoHandleUncaught) {
      this.nodeIntegration = new NodeIntegration(this, this.config.exitOnUncaught);
      this.nodeIntegration.install();
    }

    if (this.config.debug) {
      console.log('[Keplog] Client initialized:', {
        environment: this.config.environment,
        serverName: this.config.serverName,
        release: this.config.release,
      });
    }
  }

  /**
   * Capture an error
   *
   * @param error Error object to capture
   * @param context Optional additional context
   * @returns Event ID if successful, null if failed
   *
   * @example
   * ```typescript
   * try {
   *   throw new Error('Something went wrong');
   * } catch (error) {
   *   keplog.captureError(error, { userId: '123' });
   * }
   * ```
   */
  async captureError(error: Error | any, context?: Record<string, any>): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // Serialize the error
      const event = ErrorSerializer.serialize(
        error,
        'error',
        this.scope,
        this.breadcrumbs.getAll(),
        context,
        this.config.environment,
        this.config.serverName,
        this.config.release
      );

      // Apply beforeSend hook if provided
      if (this.config.beforeSend) {
        const modifiedEvent = this.config.beforeSend(event);
        if (!modifiedEvent) {
          if (this.config.debug) {
            console.log('[Keplog] Event dropped by beforeSend hook');
          }
          return null;
        }
        return await this.transport.send(modifiedEvent);
      }

      return await this.transport.send(event);
    } catch (err) {
      if (this.config.debug) {
        console.error('[Keplog] Failed to capture error:', err);
      }
      return null;
    }
  }

  /**
   * Alias for captureError
   */
  async captureException(error: Error | any, context?: Record<string, any>): Promise<string | null> {
    return this.captureError(error, context);
  }

  /**
   * Capture a message (without stack trace)
   *
   * @param message Message to capture
   * @param level Severity level (default: 'info')
   * @param context Optional additional context
   * @returns Event ID if successful, null if failed
   *
   * @example
   * ```typescript
   * keplog.captureMessage('User completed checkout', 'info', { orderId: '123' });
   * ```
   */
  async captureMessage(
    message: string,
    level: Level = 'info',
    context?: Record<string, any>
  ): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // Serialize the message
      const event = ErrorSerializer.serializeMessage(
        message,
        level,
        this.scope,
        this.breadcrumbs.getAll(),
        context,
        this.config.environment,
        this.config.serverName,
        this.config.release
      );

      // Apply beforeSend hook if provided
      if (this.config.beforeSend) {
        const modifiedEvent = this.config.beforeSend(event);
        if (!modifiedEvent) {
          if (this.config.debug) {
            console.log('[Keplog] Message dropped by beforeSend hook');
          }
          return null;
        }
        return await this.transport.send(modifiedEvent);
      }

      return await this.transport.send(event);
    } catch (err) {
      if (this.config.debug) {
        console.error('[Keplog] Failed to capture message:', err);
      }
      return null;
    }
  }

  /**
   * Add a breadcrumb to the trail
   *
   * @param breadcrumb Breadcrumb to add
   *
   * @example
   * ```typescript
   * keplog.addBreadcrumb({
   *   type: 'navigation',
   *   message: 'User navigated to checkout',
   *   data: { from: '/cart', to: '/checkout' }
   * });
   * ```
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.enabled) {
      return;
    }

    this.breadcrumbs.add(breadcrumb);

    if (this.config.debug) {
      console.log('[Keplog] Breadcrumb added:', breadcrumb);
    }
  }

  /**
   * Set a context value that will be included in all future events
   *
   * @param key Context key
   * @param value Context value
   *
   * @example
   * ```typescript
   * keplog.setContext('build', { version: '1.2.3', commit: 'abc123' });
   * ```
   */
  setContext(key: string, value: any): void {
    this.scope.setContext(key, value);
  }

  /**
   * Set a tag that will be included in all future events
   *
   * @param key Tag key
   * @param value Tag value
   *
   * @example
   * ```typescript
   * keplog.setTag('region', 'us-east-1');
   * ```
   */
  setTag(key: string, value: string): void {
    this.scope.setTag(key, value);
  }

  /**
   * Set multiple tags at once
   *
   * @param tags Object containing tag key-value pairs
   *
   * @example
   * ```typescript
   * keplog.setTags({ region: 'us-east-1', service: 'api' });
   * ```
   */
  setTags(tags: Record<string, string>): void {
    this.scope.setTags(tags);
  }

  /**
   * Set user information
   *
   * @param user User object
   *
   * @example
   * ```typescript
   * keplog.setUser({ id: '123', email: 'user@example.com' });
   * ```
   */
  setUser(user: User): void {
    this.scope.setUser(user);
  }

  /**
   * Clear all scope data (context, tags, user, breadcrumbs)
   */
  clearScope(): void {
    this.scope.clear();
    this.breadcrumbs.clear();

    if (this.config.debug) {
      console.log('[Keplog] Scope cleared');
    }
  }

  /**
   * Enable or disable error tracking
   *
   * @param enabled Whether to enable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (this.config.debug) {
      console.log(`[Keplog] Tracking ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if error tracking is enabled
   *
   * @returns True if enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gracefully shutdown the client
   * Uninstalls automatic error handlers
   */
  async close(): Promise<void> {
    if (this.nodeIntegration) {
      this.nodeIntegration.uninstall();
    }

    if (this.config.debug) {
      console.log('[Keplog] Client closed');
    }
  }
}
