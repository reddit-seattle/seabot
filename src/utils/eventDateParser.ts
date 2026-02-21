type ParseResult = {
  startdate: Date;
  displayTime: boolean;
  enddate?: Date | null;
};

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
const MONTH_NAME_PART = `(?<monthName>${MONTH_NAME_VARIANTS.join("|")})`;

// Matches numeric date formats, e.g. "12/31", "12/31/2022"
// Example: "3/15", "11/22/23", "12/31/2022"
const NUMERIC_DATE_PART =
  "(?<month>\\d{1,2})/(?<day>\\d{1,2})(?:/(?<year>\\d{2,4}))?";

// Matches time formats, e.g. "12:30pm", "8am", "23:45"
const TIME_PART = "(?<hour>\\d{1,2})(?::(?<minute>\\d{2}))?\\s*(?<ampm>am|pm)?";

// Main regexes
// ---------------------
// Matches numeric date with optional time, e.g. "12/31/2022 8am", "3/15 at 12:30pm"
// Matches month name date with optional time, e.g. "Jan 12, 2022 8am", "September 5 at 12:30pm"
// Matches bracketed month name date with time, e.g. "[Event Jan 12 | 8am]"
// ---------------------

// Template for day and optional year after month name: "12" or "12, 2022"
const MONTH_DAY_PART = "\\s*(?<monthDay>\\d{1,2})";
// Matches optional year and eats punctuation: ", 2022" or " 2022" or ",2022"
const MONTH_YEAR_PART = "(?:,?\\s*(?<monthYear>\\d{4}))?";
// Combined for convenience
const MONTH_DAY_YEAR_PART = `${MONTH_DAY_PART}${MONTH_YEAR_PART}`;

// Matches numeric date with optional time: "12/31/2022 8am", "3/15 at 12:30pm", "11/22/23", "12/31"
const NUMERIC_DATE_TIME = new RegExp(
  `${NUMERIC_DATE_PART}(?:\\s*(?:at|@)?\\s*${TIME_PART})?`,
  "i",
);
// Matches month name date with optional time: "Jan 12, 2022 8am", "September 5 at 12:30pm", "Feb 3", "March 15, 2023"
const MONTH_NAME_DATE_TIME = new RegExp(
  `${MONTH_NAME_PART}${MONTH_DAY_YEAR_PART}(?:\\s*(?:at|@)?\\s*${TIME_PART})?`,
  "i",
);
// Matches bracketed month name date with time: "[Event Jan 12 | 8am]"
const BRACKETED_MONTH_NAME = new RegExp(
  `\\[(?:\\w+)?\\s*${MONTH_NAME_PART}${MONTH_DAY_YEAR_PART}\\s*\\|\\s*${TIME_PART}\\]`,
  "i",
);

function parseMonthName(name: string): number {
  return MONTH_NAMES.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

export default function parseEventDate(input: string): ParseResult | null {
  let match = input.match(NUMERIC_DATE_TIME);
  let groups = match?.groups;
  if (!groups) {
    match = input.match(MONTH_NAME_DATE_TIME);
    groups = match?.groups;
  }
  if (!groups) {
    match = input.match(BRACKETED_MONTH_NAME);
    groups = match?.groups;
  }
  if (!groups) return null;

  // for later reference
  const today = new Date();
  const currentYear = today.getFullYear();

  let year = 0,
    month = 0,
    day = 0,
    hour = 12,
    minute = 0,
    displayTime = false;

  if (groups.month && groups.day) {
    month = parseInt(groups.month, 10);
    day = parseInt(groups.day, 10);
    // If year is missing, default to current year.
    year = groups.year ? parseInt(groups.year, 10) : currentYear;
    // normalize 2-digit years to current century
    if (year < 100) {
      year += currentYear - (currentYear % 100);
    }
  } else if (groups.monthName && groups.monthDay) {
    month = parseMonthName(groups.monthName);
    day = parseInt(groups.monthDay, 10);
    // If year is missing, default to current year.
    year = groups.monthYear ? parseInt(groups.monthYear, 10) : currentYear;
    if (year < 100) {
      year += currentYear - (currentYear % 100);
    }
  }

  if (groups.hour) {
    hour = parseInt(groups.hour, 10);
    minute = groups.minute ? parseInt(groups.minute, 10) : 0;
    displayTime = true;
    if (groups.ampm) {
      // Convert 12-hour time to 24-hour time
      if (groups.ampm.toLowerCase() === "pm" && hour < 12) hour += 12;
      if (groups.ampm.toLowerCase() === "am" && hour === 12) hour = 0;
    }
  }

  if (!year || !month || !day) return null;

  return {
    startdate: new Date(year, month - 1, day, hour, minute),
    displayTime,
    enddate: null,
  };
}
