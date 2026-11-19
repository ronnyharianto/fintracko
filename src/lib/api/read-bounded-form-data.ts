/**
 * Bounded readers for untrusted request bodies.
 *
 * Both JSON and multipart bodies arrive from the network, so neither may be
 * buffered without a hard byte cap. {@link readBoundedBody} rejects early on a
 * `Content-Length` above the cap and enforces the same cap while streaming,
 * because that header can be absent or lie. {@link readBoundedFormData} builds
 * on it for the multipart upload path.
 */

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the allowed size.");
    this.name = "RequestBodyTooLargeError";
  }
}

/**
 * Reads the whole request body, aborting as soon as it exceeds `maxBytes`.
 * Never buffers more than `maxBytes` regardless of what `Content-Length` says.
 */
export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new RequestBodyTooLargeError();
    }
  }

  if (!request.body) {
    throw new TypeError("Request body is required.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

export async function readBoundedFormData(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  const body = await readBoundedBody(request, maxBytes);

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new Response(new Blob([body]), { headers }).formData();
}
