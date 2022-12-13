export function secondsToMilliseconds(seconds: number): number {
  return seconds * 1000;
}

export function secondsToHours(seconds: number): number {
  return secondsToMinutes(seconds) / 60;
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export function minutesToMilliseconds(minutes: number): number {
  return secondsToMilliseconds(60) * minutes;
}

export function hoursToMilliseconds(hours: number): number {
  return minutesToMilliseconds(60) * hours;
}

export function daysToMilliseconds(days: number): number {
  return hoursToMilliseconds(24) * days;
}

export function millisecondsToSeconds(milliseconds: number): number {
  return milliseconds / 1000;
}

export function millisecondsToMinutes(milliseconds: number): number {
  return millisecondsToSeconds(milliseconds) / 60;
}

export function millisecondsToHours(milliseconds: number): number {
  return millisecondsToMinutes(milliseconds) / 60;
}

export function millisecondsToDays(milliseconds: number): number {
  return millisecondsToHours(milliseconds) / 24;
}
