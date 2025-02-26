/**
 * 日期时间格式化工具类
 */
export class DateTimeFormatter {
  /**
   * 格式化日期时间为标准格式：YYYY-MM-DD HH:mm:ss
   * @param date 日期字符串或Date对象
   * @returns 格式化后的日期时间字符串
   */
  static format(date: string | Date): string {
    const d = date instanceof Date ? date : new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 格式化日期为标准格式：YYYY-MM-DD
   * @param date 日期字符串或Date对象
   * @returns 格式化后的日期字符串
   */
  static formatDate(date: string | Date): string {
    const d = date instanceof Date ? date : new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化时间为标准格式：HH:mm:ss
   * @param date 日期字符串或Date对象
   * @returns 格式化后的时间字符串
   */
  static formatTime(date: string | Date): string {
    const d = date instanceof Date ? date : new Date(date);

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
}
