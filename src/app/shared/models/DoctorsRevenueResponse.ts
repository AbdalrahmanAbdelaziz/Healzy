export interface DoctorsRevenueResponse<T> {
    data: T;
    succeeded: boolean;
    message: string;
    errors: string[];
    statusCode: number;
}