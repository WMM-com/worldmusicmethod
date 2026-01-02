/**
 * Sanitization utilities to prevent PostgREST filter injection attacks.
 * These functions escape special characters that could be used to manipulate
 * Supabase query filters.
 */

/**
 * Sanitizes a search query string for use in ILIKE filters.
 * Escapes PostgREST special characters and wildcards.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  // Escape PostgREST special characters: commas, parentheses, and wildcards
  return query
    .replace(/[%_,()]/g, '\\$&')
    .replace(/^[\s]+|[\s]+$/g, '')
    .slice(0, 100);
}

/**
 * Sanitizes an email address for use in Supabase filters.
 * Removes characters that could break filter syntax.
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  // Remove PostgREST operators that could break filter syntax
  return email.replace(/[,()]/g, '').slice(0, 255);
}

/**
 * Sanitizes a UUID or identifier for use in Supabase filters.
 * Only allows alphanumeric characters and hyphens.
 */
export function sanitizeIdentifier(id: string): string {
  if (!id || typeof id !== 'string') return '';
  // Only allow valid UUID characters
  return id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
}
