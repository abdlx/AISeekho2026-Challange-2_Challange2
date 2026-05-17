/**
 * Utility to get environment variables that works both on server and client.
 * For Cloud Run, NEXT_PUBLIC_ variables are injected at runtime via layout.tsx
 */
export const getEnv = (key: string): string => {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { _env_?: Record<string, string> };
    if (win._env_) {
      return win._env_[key] || '';
    }
  }
  return process.env[key] || '';
};
