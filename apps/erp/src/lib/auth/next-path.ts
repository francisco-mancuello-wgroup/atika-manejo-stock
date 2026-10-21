/**
 * Post-login destination from the `?next=` parameter. Only same-origin relative paths are
 * honoured (no scheme, no `//`, no backslashes or control characters); anything else is `/`.
 */
export function safeNextPath(value: string | undefined | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters on purpose
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) return "/";
  return value;
}
