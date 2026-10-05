export async function parseBoundedJson(
  response,
  { maxBytes, label = "Respuesta externa" },
) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new Error("maxBytes debe ser un entero positivo.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(label + " no devolvió JSON.");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const advertisedLength = Number(contentLength);
    if (!Number.isFinite(advertisedLength) || advertisedLength < 0) {
      throw new Error(label + " devolvió Content-Length inválido.");
    }
    if (advertisedLength > maxBytes) {
      throw new Error(label + " excede el límite permitido.");
    }
  }

  if (!response.body) {
    throw new Error(label + " no devolvió body.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("response_size_limit_exceeded");
        throw new Error(label + " excede el límite permitido.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(payload));
}
