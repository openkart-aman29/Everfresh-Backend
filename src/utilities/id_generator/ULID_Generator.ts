import { ulid } from 'ulid';

export const generateULID = (): string => {
    return ulid();
};