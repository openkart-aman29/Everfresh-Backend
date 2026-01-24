export interface StandardResponseInterface<T> {
    success: boolean;
    status: number;
    message: string;
    code: string;
    data: T;
    errors: Array<{
        field: string;
        message: string;
    }>;
}