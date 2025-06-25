/**
 * Formatting utilities
 */

/**
 * Format a date to a localized string
 * @param date - The date to format
 * @param locale - The locale to use (defaults to browser locale)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale?: string): string {
  if (!date) return ''

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj.toLocaleDateString(locale || undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format a currency value
 * @param amount - The amount to format
 * @param currency - The currency code (defaults to EUR)
 * @param locale - The locale to use (defaults to browser locale)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'EUR', locale?: string): string {
  return new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Generate initials from a name
 * @param firstname - First name
 * @param lastname - Last name
 * @returns Initials (1-2 characters)
 */
export function getInitials(firstname?: string | null, lastname?: string | null): string {
  if (firstname && lastname) {
    return `${firstname[0]}${lastname[0]}`.toUpperCase()
  }
  if (firstname) {
    return firstname[0].toUpperCase()
  }
  if (lastname) {
    return lastname[0].toUpperCase()
  }
  return ''
}

/**
 * Truncate a string if it exceeds a maximum length
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str || ''
  return `${str.slice(0, maxLength)}...`
}
