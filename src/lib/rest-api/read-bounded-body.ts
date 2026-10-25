/** Returns null on overflow; never buffers more than maxBytes of the body. */
export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string | null> {
  if (!body) return ''
  const reader = body.getReader()
  const bytes = new Uint8Array(maxBytes)
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return new TextDecoder().decode(bytes.subarray(0, size))
      if (value.byteLength > maxBytes - size) {
        // Cancellation must not delay the 413 if the producer stalls cleanup.
        void reader.cancel().catch(() => {})
        return null
      }
      bytes.set(value, size)
      size += value.byteLength
    }
  } finally {
    reader.releaseLock()
  }
}
