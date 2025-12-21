import { extractStackTrace, parseStackFrames } from '../src/utils/stack-trace';
import { detectEnvironment, detectServerName } from '../src/utils/environment';

describe('Stack Trace Utils', () => {
  describe('extractStackTrace', () => {
    it('should extract stack trace from Error object', () => {
      const error = new Error('Test error');
      const stack = extractStackTrace(error);

      expect(stack).toBeDefined();
      expect(stack).toContain('Error: Test error');
      expect(stack).toContain('at ');
    });

    it('should handle Error-like objects with stack property', () => {
      const errorLike = { stack: 'Error: Custom\n    at test' };
      const stack = extractStackTrace(errorLike);

      expect(stack).toBe('Error: Custom\n    at test');
    });

    it('should handle null or undefined', () => {
      expect(extractStackTrace(null)).toBeUndefined();
      expect(extractStackTrace(undefined)).toBeUndefined();
    });

    it('should create a stack trace for non-Error values', () => {
      const stack = extractStackTrace({});
      expect(stack).toBeDefined();
    });
  });

  describe('parseStackFrames', () => {
    it('should parse V8 stack trace format', () => {
      const stack = `Error: Test error
    at functionName (/path/to/file.js:10:5)
    at anotherFunction (/path/to/another.js:20:10)`;

      const frames = parseStackFrames(stack);

      expect(frames).toHaveLength(2);
      expect(frames[0]).toEqual({
        function: 'functionName',
        file: '/path/to/file.js',
        line: 10,
        column: 5,
      });
      expect(frames[1]).toEqual({
        function: 'anotherFunction',
        file: '/path/to/another.js',
        line: 20,
        column: 10,
      });
    });

    it('should handle anonymous functions', () => {
      const stack = `Error: Test
    at /path/to/file.js:10:5`;

      const frames = parseStackFrames(stack);

      expect(frames).toHaveLength(1);
      expect(frames[0].function).toBeUndefined();
      expect(frames[0].file).toBe('/path/to/file.js');
    });

    it('should skip non-stack lines', () => {
      const stack = `Error: Test error
Some other text
    at test (/file.js:1:1)`;

      const frames = parseStackFrames(stack);

      expect(frames).toHaveLength(1);
    });
  });
});

describe('Environment Utils', () => {
  describe('detectEnvironment', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return NODE_ENV when set', () => {
      process.env.NODE_ENV = 'development';
      expect(detectEnvironment()).toBe('development');

      process.env.NODE_ENV = 'production';
      expect(detectEnvironment()).toBe('production');
    });

    it('should default to production when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(detectEnvironment()).toBe('production');
    });
  });

  describe('detectServerName', () => {
    it('should return a hostname', () => {
      const serverName = detectServerName();
      expect(serverName).toBeDefined();
      expect(typeof serverName).toBe('string');
      expect(serverName.length).toBeGreaterThan(0);
    });

    it('should not return "unknown" in normal conditions', () => {
      const serverName = detectServerName();
      expect(serverName).not.toBe('unknown');
    });
  });
});
