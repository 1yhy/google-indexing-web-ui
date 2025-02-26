// 日期时间格式配置
export const dateTimeFormats = {
  full: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  },
  date: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
  time: {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  },
  relative: {
    numeric: "auto",
    style: "long",
  }
} as const;

export type DateTimeFormat = keyof typeof dateTimeFormats;
