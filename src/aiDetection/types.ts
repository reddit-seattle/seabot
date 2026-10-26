export type SegmentCategory = "ai" | "assisted" | "human" | "unknown";

export interface DetectionSegment {
  text: string;
  category: SegmentCategory;
  label: string;
  confidence?: string;
  /** End-exclusive JavaScript UTF-16 offsets into analyzedText, when verified. */
  range?: { start: number; end: number };
}

export interface DetectionResult {
  provider: string;
  model: string;
  version?: string;
  analyzedText: string;
  headline: string;
  explanation: string;
  /** Fractions of text, NEVER probabilities of document authorship. */
  textFractions?: { ai?: number; assisted?: number; human?: number };
  segments: DetectionSegment[];
  usage?: {
    estimated: boolean;
    units: number;
    unit: string;
    cost?: { amount: number; currency: string };
  };
  balance?: { amount: number; unit: string; observedAt: number };
  billingUrl?: string;
}

export interface AiDetectionProvider {
  readonly name: string;
  readonly minimumWords: number;
  analyze(text: string, options: { signal: AbortSignal }): Promise<DetectionResult>;
}

export interface AiDetectionConfig {
  enabled: boolean;
  guildId: string;
  provider: "pangram";
  model: string;
  /** An estimate for this model only; recheck when changing models. */
  usdPer100Words: number;
}

export { UserFacingError as AiCheckError } from "../utils/UserFacingError";

export const LIMITS = {
  bytes: 256 * 1024,
  words: 5_000,
  modalCharacters: 4_000,
  analysisMs: 5 * 60_000,
  reportMs: 10 * 60_000,
  tokenMarginMs: 14 * 60_000,
  cooldownMs: 60_000,
  concurrent: 2,
  sessions: 100,
} as const;

export type Fetch = typeof globalThis.fetch;
