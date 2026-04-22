import { schedule, ScheduledTask } from "node-cron";
import { Logger } from "../utils/logger";
import IScheduledTask from "./IScheduledTask";

export default class TaskScheduler {
  private tasks: ScheduledTask[] = [];

  constructor(tasks: Array<IScheduledTask>) {
    tasks.forEach(({ name, frequency, handler }) => {
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
      this.tasks.push(
        schedule(scheduleString, async () => {
          try {
            await handler();
          } catch (error) {
            Logger.error(`Scheduled task "${name}" failed:`, error);
          }
        }),
      );
    });
  }

  stop() {
    for (const task of this.tasks) {
      task.stop();
    }
  }
}
