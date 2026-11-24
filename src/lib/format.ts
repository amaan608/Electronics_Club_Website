export function eventDate(value: Date | null | undefined) {
  return value
    ? value.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"
    : "Date to be announced";
}
