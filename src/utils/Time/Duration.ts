import {
  daysToMilliseconds,
  hoursToMilliseconds,
  minutesToMilliseconds,
  secondsToMilliseconds,
} from "./conversion";

export class Duration {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;

  constructor(time: {
    milliseconds?: number;
    seconds?: number;
    minutes?: number;
    hours?: number;
    days?: number;
  }) {
    this.milliseconds = time.milliseconds ?? 0;
    this.seconds = time.seconds ?? 0;
    this.minutes = time.minutes ?? 0;
    this.hours = time.hours ?? 0;
    this.days = time.days ?? 0;
  }

  public getMilliseconds() {
    return (
      this.milliseconds +
      secondsToMilliseconds(this.seconds) +
      minutesToMilliseconds(this.minutes) +
      hoursToMilliseconds(this.hours) +
      daysToMilliseconds(this.days)
    );
  }
}
