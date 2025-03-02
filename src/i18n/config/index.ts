// 支持的语言列表
export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale = "en";

// namespace definition
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

// global configuration
export const timeZone = "Asia/Shanghai";

// date time format configuration
export * from "./datetime";

// number format configuration
export * from "./number";
