/**
 * date time formatter class
 */
export class DateTimeFormatter {
  /**
   * format date time to standard format: YYYY-MM-DD HH:mm:ss
   * @param date date string or Date object
   * @returns formatted date time string
   */
  static format(date: string | Date): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    }).replace(/\//g, '-');
  }

  /**
   * format date to standard format: YYYY-MM-DD
   * @param date date string or Date object
   * @returns formatted date string
   */
  static formatDate(date: string | Date): string {
    const d = date instanceof Date ? date : new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * format time to standard format: HH:mm:ss
   * @param date date string or Date object
   * @returns formatted time string
   */
  static formatTime(date: string | Date): string {
    const d = date instanceof Date ? date : new Date(date);

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
}
