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

export interface  Config {
    id?: string;
}
export interface ChanclaConfig extends Config {
    id: string;
    users: {[id: string]: number}
}