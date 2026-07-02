import { createCanvas } from "canvas";

interface Season {
  name: string;
  startMonth: number; // 1-12
  startDay: number;
  displayIndex: number; // 0-based row in the 14-item display list
}

// Seasons in cycle order (ascending shiftedVal, cycle starts Nov 1).
// "The Dark Wet" is split at Dec 1 so both display rows are reachable:
//   Nov 1–Nov 30  → displayIndex 13 (bottom row, just entered from Convergence Zones)
//   Dec 1–Dec 21  → displayIndex  0 (top row, deep in winter heading to Paralyzing Snow)
const SEASONS: Season[] = [
  { name: "The Dark Wet",            startMonth: 11, startDay:  1, displayIndex: 13 },
  { name: "The Dark Wet",            startMonth: 12, startDay:  1, displayIndex:  0 },
  { name: "Paralyzing Snow (¼ inch)", startMonth: 12, startDay: 22, displayIndex:  1 },
  { name: "Brightening Wet",         startMonth:  1, startDay: 11, displayIndex:  2 },
  { name: "*Fakeout Sunbreak*",       startMonth:  2, startDay: 21, displayIndex:  3 },
  { name: "Molding Wet",             startMonth:  3, startDay: 16, displayIndex:  4 },
  { name: "Flowering Wet",           startMonth:  4, startDay: 11, displayIndex:  5 },
  { name: "Juneuary",                startMonth:  5, startDay: 21, displayIndex:  6 },
  { name: "Glorious Sun",            startMonth:  7, startDay:  1, displayIndex:  7 },
  { name: "Oppressive Sun",          startMonth:  7, startDay: 21, displayIndex:  8 },
  { name: "Choking Smoke",           startMonth:  8, startDay: 16, displayIndex:  9 },
  { name: "Welcome Drizzle",         startMonth:  9, startDay: 11, displayIndex: 10 },
  { name: "Spiders",                 startMonth:  9, startDay: 21, displayIndex: 11 },
  { name: "Convergence Zones",       startMonth: 10, startDay:  6, displayIndex: 12 },
];

// Fixed 14-item display list (top → bottom). Built from displayIndex ordering above.
const DISPLAY_SEASONS: string[] = Array(14);
for (const s of SEASONS) {
  DISPLAY_SEASONS[s.displayIndex] = s.name;
}

/**
 * Returns the 0-based display row (0–13) for the given date.
 */
export function getCurrentSeasonIndex(date: Date): number {
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  // Shift so Nov 1 = offset 0: (m - 11 + 12) % 12
  const shiftedMonth = ((m - 11 + 12) % 12);
  const shiftedVal = shiftedMonth * 100 + d;

  const seasonShiftedVals = SEASONS.map((s) => {
    const sm = ((s.startMonth - 11 + 12) % 12);
    return sm * 100 + s.startDay;
  });

  // Last season whose start <= shiftedVal
  let matchedIdx = 0;
  for (let i = 0; i < seasonShiftedVals.length; i++) {
    if (shiftedVal >= seasonShiftedVals[i]) {
      matchedIdx = i;
    }
  }

  return SEASONS[matchedIdx].displayIndex;
}

export class SeattleSeasonsImageGenerator {
  private static readonly CANVAS_WIDTH = 1188;
  private static readonly CANVAS_HEIGHT = 950;
  private static readonly LEFT_MARGIN = 56;
  private static readonly LINE_HEIGHT = 55;
  private static readonly SEASONS_START_Y = 150;
  private static readonly TITLE_Y = 75;
  private static readonly SEASON_FONT = "38px Arial";
  private static readonly TEXT_COLOR = "#111111";
  private static readonly ACCENT_COLOR = "#cc3300";

  private static readonly ARROW_LENGTH = 250;
  private static readonly ARROW_TIP_GAP = 18; // px between season text and arrowhead
  private static readonly ARROW_LINE_WIDTH = 4;
  private static readonly ARROWHEAD_SIZE = 15;
  private static readonly LABEL_GAP = 18; // px between arrow tail and label

  public static generateSeasonsImage(currentSeasonIndex: number): Buffer {
    const canvas = createCanvas(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Seattle Seasons", this.LEFT_MARGIN, this.TITLE_Y);

    // Season list (14 display items)
    ctx.font = this.SEASON_FONT;
    for (let i = 0; i < DISPLAY_SEASONS.length; i++) {
      const y = this.SEASONS_START_Y + i * this.LINE_HEIGHT;
      ctx.fillStyle = this.TEXT_COLOR;
      ctx.fillText(DISPLAY_SEASONS[i], this.LEFT_MARGIN, y);
    }

    // Measure the current season's text so the arrow tip almost touches it
    ctx.font = this.SEASON_FONT;
    const currentSeasonName = DISPLAY_SEASONS[currentSeasonIndex];
    const textWidth = ctx.measureText(currentSeasonName).width;

    const arrowTipX = this.LEFT_MARGIN + textWidth + this.ARROW_TIP_GAP;
    const arrowTailX = arrowTipX + this.ARROW_LENGTH;

    // Arrow Y — vertically centered on the season row text
    const seasonRowY =
      this.SEASONS_START_Y + currentSeasonIndex * this.LINE_HEIGHT - 13;

    // Arrow body (horizontal line, tip to tail)
    ctx.strokeStyle = this.ACCENT_COLOR;
    ctx.lineWidth = this.ARROW_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(arrowTailX, seasonRowY);
    ctx.lineTo(arrowTipX + this.ARROWHEAD_SIZE, seasonRowY);
    ctx.stroke();

    // Arrowhead (pointing left)
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.beginPath();
    ctx.moveTo(arrowTipX, seasonRowY);
    ctx.lineTo(arrowTipX + this.ARROWHEAD_SIZE, seasonRowY - 10);
    ctx.lineTo(arrowTipX + this.ARROWHEAD_SIZE, seasonRowY + 10);
    ctx.closePath();
    ctx.fill();

    // "you are here" label to the right of the arrow tail, vertically centered
    ctx.fillStyle = this.ACCENT_COLOR;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "left";
    ctx.fillText("you are here", arrowTailX + this.LABEL_GAP, seasonRowY + 10);

    return canvas.toBuffer("image/png");
  }
}
