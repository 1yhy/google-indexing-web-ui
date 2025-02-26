import { Status } from "@/shared";
import picocolors from "picocolors";
import { t } from "@/i18n";

/**
 * 获取状态对应的 emoji
 */
export function getStatusEmoji(status: Status): string {
  switch (status) {
    case Status.SubmittedAndIndexed:
      return "✅";
    case Status.DuplicateWithoutUserSelectedCanonical:
      return "🔄";
    case Status.CrawledCurrentlyNotIndexed:
      return "⏳";
    case Status.DiscoveredCurrentlyNotIndexed:
      return "🔍";
    case Status.PageWithRedirect:
      return "↪️";
    case Status.URLIsUnknownToGoogle:
      return "❓";
    case Status.RateLimited:
      return "⚠️";
    case Status.Forbidden:
      return "🚫";
    case Status.Error:
      return "❌";
    default:
      return "❔";
  }
}

/**
 * 获取状态对应的颜色
 */
export function getStatusColor(status: Status): (text: string) => string {
  switch (status) {
    case Status.SubmittedAndIndexed:
      return picocolors.green;
    case Status.DuplicateWithoutUserSelectedCanonical:
    case Status.PageWithRedirect:
      return picocolors.blue;
    case Status.CrawledCurrentlyNotIndexed:
    case Status.DiscoveredCurrentlyNotIndexed:
    case Status.URLIsUnknownToGoogle:
      return picocolors.yellow;
    case Status.RateLimited:
    case Status.Forbidden:
    case Status.Error:
    case Status.Failed:
      return picocolors.red;
    default:
      return picocolors.gray;
  }
}

/**
 * 获取状态对应的描述
 */
export function getStatusDescription(status: Status): string {
  switch (status) {
    case Status.SubmittedAndIndexed:
      return t("logs.status.indexed");
    case Status.DuplicateWithoutUserSelectedCanonical:
      return t("status.duplicateContent");
    case Status.CrawledCurrentlyNotIndexed:
      return t("logs.status.crawled");
    case Status.DiscoveredCurrentlyNotIndexed:
      return t("status.crawledNotIndexed");
    case Status.PageWithRedirect:
      return t("status.pageWithRedirect");
    case Status.URLIsUnknownToGoogle:
      return t("status.unknownPage");
    case Status.RateLimited:
      return t("status.rateLimited");
    case Status.Forbidden:
      return t("status.forbidden");
    case Status.Error:
      return t("status.error");
    case Status.Failed:
      return t("status.failed");
    case Status.Pending:
      return t("status.pending");
    default:
      return t("status.unknown");
  }
}
