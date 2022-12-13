import { schedule } from "node-cron";
import IScheduledTask from "./IScheduledTask";

export default class TaskScheduler {
  constructor(tasks: Array<IScheduledTask>) {
    tasks.forEach(({ frequency, handler }) => {
      let scheduleString = "";
      scheduleString += `*${
        frequency.seconds > 0 ? `/${frequency.seconds}` : ""
      } `;
      scheduleString += `*${
        frequency.minutes > 0 ? `/${frequency.minutes}` : ""
      } `;
      scheduleString += `*${frequency.hours > 0 ? `/${frequency.hours}` : ""} `;
      scheduleString += `*${frequency.days > 0 ? `/${frequency.days}` : ""} `;
      scheduleString += "* *";
      schedule(scheduleString, handler);
    });
  }
}
