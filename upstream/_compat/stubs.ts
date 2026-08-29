export function logError(error: unknown): void {
  try {
    if (error instanceof Error) {
      console.error(`[picc-permission-modes] ${error.message}`);
    } else {
      console.error("[picc-permission-modes]", error);
    }
  } catch {
  }
}
export function jsonStringify(value: unknown): string {
  return JSON.stringify(value);
}
export function feature(_name: string): boolean {
  return false;
}
export function logEvent(
  _name: string,
  _metadata?: Record<string, unknown>,
): void {
}
export type CommandPrefixResult = {
  commandPrefix: string
  reasoning?: string
}
export type CommandSubcommandPrefixResult = CommandPrefixResult & {
  hasUserSufficientPermissions?: boolean
}
