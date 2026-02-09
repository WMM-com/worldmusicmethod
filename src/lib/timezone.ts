import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Get the user's current IANA timezone string (e.g. "Europe/London", "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a UTC date string for display in the user's local timezone.
 * @param utcDate - ISO date string or Date object (UTC)
 * @param formatStr - date-fns format string (default: 'EEE d MMM, h:mma')
 * @param timezone - IANA timezone (defaults to user's local)
 */
export function formatLocalTime(
  utcDate: string | Date,
  formatStr: string = 'EEE d MMM, h:mma',
  timezone?: string
): string {
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(utcDate, tz, formatStr);
}

/**
 * Format a time range in the user's local timezone.
 * Returns something like "Mon 3 Mar, 2:00pm – 3:00pm (GMT)"
 */
export function formatLocalTimeRange(
  startUtc: string | Date,
  endUtc: string | Date,
  timezone?: string
): string {
  const tz = timezone || getUserTimezone();
  const startStr = formatInTimeZone(startUtc, tz, 'EEE d MMM, h:mma');
  const endStr = formatInTimeZone(endUtc, tz, 'h:mma');
  const tzAbbr = formatInTimeZone(startUtc, tz, 'zzz');
  return `${startStr} – ${endStr} (${tzAbbr})`;
}

/**
 * Get a short timezone abbreviation for the user's timezone.
 * e.g. "GMT", "EST", "PST"
 */
export function getTimezoneAbbr(timezone?: string): string {
  const tz = timezone || getUserTimezone();
  const now = new Date();
  return formatInTimeZone(now, tz, 'zzz');
}

/**
 * Convert a local time in a specific timezone to UTC.
 * Useful when converting tutor availability (stored in their local timezone) to UTC.
 * @param localDate - Date object representing local time
 * @param fromTimezone - The timezone the date is in
 * @returns Date in UTC
 */
export function localToUtc(localDate: Date, fromTimezone: string): Date {
  return fromZonedTime(localDate, fromTimezone);
}

/**
 * Convert a UTC date to a specific timezone.
 * @param utcDate - Date in UTC
 * @param toTimezone - Target timezone
 * @returns Date adjusted to target timezone
 */
export function utcToLocal(utcDate: Date | string, toTimezone: string): Date {
  return toZonedTime(utcDate, toTimezone);
}
