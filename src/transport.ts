import type { ErrorEvent, TransportConfig, IngestResponse, ErrorResponse } from './types';

/**
 * Transport layer for sending error events to the Keplog API
 * Handles HTTP communication, authentication, and error handling
 */
export class Transport {
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
  }

  /**
   * Send an error event to the Keplog API
   * @param event Error event to send
   * @returns Event ID if successful, null if failed
   *
   * This method fails silently to prevent SDK errors from affecting your app.
   * Network errors, timeouts, and server issues are logged but don't throw.
   */
  async send(event: ErrorEvent): Promise<string | null> {
    try {
      // Validate event before sending
      this.validateEvent(event);

      // Prepare the request
      const url = `${this.config.baseUrl}/api/ingest/v1/events`;
      const payload = JSON.stringify(event);

      if (this.config.debug) {
        console.log(`[Keplog] Sending event (timeout: ${this.config.timeout}ms):`, event);
      }

      // Make HTTP request
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ingest-Key': this.config.ingestKey,
        },
        body: payload,
        timeout: this.config.timeout,
      });

      // Handle response
      if (response.status === 202) {
        const data = await response.json() as IngestResponse;
        if (this.config.debug) {
          console.log('[Keplog] Event queued successfully:', data);
        }
        // Generate a simple event ID for tracking
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else if (response.status === 401) {
        console.error('[Keplog] Invalid Ingest Key - please check your configuration');
        return null;
      } else if (response.status === 400) {
        const errorData = await response.json() as ErrorResponse;
        console.error('[Keplog] Validation error:', errorData.error);
        return null;
      } else {
        console.error(`[Keplog] Unexpected response status: ${response.status}`);
        return null;
      }
    } catch (error) {
      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(
          `[Keplog] Timeout: Request to Keplog API exceeded ${this.config.timeout}ms. ` +
          'Check your network connection and server status.'
        );
        if (this.config.debug) {
          console.error('[Keplog] Timeout details:', error);
        }
        return null;
      }

      // Silent failure for other errors - SDK errors should never crash the app
      if (this.config.debug) {
        console.error('[Keplog] Failed to send event:', error);
      }
      return null;
    }
  }

  /**
   * Validate event fields before sending
   * Truncates fields that exceed size limits
   */
  private validateEvent(event: ErrorEvent): void {
    // Message validation (max 10KB = 10,000 bytes)
    if (!event.message || event.message.length === 0) {
      throw new Error('Event message is required');
    }
    if (event.message.length > 10000) {
      event.message = event.message.substring(0, 10000) + '...[truncated]';
      if (this.config.debug) {
        console.warn('[Keplog] Message truncated to 10KB');
      }
    }

    // Stack trace validation (max 500KB = 500,000 bytes)
    if (event.stack_trace && event.stack_trace.length > 500000) {
      event.stack_trace = event.stack_trace.substring(0, 500000) + '\n...[truncated]';
      if (this.config.debug) {
        console.warn('[Keplog] Stack trace truncated to 500KB');
      }
    }

    // Context validation (max 256KB = 256,000 bytes when serialized)
    if (event.context) {
      const contextSize = JSON.stringify(event.context).length;
      if (contextSize > 256000) {
        event.context = {
          _error: 'Context too large and was truncated',
          _original_size: contextSize,
          _max_size: 256000,
        };
        if (this.config.debug) {
          console.warn('[Keplog] Context truncated due to size limit (256KB)');
        }
      }
    }

    // Level validation
    const validLevels = ['critical', 'error', 'warning', 'info', 'debug'];
    if (!validLevels.includes(event.level)) {
      throw new Error(`Invalid level: ${event.level}. Must be one of: ${validLevels.join(', ')}`);
    }
  }

  /**
   * Make HTTP request using native fetch API
   * Falls back to https module for Node.js < 18
   */
  private async makeRequest(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
      timeout: number;
    }
  ): Promise<Response> {
    // Use native fetch if available (Node.js 18+)
    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      try {
        const response = await fetch(url, {
          method: options.method,
          headers: options.headers,
          body: options.body,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    // Fallback to https module for older Node.js versions
    return this.makeRequestWithHttps(url, options);
  }

  /**
   * Fallback HTTP request implementation using https module
   * For Node.js versions < 18 that don't have native fetch
   */
  private makeRequestWithHttps(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
      timeout: number;
    }
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const urlObj = new URL(url);

      const req = https.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: options.method,
          headers: options.headers,
          timeout: options.timeout,
        },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            // Create a Response-like object
            const response = {
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              json: async () => JSON.parse(data),
              text: async () => data,
            } as Response;
            resolve(response);
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(options.body);
      req.end();
    });
  }
}
