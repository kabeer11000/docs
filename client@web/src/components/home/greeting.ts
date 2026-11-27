export const partOfDay = (hour: number) =>
  hour >= 5 && hour < 12
    ? "morning"
    : hour >= 12 && hour < 18
      ? "afternoon"
      : "evening";

/** First word of the display name, or the email's local part. */
export const firstName = (
  user:
    | { displayName?: string | null; email?: string | null }
    | null
    | undefined,
) =>
  (user?.displayName?.trim() || user?.email?.split("@")[0] || "").split(
    /\s+/,
  )[0];
