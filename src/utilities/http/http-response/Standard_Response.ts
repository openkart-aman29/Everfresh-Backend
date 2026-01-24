import { Response } from 'express';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';

export function sendResponse<T>(
    res: Response,
    responseData: StandardResponseInterface<T>
) {
    return res.status(responseData.status).json(responseData);
}