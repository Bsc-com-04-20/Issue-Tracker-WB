import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    live(): {
        status: string;
        checks: {
            process: string;
        };
    };
    ready(): Promise<{
        status: string;
        checks: {
            database: {
                ok: boolean;
                latencyMs: number;
                error?: string;
            };
        };
    }>;
}
