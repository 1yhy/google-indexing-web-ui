// date time format configuration
export const dateTimeFormats = {
  full: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
    formatMatcher: "basic",
  },
  date: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    formatMatcher: "basic",
  },
  time: {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
    formatMatcher: "basic",
  }
} as const;

export type DateTimeFormat = keyof typeof dateTimeFormats;
