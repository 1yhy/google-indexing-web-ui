// 支持的语言列表
export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale = "en";

// 命名空间定义
export const namespaces = {
  app: "app",
  status: "status",
  indexing: "indexing",
  errors: "errors",
  common: "common",
  auth: "auth",
  apps: "apps",
  logs: "logs"
} as const;

export type Namespace = keyof typeof namespaces;

// 全局配置
export const timeZone = "Asia/Shanghai";

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
  }
} as const;

// 数字格式配置
export const numberFormats = {
  precise: {
    maximumFractionDigits: 2,
  },
  percent: {
    style: "percent",
    maximumFractionDigits: 1,
  }
} as const;
