export const getErrorStatus = (status: number): string => {
    switch (status) {
        case 400: return 'BAD_REQUEST';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 409: return 'CONFLICT';
        case 422: return 'UNPROCESSABLE_ENTITY';
        case 500: return 'INTERNAL_SERVER_ERROR';
        default: return 'UNKNOWN_ERROR';
    }
};