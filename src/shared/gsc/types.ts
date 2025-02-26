/**
 * 索引结果类型
 */
export type IndexResult = {
  url: string;
  status: Status;
  message?: string;
  timestamp?: Date;
};

/**
 * 页面状态枚举
 */
export enum Status {
  // 已索引状态
  SubmittedAndIndexed = "URL_IS_ON_GOOGLE",

  // 重复内容
  DuplicateWithoutUserSelectedCanonical = "DUPLICATE_WITHOUT_USER_SELECTED_CANONICAL",

  // 已爬取但未索引
  CrawledCurrentlyNotIndexed = "CRAWLED_CURRENTLY_NOT_INDEXED",

  // 已发现但未爬取
  DiscoveredCurrentlyNotIndexed = "DISCOVERED_CURRENTLY_NOT_INDEXED",

  // 重定向页面
  PageWithRedirect = "PAGE_WITH_REDIRECT",

  // 未知页面
  URLIsUnknownToGoogle = "URL_IS_UNKNOWN_TO_GOOGLE",

  // 错误状态
  RateLimited = "RATE_LIMITED",
  Forbidden = "FORBIDDEN",
  Error = "ERROR",

  // 处理状态
  Success = "SUCCESS",
  Failed = "FAILED",
  Pending = "PENDING",
  Unknown = "UNKNOWN"
}
