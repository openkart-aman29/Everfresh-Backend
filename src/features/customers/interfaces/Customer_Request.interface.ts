export interface GetCustomerParams {
    customerId: string;
}

export interface GetAllCustomersQuery {
    page?: number;
    limit?: number;
    q?: string; // search query
}

export interface UpdateCustomerParams {
    customerId: string;
}

export interface UpdateCustomerBody {
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export interface DeleteCustomerParams {
    customerId: string;
}