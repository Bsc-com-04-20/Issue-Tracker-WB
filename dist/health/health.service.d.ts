import { DataSource } from 'typeorm';
export declare class HealthService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    checkDb(): Promise<{
        ok: boolean;
        latencyMs: number;
        error?: string;
    }>;
}
