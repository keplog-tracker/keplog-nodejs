/**
 * Error severity levels supported by Keplog
 */
export type Level = 'critical' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Configuration options for initializing the Keplog client
 */
export interface KeplogConfig {
  /**
   * Your project's API key (required)
   * Format: kep_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  apiKey: string;

  /**
   * Base URL for the Keplog API
   * @default 'http://localhost:8080'
   */
  baseUrl?: string;

  /**
   * Environment name (e.g., 'production', 'staging', 'development')
   * Auto-detected from NODE_ENV if not provided
   */
  environment?: string;

  /**
   * Release version or identifier (e.g., 'v1.2.3', git commit hash)
   */
  release?: string;

  /**
   * Server or instance name
   * Auto-detected from hostname if not provided
   */
  serverName?: string;

  /**
   * Maximum number of breadcrumbs to keep in memory
   * @default 100
   */
  maxBreadcrumbs?: number;

  /**
   * Enable or disable error tracking
   * @default true
   */
  enabled?: boolean;

  /**
   * Enable debug logging to console
   * @default false
   */
  debug?: boolean;

  /**
   * HTTP request timeout in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Hook called before sending an event
   * Return null to prevent sending, or return modified event
   */
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;

  /**
   * Automatically capture uncaught exceptions and unhandled rejections
   * @default true
   */
  autoHandleUncaught?: boolean;

  /**
   * Exit process after capturing uncaught exception
   * Follows Node.js default behavior
   * @default true
   */
  exitOnUncaught?: boolean;
}

/**
 * Error event payload sent to the Keplog API
 * Matches the backend ErrorEventRequest structure
 */
export interface ErrorEvent {
  /**
   * Error message (max 10KB)
   */
  message: string;

  /**
   * Error severity level
   */
  level: Level;

  /**
   * Stack trace (max 500KB)
   */
  stack_trace?: string;

  /**
   * SDK-managed context data (reserved keys)
   * Includes: exception_class, frames, queries, request, user, breadcrumbs
   * (max 256KB when serialized)
   */
  context?: Record<string, any>;

  /**
   * User-defined context data (all custom fields)
   * Only included if not empty
   * (max 256KB when serialized)
   */
  extra_context?: Record<string, any>;

  /**
   * Environment name
   */
  environment?: string;

  /**
   * Server or instance name
   */
  server_name?: string;

  /**
   * Release version
   */
  release?: string;

  /**
   * Event timestamp in ISO 8601 UTC format
   */
  timestamp: string;
}

/**
 * Breadcrumb represents a user action or event that occurred before an error
 * Helps provide context for debugging
 */
export interface Breadcrumb {
  /**
   * Unix timestamp in milliseconds
   */
  timestamp: number;

  /**
   * Breadcrumb type (e.g., 'http', 'navigation', 'console', 'user')
   */
  type?: string;

  /**
   * Breadcrumb category (e.g., 'xhr', 'fetch', 'ui', 'auth')
   */
  category?: string;

  /**
   * Human-readable message describing the breadcrumb
   */
  message?: string;

  /**
   * Severity level
   */
  level?: Level;

  /**
   * Additional structured data
   */
  data?: Record<string, any>;
}

/**
 * User information attached to error events
 */
export interface User {
  /**
   * Unique user identifier
   */
  id?: string;

  /**
   * User email address
   */
  email?: string;

  /**
   * Username
   */
  username?: string;

  /**
   * IP address
   */
  ip_address?: string;

  /**
   * Additional custom user properties
   */
  [key: string]: any;
}

/**
 * Internal transport configuration
 */
export interface TransportConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  debug: boolean;
}

/**
 * API response for successful error ingestion
 */
export interface IngestResponse {
  status: 'queued';
}

/**
 * API error response
 */
export interface ErrorResponse {
  error: string;
}
