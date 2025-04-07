/**
 * Extracts a token from a URL parameter and cleans the URL by removing this parameter
 */
export const extractTokenFromUrl = (paramName: string): string | null => {
  const searchParams = new URLSearchParams(window.location.search)
  const token = searchParams.get(paramName)

  if (token) {
    // Clean the URL by removing the token
    const newUrl = window.location.pathname
    window.history.replaceState({}, document.title, newUrl)
  }

  return token
}
