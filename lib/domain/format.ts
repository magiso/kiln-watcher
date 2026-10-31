/** Short relative age for the page: "just now", "5 min ago", "3 h ago", "2 days ago". */
export function formatAge(ageSeconds: number): string {
  if (ageSeconds < 60) return "just now";
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

/** How late a reading can be before it shows as overdue rather than due. */
export const DUE_GRACE_SECONDS = 15 * 60;

/** When the next reading is expected: "in 5 min", "in 3 h", "due now", or "overdue" once well past it. */
export function formatNextReading(inSeconds: number): string {
  if (inSeconds < -DUE_GRACE_SECONDS) return "overdue";
  if (inSeconds < 60) return "due now";
  const minutes = Math.floor(inSeconds / 60);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `in ${hours} h`;
  return `in ${Math.floor(hours / 24)} days`;
}
