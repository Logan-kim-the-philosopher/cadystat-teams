export class RequestBodyError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** Count actual streamed bytes; Content-Length alone is not a request limit. */
export async function readLimitedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestBodyError('Content-Type은 application/json이어야 합니다.', 415);
  }
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestBodyError('요청 본문이 너무 큽니다.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError('JSON 본문이 필요합니다.', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError('요청 본문이 너무 큽니다.', 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError('JSON 본문이 올바르지 않습니다.', 400);
  } finally { reader.releaseLock(); }
}
