import { createCanvas } from "canvas";
import { ReportSession } from "./AiCheckService";
import { DetectionResult, SegmentCategory } from "./types";
import { wordCount } from "./input";

export const CATEGORY_NAMES: Record<SegmentCategory, string> = {
  ai: "AI-generated", assisted: "AI-assisted", human: "Human", unknown: "Unknown",
};
const COLORS: Record<SegmentCategory, string> = { ai: "#d35400", assisted: "#916300", human: "#00796b", unknown: "#666666" };
const escape = (text: string) => text.replace(/[\\`*_{}[\]()<>#+.!|~]/g, "\\$&").replace(/@/g, "@\u200b");
const clip = (text: string, length: number) => text.length <= length ? text : text.slice(0, length - 1) + "…";
const percent = (n: number | undefined) => n === undefined ? "Unavailable" : n > 0 && n < 0.001 ? "<0.1%" : `${(n * 100).toFixed(1)}%`;

export function budgetText(result: DetectionResult): string {
  const usage = result.usage;
  const cost = usage?.cost;
  const balance = result.balance;
  return [
    usage ? `${usage.estimated ? "Estimated" : "Reported"} usage: ${usage.units} ${usage.unit}${cost ? ` · ${cost.amount.toFixed(2)} ${cost.currency}` : ""}` : "Scan usage/cost: unavailable",
    balance ? `Remaining API balance: ${balance.amount} ${balance.unit} (observed ${new Date(balance.observedAt).toISOString()})` : `Remaining ${result.provider} API balance: unavailable`,
  ].join("\n");
}

export function summaryEmbed(session: ReportSession, publicReport = false) {
  const r = session.result!;
  return {
    title: clip(escape(`${r.provider}: ${r.headline}`), 240),
    description: clip(escape(r.explanation), 2_000),
    color: 0x00796b,
    fields: [
      { name: "Text classified as", value: `AI-generated: **${percent(r.textFractions?.ai)}**\nAI-assisted: **${percent(r.textFractions?.assisted)}**\nHuman: **${percent(r.textFractions?.human)}**` },
      { name: "Analysis", value: clip(escape(`${r.provider} · ${r.model}${r.version ? ` · version ${r.version}` : ""}\n${wordCount(r.analyzedText)} words in analyzed text${r.analyzedText !== session.submittedText ? " · provider normalized the input" : ""}`), 1_000) },
      { name: "Shared API budget", value: clip(escape(budgetText(r)), 1_000) },
      ...(!r.segments.length ? [{ name: "Segments", value: "The provider did not return segment details." }] :
        r.segments.some(s => !s.range) ? [{ name: "Segments", value: "Segment positions could not be verified, so the chart is unavailable. Segment text and labels are in the complete report." }] :
        session.hasChart === false ? [{ name: "Segments", value: "The chart could not be rendered. Segment text, positions, and labels are in the complete report." }] : []),
    ],
    timestamp: new Date(session.completedAt!).toISOString(),
    footer: { text: `Detection is an estimate for human review. Report ${session.id}${publicReport ? "" : ` · Controls expire ${new Date(session.expiresAt).toISOString()}`}` },
  };
}

export function segmentPages(result: DetectionResult): string[] {
  const pages: string[] = [];
  result.segments.forEach((segment, index) => {
    const heading = `**Segment ${index + 1}/${result.segments.length}: ${escape(CATEGORY_NAMES[segment.category])}**\n${clip(escape(segment.label), 200)}${segment.confidence ? ` · Confidence: ${clip(escape(segment.confidence), 100)}` : ""}`;
    // Escape BEFORE sizing; escaping may double a payload's length. Iterate by code point.
    let page = "";
    const parts: string[] = [];
    for (const character of segment.text) {
      const escaped = escape(character);
      if (page.length + escaped.length > 3_200) { parts.push(page); page = ""; }
      page += escaped;
    }
    parts.push(page || "(Empty segment)");
    parts.forEach((part, p) => pages.push(`${heading}${parts.length > 1 ? ` · Part ${p + 1}/${parts.length}` : ""}\n\n${part}`));
  });
  return pages.length ? pages : ["This provider did not return segment details."];
}

export function fullReport(session: ReportSession): Buffer {
  const r = session.result!;
  const parts = [
    `AI detection report ${session.id}`, `${r.provider} / ${r.model} / ${r.version ?? "version unavailable"}`,
    new Date(session.completedAt!).toISOString(), r.headline, r.explanation,
    `AI-generated: ${percent(r.textFractions?.ai)}; AI-assisted: ${percent(r.textFractions?.assisted)}; Human: ${percent(r.textFractions?.human)}`,
    budgetText(r), "Detection is an estimate for human review.", "", "SUBMITTED TEXT", session.submittedText!,
  ];
  if (r.analyzedText !== session.submittedText) parts.push("", "ANALYZED TEXT (normalized by provider)", r.analyzedText);
  parts.push("", "SEGMENTS (positions refer to analyzed text; overlaps/gaps are preserved)");
  for (const [index, s] of r.segments.entries()) {
    parts.push("", `${index + 1}. ${CATEGORY_NAMES[s.category]} — ${s.label}${s.confidence ? `; confidence: ${s.confidence}` : ""}; ${s.range ? `UTF-16 range [${s.range.start}, ${s.range.end})` : "position unavailable"}`, s.text);
  }
  if (!r.segments.length) parts.push("Segment details unavailable.");
  return Buffer.from(parts.join("\n"), "utf8");
}

/** Fixed-size chart: overlap appears in category lanes; gaps are not inferred to be human. */
export function segmentChart(result: DetectionResult): Buffer | undefined {
  if (!result.segments.length || result.segments.some(s => !s.range)) return undefined;
  const categories: SegmentCategory[] = ["human", "assisted", "ai"];
  if (result.segments.some(s => s.category === "unknown")) categories.push("unknown");
  const width = 1000, height = 170 + 60 * categories.length, left = 180, right = 950;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#15202b"; ctx.font = "bold 24px sans-serif";
  ctx.fillText("Classifications across the analyzed text", 30, 38);
  categories.forEach((category, row) => {
    const y = 70 + row * 60;
    ctx.fillStyle = "#15202b"; ctx.font = "18px sans-serif";
    ctx.fillText(CATEGORY_NAMES[category], 25, y + 25);
    ctx.fillStyle = "#eeeeee"; ctx.fillRect(left, y, right - left, 36);
    for (const s of result.segments.filter(s => s.category === category)) {
      const start = left + s.range!.start / result.analyzedText.length * (right - left);
      const end = left + s.range!.end / result.analyzedText.length * (right - left);
      ctx.fillStyle = COLORS[category]; ctx.fillRect(start, y, Math.max(1, end - start), 36);
    }
  });
  ctx.fillStyle = "#15202b"; ctx.font = "17px sans-serif";
  ctx.fillText("0%", left, height - 52); ctx.fillText("100%", right - 42, height - 52);
  ctx.fillText("Relative position in analyzed text · blank areas are unclassified in that row", 180, height - 22);
  return canvas.toBuffer("image/png");
}

export function reportFiles(session: ReportSession, chart: typeof segmentChart = segmentChart) {
  const files: { attachment: Buffer; name: string; description?: string }[] = [
    { attachment: fullReport(session), name: "ai-report.txt" },
  ];
  try {
    const image = chart(session.result!);
    if (image) files.push({ attachment: image, name: "ai-segments.png", description: "Segment classifications by relative text position. Full labels and text are in ai-report.txt." });
  } catch { /* Deliver the complete text report even if native canvas fails. */ }
  return files;
}
