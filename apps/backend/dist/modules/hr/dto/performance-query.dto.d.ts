export declare class PerformanceQueryDto {
    branch?: string;
    role?: string;
    sortBy?: string;
    department?: string;
    status?: string;
    tripType?: string;
    routeScope?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
    format?: 'json' | 'csv';
    startDate?: string;
    endDate?: string;
    q?: string;
}
