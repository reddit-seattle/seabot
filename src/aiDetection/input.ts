import { AiCheckError, Fetch, LIMITS } from "./types";

const words = new Intl.Segmenter("en", { granularity: "word" });

export function wordCount(text: string): number {
  let count = 0;
  for (const segment of words.segment(text)) if (segment.isWordLike) count++;
  return count;
}

export function validateText(text: string, minimumWords: number): void {
  if (!text.trim()) throw new AiCheckError("empty", "Please provide some text to analyze.");
  if (Buffer.byteLength(text, "utf8") > LIMITS.bytes) {
    throw new AiCheckError("size", "The text exceeds the 256 KiB limit.");
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) {
    throw new AiCheckError("binary", "Please provide plain text, not binary content.");
  }
  const count = wordCount(text);
  if (count < minimumWords) {
    throw new AiCheckError("short", `This provider requires at least ${minimumWords} words. No scan was submitted.`);
  }
  if (count > LIMITS.words) {
    throw new AiCheckError("long", "Please submit at most 5,000 words. No text has been truncated or submitted.");
  }
}

/** Enforce actual bytes even when Content-Length/attachment metadata is absent or wrong. */
export async function readLimited(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new AiCheckError("response", "The service returned an empty response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new AiCheckError("size", "The response exceeded its size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function readTextAttachment(
  attachment: { name: string | null; size: number; url: string },
  signal: AbortSignal,
  fetcher: Fetch = globalThis.fetch,
): Promise<string> {
  if (!attachment.name?.toLowerCase().endsWith(".txt") || attachment.size > LIMITS.bytes) {
    throw new AiCheckError("file", "Attach one UTF-8 .txt file no larger than 256 KiB.");
  }
  const url = new URL(attachment.url);
  if (url.protocol !== "https:" || !["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)) {
    throw new AiCheckError("file", "Only the attachment supplied by Discord can be read.");
  }
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
  try {
    const response = await fetcher(url, { signal: timeout, redirect: "error" });
    if (!response.ok) throw new AiCheckError("file", "The attachment could not be downloaded. Attach it again.");
    return new TextDecoder("utf-8", { fatal: true }).decode(await readLimited(response, LIMITS.bytes));
  } catch (error) {
    if (error instanceof AiCheckError) throw error;
    throw new AiCheckError("file", "The attachment could not be read as UTF-8 text. Please check the file and try again.");
  }
}
