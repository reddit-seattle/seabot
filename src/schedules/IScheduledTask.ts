import { Duration } from "../utils/Time/Duration";

export default interface IScheduledTask {
  name: string;
  description: string;
  frequency: Duration;
  handler: () => void;
}
