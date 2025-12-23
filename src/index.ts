/**
 * @keplog/node - Official Keplog SDK for Node.js
 *
 * Error tracking and monitoring for Node.js applications
 */

// Export main client
export { KeplogClient } from './client';

// Export types
export type {
  KeplogConfig,
  ErrorEvent,
  Breadcrumb,
  User,
  Level,
  TransportConfig,
  IngestResponse,
  ErrorResponse,
} from './types';

// Export components (for advanced usage)
export { BreadcrumbManager } from './breadcrumbs';
export { Scope } from './scope';
export { Transport } from './transport';
export { ErrorSerializer } from './serializer';
export { NodeIntegration } from './integrations/node';

// Export utilities
export { extractStackTrace, parseStackFrames, parseEnhancedFrames } from './utils/stack-trace';
export type { StackFrame, EnhancedStackFrame } from './utils/stack-trace';
export { detectEnvironment, detectServerName, detectRelease } from './utils/environment';
