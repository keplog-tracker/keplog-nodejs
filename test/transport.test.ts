import { Transport } from '../src/transport';
import type { ErrorEvent } from '../src/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('Transport', () => {
  let transport: Transport;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    transport = new Transport({
      baseUrl: 'http://localhost:8080',
      ingestKey: 'kep_ingest_test-ingest-key',
      timeout: 5000,
      debug: false,
    });

    mockFetch.mockClear();
  });

  describe('send', () => {
    it('should send an error event successfully', async () => {
      const event: ErrorEvent = {
        message: 'Test error',
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued' }),
      } as Response);

      const result = await transport.send(event);

      expect(result).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:8080/api/ingest/v1/events');
      expect(options?.method).toBe('POST');
      expect(options?.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Ingest-Key': 'kep_ingest_test-ingest-key',
      });
    });

    it('should include event data in request body', async () => {
      const event: ErrorEvent = {
        message: 'Test error',
        level: 'error',
        stack_trace: 'Error at line 1',
        context: { key: 'value' },
        environment: 'production',
        server_name: 'server-01',
        release: 'v1.0.0',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued' }),
      } as Response);

      await transport.send(event);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body).toEqual(event);
    });

    it('should handle 401 Unauthorized', async () => {
      const event: ErrorEvent = {
        message: 'Test',
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 401,
        json: async () => ({ error: 'Invalid Ingest Key' }),
      } as Response);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await transport.send(event);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid Ingest Key')
      );

      consoleSpy.mockRestore();
    });

    it('should handle 400 Bad Request', async () => {
      const event: ErrorEvent = {
        message: 'Test',
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 400,
        json: async () => ({ error: 'Validation error' }),
      } as Response);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await transport.send(event);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Keplog] Validation error:',
        'Validation error'
      );

      consoleSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      const event: ErrorEvent = {
        message: 'Test',
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await transport.send(event);

      expect(result).toBeNull();
    });

    it('should truncate message exceeding 10KB', async () => {
      const longMessage = 'a'.repeat(11000);
      const event: ErrorEvent = {
        message: longMessage,
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued' }),
      } as Response);

      await transport.send(event);

      expect(event.message.length).toBeLessThanOrEqual(10015); // 10000 + '...[truncated]'
      expect(event.message).toContain('...[truncated]');
    });

    it('should truncate stack trace exceeding 500KB', async () => {
      const longStack = 'a'.repeat(510000);
      const event: ErrorEvent = {
        message: 'Test',
        level: 'error',
        stack_trace: longStack,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued' }),
      } as Response);

      await transport.send(event);

      expect(event.stack_trace!.length).toBeLessThanOrEqual(500016); // 500000 + '\n...[truncated]'
      expect(event.stack_trace).toContain('...[truncated]');
    });

    it('should replace context exceeding 256KB', async () => {
      const largeContext = {
        data: 'a'.repeat(260000),
      };
      const event: ErrorEvent = {
        message: 'Test',
        level: 'error',
        context: largeContext,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued' }),
      } as Response);

      await transport.send(event);

      expect(event.context).toHaveProperty('_error');
      expect(event.context?._error).toContain('too large');
    });

    it('should reject invalid level', async () => {
      const event = {
        message: 'Test',
        level: 'invalid' as any,
        timestamp: new Date().toISOString(),
      } as ErrorEvent;

      // The transport catches the error and returns null
      const result = await transport.send(event);
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject empty message', async () => {
      const event: ErrorEvent = {
        message: '',
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      // The transport catches the error and returns null
      const result = await transport.send(event);
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should log in debug mode', async () => {
      const debugTransport = new Transport({
        baseUrl: 'http://localhost:8080',
        ingestKey: 'test-key',
        timeout: 5000,
        debug: true,
      });

      const event: ErrorEvent = {
        message: 'Test',
        level: 'error',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued' }),
      } as Response);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await debugTransport.send(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Keplog] Sending event (timeout: 5000ms):',
        expect.objectContaining({
          message: 'Test',
          level: 'error',
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
