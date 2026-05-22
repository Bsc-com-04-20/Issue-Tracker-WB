export declare class LocationInputDto {
    latitude: number;
    longitude: number;
    addressDescription: string;
    serviceArea?: string;
}
export declare class CreateIssueDto {
    description: string;
    severityLevel: string;
    reportChannel: string;
    dateReported: string;
    reporterName: string;
    reporterPhone: string;
    reporterAffiliation?: string;
    reporterEmail?: string;
    location: LocationInputDto;
}
