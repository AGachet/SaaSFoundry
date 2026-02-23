export function decodeJwtPayload<T extends Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1])) as T
  } catch {
    return null
  }
}
