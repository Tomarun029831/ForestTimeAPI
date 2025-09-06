'use strict';

interface AttendanceRecord {
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

interface ActivityData {
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

interface Employee {
    employee_id: string;
    name: string;
    email: string;
    phone_number: string | null;
    assigned_area: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface WorkArea {
    area_id: string;
    area_name: string;
    coordinates: number[][];
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface AuthRequest {
    name: string;
    password: string;
}

interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T | undefined;    // 明示的に undefined を含める
    error?: string | undefined;  // 明示的に undefined を含める
    timestamp: string;
}

export { AttendanceRecord, ActivityData, Employee, WorkArea, AuthRequest, AuthResponse, ApiResponse }
