/** A deterministic platform display zone avoids server/container/browser TZ mismatch. */
/** @param {string} value */
export function formatTimestamp(value) {
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}
