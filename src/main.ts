'use strict'

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

function doGet(e: GoogleAppsScript.Events.DoGet) {
    const action = e.parameter.action;

    let data: any;

    switch (action) {
        case 'getAttendanceData':
            data = {
                record_id: 'att001',
                employee_id: 'emp001',
                check_in_time: new Date().toISOString(),
                check_out_time: null,
                work_area_id: 'area001',
                is_offline_entry: false,
                sync_time: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as AttendanceRecord;
            break;
        case 'getActivityData':
            data = {
                activity_id: 'act001',
                record_id: 'att001',
                employee_id: 'emp001',
                record_time: new Date().toISOString(),
                latitude: 35.6895,
                longitude: 139.6917,
                altitude: 10.0,
                heading: 90.0,
                acceleration_x: 0.1,
                acceleration_y: 0.2,
                acceleration_z: 0.3,
                activity_type: 'walking',
                is_synced: true,
                created_at: new Date().toISOString(),
            } as ActivityData;
            break;
        case 'getEmployeeData':
            data = {
                employee_id: 'emp001',
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone_number: '123-456-7890',
                assigned_area: 'area001',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Employee;
            break;
        case 'getWorkareaData':
            data = {
                area_id: 'area001',
                area_name: 'Main Office',
                coordinates: [[35.689, 139.691], [35.690, 139.692]],
                description: 'Main office building area',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as WorkArea;
            break;
        default:
            return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
