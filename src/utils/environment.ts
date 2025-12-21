import * as os from 'os';

/**
 * Detect the current environment from NODE_ENV
 * @returns Environment name, defaults to 'production'
 */
export function detectEnvironment(): string {
  return process.env.NODE_ENV || 'production';
}

/**
 * Detect the server/instance name from hostname
 * @returns Hostname or 'unknown' if unavailable
 */
export function detectServerName(): string {
  try {
    return os.hostname();
  } catch {
    return 'unknown';
  }
}

/**
 * Attempt to detect release version from package.json
 * Note: This works only if the SDK is required from a project with package.json
 * @returns Version string or undefined
 */
export function detectRelease(): string | undefined {
  try {
    // Try to find the consuming app's package.json
    // This is a best-effort attempt and may not always work
    const mainModule = require.main;
    if (mainModule && mainModule.filename) {
      const packageJsonPath = require.resolve(`${process.cwd()}/package.json`);
      const packageJson = require(packageJsonPath);
      return packageJson.version;
    }
  } catch {
    // Silently fail - release is optional
  }
  return undefined;
}
