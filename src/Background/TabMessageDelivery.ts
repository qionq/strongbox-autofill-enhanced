export interface TabMessageOptions {
  frameId?: number;
}

export type TabMessageSender = (tabId: number, message: Record<string, unknown>, options?: TabMessageOptions) => Promise<unknown>;

const missingReceiverMessage = 'Could not establish connection. Receiving end does not exist';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

export function isMissingTabReceiverError(error: unknown): boolean {
  return getErrorMessage(error).includes(missingReceiverMessage);
}

export async function deliverTabMessage(
  sender: TabMessageSender,
  tabId: number,
  message: Record<string, unknown>,
  frameId?: number
): Promise<boolean> {
  try {
    await sender(tabId, message, frameId === undefined ? undefined : { frameId });
    return true;
  } catch (error) {
    if (isMissingTabReceiverError(error)) return false;
    throw error;
  }
}
