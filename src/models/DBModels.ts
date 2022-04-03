export interface Award {
    id?: string;
    awardedTo: string;
    awardedBy: string;
    awardedOn: Date;
    message?: string;
}