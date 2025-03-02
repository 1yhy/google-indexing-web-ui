/**
 * index result type
 */
export type IndexResult = {
  url: string;
  status: Status;
  message?: string;
  timestamp?: Date;
};

/**
 * page status enum
 */
export enum Status {
  SubmittedAndIndexed = "Submitted and indexed",
  DuplicateWithoutUserSelectedCanonical = "Duplicate without user-selected canonical",
  CrawledCurrentlyNotIndexed = "Crawled - currently not indexed",
  DiscoveredCurrentlyNotIndexed = "Discovered - currently not indexed",
  PageWithRedirect = "Page with redirect",
  URLIsUnknownToGoogle = "URL is unknown to Google",
  RateLimited = "RateLimited",
  Forbidden = "Forbidden",
  Error = "Error",
  Submitted = "Submitted",
}
