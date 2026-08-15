export type ExtensionRuntimeIdReader = () => unknown;

const invalidatedContextMessage = 'Extension context invalidated';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  return getErrorMessage(error).includes(invalidatedContextMessage);
}

export function hasActiveExtensionContext(readRuntimeId: ExtensionRuntimeIdReader): boolean {
  try {
    const runtimeId = readRuntimeId();
    return typeof runtimeId === 'string' && runtimeId.length > 0;
  } catch (_error) {
    return false;
  }
}

export async function runWithExtensionContext<T>(
  readRuntimeId: ExtensionRuntimeIdReader,
  operation: () => Promise<T>,
  onInvalidated: () => void,
  fallback: T
): Promise<T> {
  if (!hasActiveExtensionContext(readRuntimeId)) {
    onInvalidated();
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    if (isExtensionContextInvalidatedError(error) || !hasActiveExtensionContext(readRuntimeId)) {
      onInvalidated();
      return fallback;
    }

    throw error;
  }
}
