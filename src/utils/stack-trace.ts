/**
 * Extract stack trace from an Error object
 * @param error Error object or any value
 * @returns Formatted stack trace string or undefined
 */
export function extractStackTrace(error: Error | any): string | undefined {
  if (!error) {
    return undefined;
  }

  // If it's an Error object with a stack, use it
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  // If it has a stack property (duck typing)
  if (typeof error === 'object' && error.stack) {
    return String(error.stack);
  }

  // Try to create a stack trace
  try {
    const err = new Error();
    return err.stack;
  } catch {
    return undefined;
  }
}

/**
 * Parse V8 stack trace into structured frames
 * This is optional and can be used for more advanced processing
 */
export interface StackFrame {
  file: string;
  line?: number;
  column?: number;
  function?: string;
}

/**
 * Enhanced stack frame with code snippets and vendor detection
 */
export interface EnhancedStackFrame {
  file: string;
  line: number;
  column?: number;
  function: string | null;
  class: string | null;
  type: string | null;
  code_snippet?: Record<number, string>;
  is_vendor: boolean;
  is_application: boolean;
}

/**
 * Parse stack trace string into structured frames
 * Handles V8 stack trace format (Node.js, Chrome)
 *
 * @param stack Stack trace string
 * @returns Array of parsed stack frames
 */
export function parseStackFrames(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stack.split('\n');

  for (const line of lines) {
    // Skip the error message line
    if (!line.trim().startsWith('at ')) {
      continue;
    }

    // V8 format: "at functionName (file:line:column)"
    // or: "at file:line:column"
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);

    if (match) {
      const [, functionName, file, lineNum, colNum] = match;
      frames.push({
        function: functionName?.trim(),
        file: file.trim(),
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
      });
    }
  }

  return frames;
}

/**
 * Extract code snippet from a file around the error line
 * @param file File path
 * @param line Line number where the error occurred
 * @param contextLines Number of lines to include before and after (default: 3)
 * @returns Object with line numbers as keys and code lines as values
 */
function extractCodeSnippet(
  file: string,
  line: number,
  contextLines: number = 3
): Record<number, string> {
  try {
    const fs = require('fs');

    // Check if file exists and is readable
    if (!fs.existsSync(file)) {
      return {};
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    const startLine = Math.max(0, line - contextLines - 1);
    const endLine = Math.min(lines.length, line + contextLines);

    const snippet: Record<number, string> = {};
    for (let i = startLine; i < endLine; i++) {
      const lineNumber = i + 1;
      snippet[lineNumber] = lines[i];
    }

    return snippet;
  } catch (error) {
    // Never fail - return empty snippet on error
    return {};
  }
}

/**
 * Check if a file path is from a vendor/dependency
 * @param file File path
 * @returns true if file is from node_modules, false otherwise
 */
function isVendorFrame(file: string | null | undefined): boolean {
  if (!file) {
    return false;
  }

  // Normalize path to use forward slashes
  const normalizedPath = file.replace(/\\/g, '/');

  // Check for node_modules directory
  return normalizedPath.includes('/node_modules/');
}

/**
 * Parse class and method information from JavaScript function name
 * Handles various formats:
 * - "ClassName.methodName" -> class: ClassName, function: methodName, type: "->"
 * - "ClassName.staticMethod" -> class: ClassName, function: staticMethod, type: "::"
 * - "functionName" -> class: null, function: functionName, type: null
 * - "new ClassName" -> class: ClassName, function: "{constructor}", type: "->"
 *
 * @param functionName Raw function name from stack trace
 * @returns Parsed class, function, and type information
 */
function parseClassAndMethod(functionName: string | undefined): {
  class: string | null;
  function: string | null;
  type: string | null;
} {
  if (!functionName) {
    return { class: null, function: null, type: null };
  }

  // Handle constructor calls: "new ClassName"
  const constructorMatch = functionName.match(/^new\s+(\w+)$/);
  if (constructorMatch) {
    return {
      class: constructorMatch[1],
      function: '{constructor}',
      type: '->',
    };
  }

  // Handle class methods: "ClassName.methodName" or "Object.method"
  const classMethodMatch = functionName.match(/^(.+?)\.([^.]+)$/);
  if (classMethodMatch) {
    const [, className, methodName] = classMethodMatch;

    // Determine if it's a static method or instance method
    // In JavaScript, we can't reliably detect this from stack traces alone
    // We'll default to instance method (->), but this could be enhanced
    // with additional context or naming conventions
    return {
      class: className,
      function: methodName,
      type: '->',
    };
  }

  // Regular function or anonymous function
  return {
    class: null,
    function: functionName || '{closure}',
    type: null,
  };
}

/**
 * Parse Error object into enhanced stack frames with code snippets
 * @param error Error object
 * @param contextLines Number of lines to include before and after (default: 3)
 * @returns Array of enhanced stack frames
 */
export function parseEnhancedFrames(
  error: Error,
  contextLines: number = 3
): EnhancedStackFrame[] {
  if (!error.stack) {
    return [];
  }

  const frames: EnhancedStackFrame[] = [];
  const basicFrames = parseStackFrames(error.stack);

  for (const frame of basicFrames) {
    // Parse class and method information
    const { class: className, function: functionName, type } = parseClassAndMethod(frame.function);

    const enhancedFrame: EnhancedStackFrame = {
      file: frame.file,
      line: frame.line ?? 0,
      column: frame.column,
      function: functionName,
      class: className,
      type: type,
      is_vendor: isVendorFrame(frame.file),
      is_application: !isVendorFrame(frame.file),
    };

    // Add code snippet if file exists and line number is available
    if (frame.file && frame.line) {
      const snippet = extractCodeSnippet(frame.file, frame.line, contextLines);
      if (Object.keys(snippet).length > 0) {
        enhancedFrame.code_snippet = snippet;
      }
    }

    frames.push(enhancedFrame);
  }

  return frames;
}
