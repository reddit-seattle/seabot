import { normalizeYear } from "./helpers";

type ParsedEventDate = {
  start: Date;
  end?: Date | null;
};

// Main regex considerations:
// ---------------------
// numeric date with optional time: "12/31/2022 8am", "3/15 at 12:30pm"
// month name with optional time: "Jan 12, 2022 8am", "September 5 at 12:30pm"
// bracketed month name with time: "[Event Jan 12 | 8am]"
// ---------------------

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

// Matches month name formats
const MONTH_NAME_SUFFIXES: { [key: string]: string } = {
  jan: "(?:uary)?",
  feb: "(?:ruary)?",
  mar: "(?:ch)?",
  apr: "(?:il)?",
  may: "",
  jun: "(?:e)?",
  jul: "(?:y)?",
  aug: "(?:ust)?",
  sep: "(?:t(?:ember)?)?",
  oct: "(?:ober)?",
  nov: "(?:ember)?",
  dec: "(?:ember)?",
};
const MONTH_NAME_VARIANTS = MONTH_NAMES.map(
  (m) => `${m}${MONTH_NAME_SUFFIXES[m]}`,
);

const dateRegexTemplate = (varName: string) =>
  `(?<${varName}Month>\\d{1,2})/(?<${varName}Day>\\d{1,2})(?:/(?<${varName}Year>\\d{2,4}))?`;

const MONTH_NAME_PART = `(?<monthName>${MONTH_NAME_VARIANTS.join("|")})`;

// Matches numeric date formats, e.g. "12/31", "12/31/2022"
// Example: "3/15", "11/22/23", "12/31/2022"
const NUMERIC_DATE_PART =
  "(?<month>\\d{1,2})/(?<day>\\d{1,2})(?:/(?<year>\\d{2,4}))?";

// Matches time formats, e.g. "12:30pm", "8am", "23:45"
const TIME_PART = "(?<hour>\\d{1,2})(?::(?<minute>\\d{2}))?\\s*(?<ampm>am|pm)?";

// Template for day and optional year after month name: "12" or "12, 2022"
const MONTH_DAY_PART = "\\s*(?<monthDay>\\d{1,2})";

// Matches optional year and eats punctuation: ", 2022" or " 2022" or ",2022"
const MONTH_YEAR_PART = "(?:,?\\s*(?<monthYear>\\d{4}))?";

// Combined for convenience
const MONTH_DAY_YEAR_PART = `${MONTH_DAY_PART}${MONTH_YEAR_PART}`;

// Matches numeric date with optional time: "12/31/2022 8am", "3/15 at 12:30pm", "11/22/23", "12/31"
export const NUMERIC_DATE_TIME = new RegExp(
  `${NUMERIC_DATE_PART}(?:\\s*(?:at|@)?\\s*${TIME_PART})?`,
  "i",
);
// Matches month name date with optional time: "Jan 12, 2022 8am", "September 5 at 12:30pm", "Feb 3", "March 15, 2023"
export const MONTH_NAME_DATE_TIME = new RegExp(
  `${MONTH_NAME_PART}${MONTH_DAY_YEAR_PART}(?:\\s*(?:at|@)?\\s*${TIME_PART})?`,
  "i",
);
// Matches bracketed month name date with time: "[Event Jan 12 | 8am]"
export const BRACKETED_MONTH_NAME = new RegExp(
  `\\[(?:\\w+)?\\s*${MONTH_NAME_PART}${MONTH_DAY_YEAR_PART}\\s*\\|\\s*${TIME_PART}\\]`,
  "i",
);

// Matches numeric date range formats, e.g. "2/22-2/25", "2/22/2026-2/25/2026", "[2/22 - 2/25]"
export const NUMERIC_DATE_RANGE = new RegExp(
  // Optional brackets
  "^\\[?\\s*" +
    // Start date
    dateRegexTemplate("start") +
    // Optional spaces and dash
    "\\s*-\\s*" +
    // End date
    dateRegexTemplate("end") +
    // Optional brackets
    "\\s*\\]?" +
    // Optional time (not supported for range)
    "",
  "i",
);

function parseMonthName(name: string): number {
  return MONTH_NAMES.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

export function parseEventDate(input: string): ParsedEventDate | null {
  let is_multi_day = false;
  // try date range
  let match = input.match(NUMERIC_DATE_RANGE);
  let groups = match?.groups;
  if (groups) is_multi_day = true;
  if (!groups) {
    // try month name formats
    match = input.match(MONTH_NAME_DATE_TIME);
    groups = match?.groups;
  }
  if (!groups) {
    // try bracketed month name / time
    match = input.match(BRACKETED_MONTH_NAME);
    groups = match?.groups;
  }
  if (!groups) {
    // try numeric date formats
    match = input.match(NUMERIC_DATE_TIME);
    groups = match?.groups;
  }

  if (!groups) return null;

  const parsedStartYear = normalizeYear(groups.year || groups.monthYear);
  const parsedStartMonth = groups.month
    ? parseInt(groups.month)
    : groups.monthName
      ? parseMonthName(groups.monthName)
      : groups.startMonth
        ? parseInt(groups.startMonth)
        : undefined;
  const parsedStartDay = groups.day
    ? parseInt(groups.day)
    : groups.monthDay
      ? parseInt(groups.monthDay)
      : groups.startDay
        ? parseInt(groups.startDay)
        : undefined;
  if (!parsedStartYear || !parsedStartMonth || !parsedStartDay) return null;

  let parsedHour = groups.hour ? parseInt(groups.hour) : 0;
  if (groups.ampm) {
    const ampm = groups.ampm.toLowerCase();
    if (ampm === "pm" && parsedHour < 12) {
      parsedHour += 12;
    } else if (ampm === "am" && parsedHour === 12) {
      parsedHour = 0;
    }
  }
  const parsedMinute = groups.minute ? parseInt(groups.minute) : 0;

  let end: Date | null = null;

  if (is_multi_day) {
    const parsedEndYear = normalizeYear(groups.endYear || groups.endMonthYear);
    const parsedEndMonth = groups.endMonth
      ? parseInt(groups.endMonth)
      : groups.endMonthName
        ? parseMonthName(groups.endMonthName)
        : undefined;
    const parsedEndDay = groups.endDay
      ? parseInt(groups.endDay)
      : groups.endMonthDay
        ? parseInt(groups.endMonthDay)
        : undefined;
    if (!parsedEndYear || !parsedEndMonth || !parsedEndDay) end = null;
    else {
      end = new Date(parsedEndYear, parsedEndMonth - 1, parsedEndDay);
    }
  }
  return {
    start: new Date(
      parsedStartYear,
      // javascript is so silly sometimes
      parsedStartMonth - 1,
      parsedStartDay,
      // start time is currently unused
      parsedHour,
      parsedMinute,
    ),
    end,
  };
}
