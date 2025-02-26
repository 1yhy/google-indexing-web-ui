// 数字格式配置
export const numberFormats = {
  precise: {
    maximumFractionDigits: 2,
  },
  percent: {
    style: "percent",
    maximumFractionDigits: 1,
  },
  compact: {
    notation: "compact",
    compactDisplay: "short",
  },
} as const;

export type NumberFormat = keyof typeof numberFormats;
