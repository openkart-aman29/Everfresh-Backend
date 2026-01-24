export interface ReadStaffParams {
    staffId: string;
}

export interface ReadAllStaffQuery {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    availableOnly?: boolean;
}

export interface UpdateStaffProfileBody {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface UpdateStaffAvailabilityBody {
    isAvailable: boolean;
}

export interface UpdateStaffSkillsBody {
    skills: string[];
}