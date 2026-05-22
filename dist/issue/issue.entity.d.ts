import { User } from '../user/user.entity';
import { Location } from '../location/location.entity';
import { Status } from '../status/status.entity';
export declare class Issue {
    id: number;
    description: string;
    severityLevel: string;
    reportChannel: string;
    dateReported: Date;
    reporterName: string;
    reporterPhone: string;
    reporterAffiliation: string | null;
    reporterEmail: string | null;
    createdBy: User;
    location: Location;
    currentStatus: Status;
}
