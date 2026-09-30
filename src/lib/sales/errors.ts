import { ApiError } from '@/lib/api/client';

export function getSalesErrorMessage(error: unknown, fallback = 'sales') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return `Unable to load ${fallback} right now.`;
}
