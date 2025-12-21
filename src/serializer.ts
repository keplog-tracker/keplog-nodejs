import type { ErrorEvent, Level, Breadcrumb } from './types';
import { Scope } from './scope';
import { extractStackTrace, parseEnhancedFrames } from './utils/stack-trace';

/**
 * Serializes errors and messages into ErrorEvent format for the Keplog API
 */
export class ErrorSerializer {
  /**
   * Reserved context keys that are SDK-managed
   */
  private static readonly RESERVED_CONTEXT_KEYS = [
    'exception_class',
    'frames',
    'queries',
    'request',
    'user',
    'breadcrumbs',
  ];
  /**
   * Serialize an Error object into an ErrorEvent
   *
   * @param error Error object to serialize
   * @param level Error severity level
   * @param scope Global scope manager
   * @param breadcrumbs Current breadcrumbs
   * @param localContext Optional local context for this specific error
   * @param environment Environment name
   * @param serverName Server name
   * @param release Release version
   * @returns Serialized ErrorEvent
   */
  static serialize(
    error: Error | any,
    level: Level,
    scope: Scope,
    breadcrumbs: Breadcrumb[],
    localContext?: Record<string, any>,
    environment?: string,
    serverName?: string,
    release?: string
  ): ErrorEvent {
    // Extract error message
    const message = this.extractMessage(error);

    // Extract stack trace
    const stackTrace = extractStackTrace(error);

    // Merge context (global scope + local context)
    const mergedContext = scope.merge(localContext);

    // Separate system context and user-defined extra context
    const systemContext: Record<string, any> = {};
    const extraContext: Record<string, any> = {};

    for (const [key, value] of Object.entries(mergedContext)) {
      if (this.RESERVED_CONTEXT_KEYS.includes(key)) {
        systemContext[key] = value;
      } else {
        extraContext[key] = value;
      }
    }

    // Add SDK-generated context
    systemContext.exception_class = error?.constructor?.name || 'Error';

    // Add enhanced stack frames if error is an Error object
    if (error instanceof Error) {
      systemContext.frames = parseEnhancedFrames(error);
    }

    // Initialize queries array if not provided
    if (!systemContext.queries) {
      systemContext.queries = [];
    }

    // Add breadcrumbs if any exist
    if (breadcrumbs.length > 0) {
      systemContext.breadcrumbs = breadcrumbs;
    }

    // Create the event
    const event: ErrorEvent = {
      message,
      level,
      stack_trace: stackTrace,
      context: systemContext,
      timestamp: new Date().toISOString(),
    };

    // Add extra_context only if not empty
    if (Object.keys(extraContext).length > 0) {
      event.extra_context = extraContext;
    }

    // Add optional fields if provided
    if (environment) {
      event.environment = environment;
    }
    if (serverName) {
      event.server_name = serverName;
    }
    if (release) {
      event.release = release;
    }

    return event;
  }

  /**
   * Serialize a message (not an Error object) into an ErrorEvent
   *
   * @param message Message string
   * @param level Error severity level
   * @param scope Global scope manager
   * @param breadcrumbs Current breadcrumbs
   * @param localContext Optional local context
   * @param environment Environment name
   * @param serverName Server name
   * @param release Release version
   * @returns Serialized ErrorEvent
   */
  static serializeMessage(
    message: string,
    level: Level,
    scope: Scope,
    breadcrumbs: Breadcrumb[],
    localContext?: Record<string, any>,
    environment?: string,
    serverName?: string,
    release?: string
  ): ErrorEvent {
    // Merge context
    const mergedContext = scope.merge(localContext);

    // Separate system context and user-defined extra context
    const systemContext: Record<string, any> = {};
    const extraContext: Record<string, any> = {};

    for (const [key, value] of Object.entries(mergedContext)) {
      if (this.RESERVED_CONTEXT_KEYS.includes(key)) {
        systemContext[key] = value;
      } else {
        extraContext[key] = value;
      }
    }

    // Initialize queries array if not provided
    if (!systemContext.queries) {
      systemContext.queries = [];
    }

    // Add breadcrumbs if any exist
    if (breadcrumbs.length > 0) {
      systemContext.breadcrumbs = breadcrumbs;
    }

    // Create the event (no stack trace for messages)
    const event: ErrorEvent = {
      message,
      level,
      context: systemContext,
      timestamp: new Date().toISOString(),
    };

    // Add extra_context only if not empty
    if (Object.keys(extraContext).length > 0) {
      event.extra_context = extraContext;
    }

    // Add optional fields
    if (environment) {
      event.environment = environment;
    }
    if (serverName) {
      event.server_name = serverName;
    }
    if (release) {
      event.release = release;
    }

    return event;
  }

  /**
   * Extract message from an error (handles various error types)
   *
   * @param error Error or any value
   * @returns Error message string
   */
  private static extractMessage(error: any): string {
    if (!error) {
      return 'Unknown error';
    }

    // Standard Error object
    if (error instanceof Error && error.message) {
      return error.message;
    }

    // Object with message property
    if (typeof error === 'object' && error.message) {
      return String(error.message);
    }

    // String error
    if (typeof error === 'string') {
      return error;
    }

    // Try to stringify anything else
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
