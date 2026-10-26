import { randomBytes } from "node:crypto";
import { validateText } from "./input";
import { AiCheckError, AiDetectionProvider, DetectionResult, LIMITS } from "./types";

export interface RequestContext { userId: string; guildId: string; channelId: string }
export interface ReportSession extends RequestContext {
  id: string;
  expiresAt: number;
  phase: "input" | "running" | "ready";
  submittedText?: string;
  result?: DetectionResult;
  completedAt?: number;
  messageId?: string;
  hasChart?: boolean;
  share: "available" | "sending" | "published" | "unknown";
  publicMessage?: { id: string; url: string };
}

/** Expected rejection before Discord created a public message (e.g. missing permissions). */
export class PublishRejected extends AiCheckError {
  constructor() { super("publish_rejected", "The report could not be posted. Check channel permissions, then try again."); }
}

export class AiCheckService {
  private readonly sessions = new Map<string, ReportSession>();
  private readonly interactions = new Map<string, number>();
  private readonly activeUsers = new Set<string>();
  private readonly submissions = new Map<string, number>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    private readonly provider: AiDetectionProvider,
    private readonly now: () => number = Date.now,
    private readonly log: (outcome: string) => void = () => undefined,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), 30_000);
    this.cleanupTimer.unref();
  }

  dispose(): void { clearInterval(this.cleanupTimer); this.sessions.clear(); }

  get providerName(): string { return this.provider.name; }
  get minimumWords(): number { return this.provider.minimumWords; }

  create(context: RequestContext, interactionId: string): ReportSession {
    this.cleanup();
    if (this.interactions.has(interactionId)) throw new AiCheckError("duplicate", "This request has already been received.");
    // Bound deduplication entries without evicting recent IDs (which could permit a resubmit).
    if (this.interactions.size >= 2_000) throw new AiCheckError("busy", "AI detection is busy. Please try later.");
    if (this.sessions.size >= LIMITS.sessions) {
      const oldest = [...this.sessions.values()].find(s => s.phase !== "running" && s.share !== "sending");
      if (!oldest) throw new AiCheckError("busy", "AI detection is busy. Please try later.");
      this.sessions.delete(oldest.id);
    }
    this.interactions.set(interactionId, this.now() + 15 * 60_000);
    const session: ReportSession = {
      ...context, id: randomBytes(12).toString("hex"), expiresAt: this.now() + LIMITS.reportMs,
      phase: "input", share: "available",
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string, context: RequestContext): ReportSession {
    this.cleanup();
    const session = this.sessions.get(id);
    if (!session) throw new AiCheckError("expired", "These report controls have expired or the bot restarted. Expiry does not delete messages or attachments already delivered to Discord.");
    if (session.userId !== context.userId || session.guildId !== context.guildId || session.channelId !== context.channelId) {
      throw new AiCheckError("owner", "Only the requester can use these report controls, in the original channel.");
    }
    return session;
  }

  async analyze(session: ReportSession, loadText: (signal: AbortSignal) => Promise<string>, responseCreatedAt: number): Promise<void> {
    this.get(session.id, session);
    if (session.phase !== "input") throw new AiCheckError("duplicate", "This request has already been submitted.");
    const user = session.userId;
    if (this.activeUsers.has(user)) throw new AiCheckError("active", "You already have a scan in progress.");
    if (this.activeUsers.size >= LIMITS.concurrent) throw new AiCheckError("busy", "Two scans are already in progress. Please try again shortly.");
    const last = this.submissions.get(user);
    if (last !== undefined && this.now() - last < LIMITS.cooldownMs) {
      throw new AiCheckError("cooldown", "Please wait 60 seconds between scan submissions.");
    }
    // No await between checking and reserving: modal/file paths share the same gates.
    this.activeUsers.add(user);
    session.phase = "running";
    try {
      const signal = AbortSignal.timeout(LIMITS.analysisMs);
      const text = await loadText(signal);
      validateText(text, this.provider.minimumWords);
      this.submissions.set(user, this.now());
      const result = await this.provider.analyze(text, { signal });
      session.submittedText = text;
      session.result = result;
      session.completedAt = this.now();
      session.expiresAt = Math.min(this.now() + LIMITS.reportMs, responseCreatedAt + LIMITS.tokenMarginMs);
      session.phase = "ready";
      this.log("success");
    } catch (error) {
      this.sessions.delete(session.id);
      const safe = error instanceof AiCheckError ? error : new AiCheckError("analysis", "The analysis could not be completed. No replacement scan was submitted.");
      this.log(safe.code);
      throw safe;
    } finally {
      this.activeUsers.delete(user);
    }
  }

  async publish(session: ReportSession, send: () => Promise<{ id: string; url: string }>): Promise<{ id: string; url: string }> {
    // Access checks may have awaited Discord after the initial session lookup.
    this.get(session.id, session);
    if (session.phase !== "ready") throw new AiCheckError("pending", "This report is not ready to share.");
    if (session.publicMessage) return session.publicMessage;
    if (session.share === "sending") throw new AiCheckError("sharing", "This report is already being posted.");
    if (session.share === "unknown") throw new AiCheckError("share_unknown", "The previous post could not be confirmed. Check the channel; further posting is disabled to avoid duplicates.");
    session.share = "sending";
    try {
      session.publicMessage = await send();
      session.share = "published";
      return session.publicMessage;
    } catch (error) {
      session.share = error instanceof PublishRejected ? "available" : "unknown";
      throw error instanceof PublishRejected ? error : new AiCheckError("share_unknown", "Posting could not be confirmed. Check the channel; further posting is disabled to avoid duplicates.");
    }
  }

  private cleanup(): void {
    const now = this.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now && session.phase !== "running" && session.share !== "sending") this.sessions.delete(id);
    }
    for (const [id, until] of this.interactions) if (until <= now) this.interactions.delete(id);
    for (const [user, time] of this.submissions) if (now - time >= LIMITS.cooldownMs) this.submissions.delete(user);
  }
}
