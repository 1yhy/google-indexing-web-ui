import { t } from "@/i18n";

/**
 * Creates an array of chunks from the given array with a specified size.
 * @param arr The array to be chunked.
 * @param size The size of each chunk.
 * @returns An array of chunks.
 */
const createChunks = <T>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * batch process elements in array
 * @param processor function to process single element
 * @param items array of elements to process
 * @param batchSize number of elements to process in each batch (default is 50)
 * @param onBatchComplete callback function when each batch is processed (optional)
 */
export async function batch<T>(
  processor: (item: T) => Promise<void>,
  items: T[],
  batchSize: number = 50,
  onBatchComplete?: (batchIndex: number, batchCount: number) => void,
) {
  const chunks = createChunks(items, batchSize);

  for (let i = 0; i < chunks.length; i++) {
    await Promise.all(chunks[i].map(processor));
    if (onBatchComplete) {
      onBatchComplete(i, chunks.length);
    }
  }
}

/**
 * Fetches a resource from a URL with retry logic.
 * @param url The URL of the resource to fetch.
 * @param options The options for the fetch request.
 * @param retries The number of retry attempts (default is 5).
 * @returns A Promise resolving to the fetched response.
 * @throws Error when retries are exhausted or server error occurs.
 */
export async function fetchRetry(url: string, options: RequestInit, retries: number = 5) {
  try {
    const response = await fetch(url, options);
    if (response.status >= 500) {
      const body = await response.text();
      throw new Error(`${t("logs.errors.indexStatusFailed")} ${response.status}\n${body}`);
    }
    return response;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    return fetchRetry(url, options, retries - 1);
  }
}
