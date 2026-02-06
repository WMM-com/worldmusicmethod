/**
 * Generates a clean profile URL for a user.
 * Prefers /${username} over /profile/${userId}.
 * Falls back to /profile/${userId} if no username is available (the route will redirect).
 */
export function getProfileUrl(userId: string, username?: string | null): string {
  if (username) return `/${username}`;
  return `/profile/${userId}`;
}
