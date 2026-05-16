/**
 * Utility to get environment variables that works both on server and client.
 * For Cloud Run, NEXT_PUBLIC_ variables are injected at runtime via layout.tsx
 */
export const getEnv = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any)._env_) {
    return (window as any)._env_[key] || '';
  }
  return process.env[key] || '';
};
