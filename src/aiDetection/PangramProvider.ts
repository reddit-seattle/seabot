import { setTimeout as sleep } from "node:timers/promises";
import { readLimited, wordCount } from "./input";
import { AiCheckError, AiDetectionProvider, DetectionResult, DetectionSegment, Fetch, LIMITS } from "./types";

const BASE_URL = "https://text.external-api.pangram.com";
const labels: Record<string, DetectionSegment["category"]> = {
  "AI-Generated": "ai", "AI-Assisted": "assisted", "Human Written": "human",
};
const malformed = () => new AiCheckError("response", "Pangram returned an invalid analysis. No replacement scan was submitted.");
const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

/** Verify offsets against window text instead of guessing positions for repeated passages. */
export function normalizePangram(value: unknown, model: string): DetectionResult {
  if (!isObject(value) || value.stage !== "STAGE_SUCCESS" || typeof value.text !== "string" ||
      !value.text.trim() || typeof value.headline !== "string" || typeof value.prediction !== "string" ||
      !Array.isArray(value.windows) || Buffer.byteLength(value.text) > LIMITS.bytes) throw malformed();
  const fractions = [value.fraction_ai, value.fraction_ai_assisted, value.fraction_human];
  if (fractions.some(f => typeof f !== "number" || !Number.isFinite(f) || f < 0 || f > 1) ||
      Math.abs(fractions.reduce((a, b) => a + b, 0) - 1) > 0.001) throw malformed();
  const text: string = value.text;
  const codePoints = Array.from(text);
  const utf16Offsets = [0];
  for (const point of codePoints) utf16Offsets.push(utf16Offsets[utf16Offsets.length - 1] + point.length);
  const windows = value.windows;
  if (windows.some(w => !isObject(w) || typeof w.text !== "string" || typeof w.label !== "string")) throw malformed();
  const verifies = (unit: "codepoint" | "utf16") => windows.every(w => {
    const { start_index: start, end_index: end } = w;
    const length = unit === "codepoint" ? codePoints.length : text.length;
    return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= length &&
      (unit === "codepoint" ? codePoints.slice(start, end).join("") : text.slice(start, end)) === w.text;
  });
  const codepointValid = verifies("codepoint"), utf16Valid = verifies("utf16");
  // Until the provider's offset contract is confirmed, never pick between two
  // matching interpretations that point to different occurrences of repeated text.
  const ambiguous = codepointValid && utf16Valid && windows.some(w =>
    utf16Offsets[w.start_index] !== w.start_index || utf16Offsets[w.end_index] !== w.end_index);
  const unit = ambiguous ? undefined : codepointValid ? "codepoint" : utf16Valid ? "utf16" : undefined;
  return {
    provider: "Pangram", model,
    version: typeof value.version === "string" ? value.version : undefined,
    analyzedText: text, headline: value.headline, explanation: value.prediction,
    textFractions: { ai: fractions[0], assisted: fractions[1], human: fractions[2] },
    segments: windows.map(w => ({
      text: w.text, category: Object.prototype.hasOwnProperty.call(labels, w.label) ? labels[w.label] : "unknown", label: w.label,
      confidence: typeof w.confidence === "string" ? w.confidence : undefined,
      range: unit ? {
        start: unit === "codepoint" ? utf16Offsets[w.start_index] : w.start_index,
        end: unit === "codepoint" ? utf16Offsets[w.end_index] : w.end_index,
      } : undefined,
    })),
    billingUrl: "https://www.pangram.com/solutions/api",
  };
}

export class PangramProvider implements AiDetectionProvider {
  readonly name = "Pangram";
  readonly minimumWords = 50;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly usdPer100Words: number,
    private readonly fetcher: Fetch = globalThis.fetch,
    private readonly wait: (ms: number, signal: AbortSignal) => Promise<unknown> =
      (ms, signal) => sleep(ms, undefined, { signal }),
  ) {}

  async analyze(text: string, { signal }: { signal: AbortSignal }): Promise<DetectionResult> {
    try {
      // No automatic POST retry: a lost response can still represent a billed task.
      const submitted = await this.request("/task", signal, { text, model: this.model, public_dashboard_link: false });
      if (!submitted.response.ok) throw this.httpError(submitted.response.status);
      if (typeof submitted.body.task_id !== "string" || !submitted.body.task_id) throw malformed();
      const taskPath = `/task/${encodeURIComponent(submitted.body.task_id)}`;
      let delay = 1_000;
      while (true) {
        await this.wait(delay, signal);
        let polled;
        try {
          polled = await this.request(taskPath, signal);
        } catch (error) {
          if (signal.aborted || error instanceof AiCheckError) throw error;
          delay = Math.min(delay * 2, 5_000);
          continue;
        }
        const { response, body } = polled;
        if (response.status === 429 || response.status >= 500) {
          const retry = response.headers.get("retry-after");
          const retryMs = retry ? (/^\d+(\.\d+)?$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 0;
          delay = Math.max(Math.min(delay * 2, 5_000), Number.isFinite(retryMs) ? retryMs : 0);
          continue;
        }
        if (!response.ok) throw this.httpError(response.status);
        if (body.stage === "STAGE_FAILED") {
          throw new AiCheckError("provider_failed", "Pangram could not analyze this text. The submitted scan may still incur a charge.");
        }
        if (body.stage === "STAGE_SUCCESS") {
          const result = normalizePangram(body, this.model);
          const units = Math.ceil(wordCount(text) / 100);
          result.usage = { estimated: true, units, unit: "100-word blocks", cost: { amount: units * this.usdPer100Words, currency: "USD" } };
          return result;
        }
        if (typeof body.stage !== "string" || !body.stage.startsWith("STAGE_")) throw malformed();
        delay = Math.min(delay * 2, 5_000);
      }
    } catch (error) {
      if (signal.aborted) throw new AiCheckError("timeout", "The scan timed out. Pangram may still complete and charge for it. No replacement scan was submitted.");
      if (error instanceof AiCheckError) throw error;
      throw new AiCheckError("connection", "The Pangram request could not be confirmed and may incur a charge. No replacement scan was submitted.");
    }
  }

  private async request(path: string, signal: AbortSignal, payload?: object) {
    const response = await this.fetcher(`${BASE_URL}${path}`, {
      method: payload ? "POST" : "GET", redirect: "error",
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    });
    // Do not parse/log provider error bodies: they may echo the submitted text.
    if (!response.ok) {
      await response.body?.cancel();
      return { response, body: {} as Record<string, any> };
    }
    // Preserve transport failures while reading a body so safe GET polls can retry.
    const bytes = await readLimited(response, 4 * 1024 * 1024);
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw malformed(); }
    if (!isObject(body)) throw malformed();
    return { response, body };
  }

  private httpError(status: number): AiCheckError {
    const messages: Record<number, string> = {
      401: "Pangram credentials are unavailable or invalid. Contact a bot administrator.",
      402: "Pangram reports insufficient API credit. Check the shared API billing account.",
      403: "Pangram did not authorize this model or task. Contact a bot administrator.",
      404: "Pangram could not find the submitted task. No replacement scan was submitted.",
      422: "Pangram rejected the text or configured model. No replacement scan was submitted.",
      429: "Pangram is rate limited. Please try later.",
      503: "The configured Pangram model is unavailable. No replacement scan was submitted.",
    };
    return new AiCheckError(`http_${status}`, messages[status] ?? "Pangram could not complete the request. A submitted scan may incur a charge; no replacement was submitted.");
  }
}
