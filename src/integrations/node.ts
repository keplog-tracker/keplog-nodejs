import type { KeplogClient } from '../client';

/**
 * Node.js integration for automatic error capture
 * Captures uncaught exceptions and unhandled promise rejections
 */
export class NodeIntegration {
  private client: KeplogClient;
  private exitOnUncaught: boolean;
  private uncaughtExceptionHandler: ((error: Error) => void) | null = null;
  private unhandledRejectionHandler: ((reason: any, promise: Promise<any>) => void) | null = null;

  constructor(client: KeplogClient, exitOnUncaught: boolean = true) {
    this.client = client;
    this.exitOnUncaught = exitOnUncaught;
  }

  /**
   * Install error handlers
   */
  install(): void {
    // Handle uncaught exceptions
    this.uncaughtExceptionHandler = this.handleUncaughtException.bind(this);
    process.on('uncaughtException', this.uncaughtExceptionHandler);

    // Handle unhandled promise rejections
    this.unhandledRejectionHandler = this.handleUnhandledRejection.bind(this);
    process.on('unhandledRejection', this.unhandledRejectionHandler);
  }

  /**
   * Uninstall error handlers
   */
  uninstall(): void {
    if (this.uncaughtExceptionHandler) {
      process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
      this.uncaughtExceptionHandler = null;
    }

    if (this.unhandledRejectionHandler) {
      process.removeListener('unhandledRejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }
  }

  /**
   * Handle uncaught exception
   */
  private async handleUncaughtException(error: Error): Promise<void> {
    try {
      // Capture the error with additional context
      await this.client.captureError(error, {
        uncaught: true,
        handler: 'uncaughtException',
      });

      // Log to console
      console.error('[Keplog] Uncaught exception captured:', error);

      // Exit if configured to do so (follows Node.js default behavior)
      if (this.exitOnUncaught) {
        // Give a moment for the error to be sent
        setTimeout(() => {
          console.error('[Keplog] Exiting due to uncaught exception');
          process.exit(1);
        }, 100);
      }
    } catch (err) {
      // If capturing fails, still log the original error
      console.error('[Keplog] Failed to capture uncaught exception:', err);
      console.error('[Keplog] Original error:', error);

      if (this.exitOnUncaught) {
        process.exit(1);
      }
    }
  }

  /**
   * Handle unhandled promise rejection
   */
  private async handleUnhandledRejection(reason: any, _promise: Promise<any>): Promise<void> {
    try {
      // Convert reason to Error if it's not already
      const error = reason instanceof Error ? reason : new Error(String(reason));

      // Capture the error with additional context
      await this.client.captureError(error, {
        unhandled_rejection: true,
        handler: 'unhandledRejection',
        reason: String(reason),
      });

      // Log to console
      console.error('[Keplog] Unhandled promise rejection captured:', reason);
    } catch (err) {
      // If capturing fails, still log the original error
      console.error('[Keplog] Failed to capture unhandled rejection:', err);
      console.error('[Keplog] Original reason:', reason);
    }
  }
}
