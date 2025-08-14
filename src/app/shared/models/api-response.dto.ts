export interface APIResponse<T_Data>{
    data: T_Data;
    Succeeded: boolean;
    Message: string;
    Errors: string[];

    CurrentPage?: number;
    TotalPages?: number;
    TotalCount?: number;
    PageSize?: number;
    HasPreviousPage?: boolean;
    HasNextPage?: boolean;


    succeeded?: boolean;
    message?: string;
}


    