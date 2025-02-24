import { Status } from "@/shared";
import picocolors from "picocolors";

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
 * 获取状态的颜色处理函数
 */
export function getStatusColor(status: Status) {
  switch (status) {
    case Status.SubmittedAndIndexed:
      return picocolors.green;
    case Status.Error:
    case Status.Forbidden:
      return picocolors.red;
    case Status.RateLimited:
      return picocolors.yellow;
    default:
      return picocolors.blue;
  }
}

/**
 * 获取状态的用户友好描述
 */
export function getStatusDescription(status: Status): string {
  switch (status) {
    case Status.SubmittedAndIndexed:
      return "已成功索引";
    case Status.DuplicateWithoutUserSelectedCanonical:
      return "重复内容";
    case Status.CrawledCurrentlyNotIndexed:
      return "已爬取未索引";
    case Status.DiscoveredCurrentlyNotIndexed:
      return "已发现未索引";
    case Status.PageWithRedirect:
      return "页面重定向";
    case Status.URLIsUnknownToGoogle:
      return "未知页面";
    case Status.RateLimited:
      return "请求频率限制";
    case Status.Forbidden:
      return "访问被拒绝";
    case Status.Error:
      return "处理错误";
    default:
      return "未知状态";
  }
}
