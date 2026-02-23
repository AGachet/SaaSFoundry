type ParamValue = string | number | boolean | string[] | number[] | undefined

export function cleanParams(params: Record<string, ParamValue>): Record<string, string | number | boolean | string[] | number[]> {
  const result: Record<string, string | number | boolean | string[] | number[]> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === 'number' && (key === 'page' || key === 'limit') && value <= 0) continue
    result[key] = value
  }

  return result
}
