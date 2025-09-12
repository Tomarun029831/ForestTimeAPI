'use strict';

export interface Employee {
    id: string // Uuid
    name: string
    phoneNumber?: string
    email?: string
    department: string
    position: string
    hireDate?: Date
}

export interface AuthRequest {
    username: string
    password: string
}

export interface AuthResponse {
    success: boolean
    token?: string
}

export interface TokenCheckRequest { token?: string }
export interface TokenCheckResponse { success: boolean }

export interface GetAllEmployeesRequest { token?: string }
export interface GetAllEmployeesResponse { success: boolean, employees?: Employee[] }

export interface AddEmployeeRequest { token?: string, newEmployee?: Employee }
export interface AddEmployeeResponse { success: boolean }

export interface DeleteEmployeeRequest { token?: string, employeeId?: string }
export interface DeleteEmployeeResponse { success: boolean }


// === ===
export interface AttendanceRecord {
    record_id: string;
    employee_id: string;
    check_in_time: string;
    check_out_time: string | null;
    work_area_id: string;
    is_offline_entry: boolean;
    sync_time: string | null;
    created_at: string;
    updated_at: string;
}

export interface ActivityData {
    activity_id: string;
    record_id: string;
    employee_id: string;
    record_time: string;
    latitude: number;
    longitude: number;
    altitude: number | null;
    heading: number | null;
    acceleration_x: number | null;
    acceleration_y: number | null;
    acceleration_z: number | null;
    activity_type: string;
    is_synced: boolean;
    created_at: string;
}

export interface WorkArea {
    area_id: string;
    area_name: string;
    coordinates: number[][];
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T | undefined;    // 明示的に undefined を含める
    error?: string | undefined;  // 明示的に undefined を含める
    timestamp: string;
}

