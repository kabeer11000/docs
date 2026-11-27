/** Emails compare case-insensitively, and a missing email never matches anything. */
export const sameEmail = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
