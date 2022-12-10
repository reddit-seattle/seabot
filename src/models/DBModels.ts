export interface Award {
  id?: string;
  awardedTo: string;
  awardedBy: string;
  awardedOn: Date;
  message?: string;
}

export interface Incident {
  id?: string;
  occurrence: Date;
  note?: string;
  link?: string;
}

export interface Telemetry {
  channelId: string;
  COUNT_channelId: number;
  Window_End_Time: Date;
  id?: string;
}
