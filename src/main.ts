'use strict';

import {
    ApiResponse, ActivityData, AttendanceRecord, AuthRequest,
    AuthResponse, WorkArea, Employee, TokenCheckRequest,
    TokenCheckResponse, GetAllEmployeesRequest, GetAllEmployeesResponse
    , AddEmployeeRequest, AddEmployeeResponse,
    DeleteEmployeeRequest, DeleteEmployeeResponse
} from "./type"

// 共通のレスポンス作成関数
function createResponse<T>(success: boolean, data?: T, error?: string): GoogleAppsScript.Content.TextOutput {
    const response: ApiResponse<T> = {
        success,
        data,
        error,
        timestamp: new Date().toISOString()
    };

    return ContentService
        .createTextOutput(JSON.stringify(response, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
}

// GET リクエスト処理
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
    try {
        const action = e.parameter.action || '';
        const employeeId = e.parameter.employee_id || null;

        switch (action) {
            case 'getAttendanceData':
                return createResponse(true, getAttendanceData(employeeId));

            case 'getActivityData':
                return createResponse(true, getActivityData(employeeId));


            case 'getWorkareaData':
                return createResponse(true, getWorkAreaData());

            case 'getEmployees':
                return createResponse(true, getAllEmployees());

            case 'getPunches':
                return createResponse(true, getPunches(employeeId));

            case 'getGeofences':
                return createResponse(true, getGeofences());

            case 'getTasks':
                return createResponse(true, getTasks(employeeId));

            case 'getEmployeeReports':
                return createResponse(true, getEmployeeReports(employeeId));

            case 'getAdminReports':
                return createResponse(true, getAdminReports());

            case 'getTools':
                return createResponse(true, getTools());

            default:
                return createResponse(false, null, `不明なアクション: ${action}. 利用可能なアクション: getAttendanceData, getActivityData, getEmployeeData, getWorkareaData`);
        }
    } catch (error: any) {
        console.error('doGet エラー:', error);
        return createResponse(false, null, error.toString());
    }
}

function handleLogin(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput { // HACK: stub
    const uuid = Utilities.getUuid();
    const response: AuthResponse = {
        success: true,
        token: uuid
    };
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

function checkToken(token: string | undefined): boolean { // HACK: stub
    if (token === undefined || token === '') return false;

    return true; // success
}

function handleTokenCheck(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as TokenCheckRequest;
    const token = reqBody.token;

    const response: TokenCheckResponse = { success: checkToken(token) };
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

function getAllEmployees(): Employee[] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("employees");
    if (sheet === null) {
        const sheet = ss.insertSheet("employees");
        sheet.appendRow(["id", "name", "phoneNumber", "email", "department", "position", "hireDate"]);
        return [];
    }
    const values = sheet.getDataRange().getValues();

    // 1行目をヘッダーと仮定
    const headers = values[0] as string[];
    const dataRows = values.slice(1);

    return dataRows.map(row => {
        return {
            id: row[headers.indexOf("id")],
            name: row[headers.indexOf("name")],
            phoneNumber: row[headers.indexOf("phoneNumber")] || undefined,
            email: row[headers.indexOf("email")] || undefined,
            department: row[headers.indexOf("department")],
            position: row[headers.indexOf("position")],
            hireDate: row[headers.indexOf("hireDate")]
                ? new Date(row[headers.indexOf("hireDate")])
                : undefined,
        } as Employee;
    });
}

function handleGetAllEmployees(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as GetAllEmployeesRequest;
    const token = reqBody.token;
    if (!checkToken(token)) {
        const res: GetAllEmployeesResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const employees: Employee[] = getAllEmployees();
    const res: GetAllEmployeesResponse = { success: true, employees: employees };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function addNewEmployee(newEmployee: Employee): boolean {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName("employees");

        // なければ作成＋ヘッダー行
        if (sheet === null) {
            sheet = ss.insertSheet("employees");
            sheet.appendRow([
                "id", "name", "phoneNumber", "email",
                "department", "position", "hireDate"
            ]);
        }

        // hireDate が Date ならシートに書けるようフォーマット
        const hireDateValue =
            newEmployee.hireDate instanceof Date
                ? Utilities.formatDate(newEmployee.hireDate, Session.getScriptTimeZone(), "yyyy/MM/dd")
                : newEmployee.hireDate || "";

        sheet.appendRow([
            newEmployee.id,
            newEmployee.name,
            newEmployee.phoneNumber || "",
            newEmployee.email || "",
            newEmployee.department,
            newEmployee.position,
            hireDateValue,
        ]);

        return true;
    } catch (err) {
        Logger.log("addNewEmployee error: " + err);
        return false;
    }
}

function handleAddEmployee(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as AddEmployeeRequest;
    const token = reqBody.token;
    if (!checkToken(token) || reqBody.newEmployee === undefined) {
        const res: AddEmployeeResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const result: boolean = addNewEmployee(reqBody.newEmployee);
    const res: AddEmployeeResponse = { success: result };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function deleteEmployee(employeeId: string): boolean {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName("employees");
        if (sheet === null) {
            return false; // シートが存在しない
        }

        const values = sheet.getDataRange().getValues(); // 全行取得
        const headers = values[0] as string[];

        const idCol = headers.indexOf("id");
        if (idCol === -1) {
            return false; // id 列が存在しない
        }

        // 2行目以降を探索
        for (let row = 1; row < values.length; row++) {
            if (values[row] === undefined) continue;
            if (values[row]?.[idCol] === employeeId) { // HACK:
                sheet.deleteRow(row + 1); // GAS は1始まりなので +1
                return true;
            }
        }

        return false; // 見つからなかった
    } catch (err) {
        Logger.log("deleteEmployee error: " + err);
        return false;
    }
}

function handleDeleteEmployee(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as DeleteEmployeeRequest;
    const token = reqBody.token;
    if (!checkToken(token) || reqBody.employeeId === undefined) {
        const res: AddEmployeeResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const result: boolean = deleteEmployee(reqBody.employeeId);
    const res: AddEmployeeResponse = { success: result };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    try {
        const action = e.parameter.action || '';

        switch (action) {
            case 'login':
                return handleLogin(e);

            case 'checkToken':
                return handleTokenCheck(e);

            case 'getAllEmployees':
                return handleGetAllEmployees(e);

            case 'addEmployee':
                return handleAddEmployee(e);

            case 'deleteEmployee':
                return handleDeleteEmployee(e);

            // case 'auth':
            //     return handleAuth(e);
            //
            // case 'createAttendance':
            //     return createResponse(true, createAttendanceRecord(e));
            //
            // case 'updateAttendance':
            //     return createResponse(true, updateAttendanceRecord(e));
            //
            default:
                return createResponse(false, null, `POSTでサポートされていないアクション: ${action}`);
        }
    } catch (error: any) {
        console.error('doPost エラー:', error);
        return createResponse(false, null, error.toString());
    }
}

// 認証処理
function handleAuth(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    try {
        const postData = JSON.parse(e.postData?.contents || '{}') as AuthRequest;
        const { username, password } = postData;

        let authResult: AuthResponse;

        if (username === 'admin' && password === 'admin123') {
            authResult = {
                success: true,
                token: 'admin_token_' + new Date().getTime()
            };
        } else if (username === 'user' && password === 'user123') {
            authResult = {
                success: true,
                token: 'user_token_' + new Date().getTime()
            };
        } else {
            authResult = {
                success: false,
            };
        }

        return createResponse<AuthResponse>(true, authResult);
    } catch (error: any) {
        return createResponse<null>(false, null, '認証処理エラー: ' + error.toString());
    }
}

// 勤怠データ取得
function getAttendanceData(employeeId: string | null): AttendanceRecord[] {
    const records: AttendanceRecord[] = [
        {
            record_id: 'att_001',
            employee_id: '550e8400-e29b-41d4-a716-446655440101',
            check_in_time: '2024-03-15T08:00:00Z',
            check_out_time: '2024-03-15T17:00:00Z',
            work_area_id: 'area_forest_a',
            is_offline_entry: false,
            sync_time: '2024-03-15T17:05:00Z',
            created_at: '2024-03-15T08:00:00Z',
            updated_at: '2024-03-15T17:05:00Z'
        },
        {
            record_id: 'att_002',
            employee_id: '550e8400-e29b-41d4-a716-446655440102',
            check_in_time: '2024-03-15T08:30:00Z',
            check_out_time: null,
            work_area_id: 'area_forest_b',
            is_offline_entry: true,
            sync_time: null,
            created_at: '2024-03-15T08:30:00Z',
            updated_at: '2024-03-15T08:30:00Z'
        }
    ];

    return employeeId
        ? records.filter(record => record.employee_id === employeeId)
        : records;
}

// 活動データ取得
function getActivityData(employeeId: string | null): ActivityData[] {
    const activities: ActivityData[] = [
        {
            activity_id: 'act_001',
            record_id: 'att_001',
            employee_id: '550e8400-e29b-41d4-a716-446655440101',
            record_time: '2024-03-15T08:30:00Z',
            latitude: 35.6895,
            longitude: 139.6917,
            altitude: 150.5,
            heading: 45.0,
            acceleration_x: 0.1,
            acceleration_y: 0.2,
            acceleration_z: 9.8,
            activity_type: 'chainsaw_operation',
            is_synced: true,
            created_at: '2024-03-15T08:30:00Z'
        },
        {
            activity_id: 'act_002',
            record_id: 'att_001',
            employee_id: '550e8400-e29b-41d4-a716-446655440101',
            record_time: '2024-03-15T12:00:00Z',
            latitude: 35.6900,
            longitude: 139.6920,
            altitude: 148.2,
            heading: 90.0,
            acceleration_x: 0.05,
            acceleration_y: 0.03,
            acceleration_z: 9.79,
            activity_type: 'walking',
            is_synced: true,
            created_at: '2024-03-15T12:00:00Z'
        },
        {
            activity_id: 'act_003',
            record_id: 'att_002',
            employee_id: '550e8400-e29b-41d4-a716-446655440102',
            record_time: '2024-03-15T09:00:00Z',
            latitude: 35.6910,
            longitude: 139.6930,
            altitude: 155.0,
            heading: 180.0,
            acceleration_x: 0.2,
            acceleration_y: 0.1,
            acceleration_z: 9.75,
            activity_type: 'planting',
            is_synced: false,
            created_at: '2024-03-15T09:00:00Z'
        }
    ];

    return employeeId
        ? activities.filter(activity => activity.employee_id === employeeId)
        : activities;
}

// 作業エリアデータ取得
function getWorkAreaData(): WorkArea {
    return {
        area_id: 'area_forest_a',
        area_name: '森林A区域（間伐エリア）',
        coordinates: [
            [35.6895, 139.6917],
            [35.6900, 139.6920],
            [35.6898, 139.6925],
            [35.6893, 139.6922]
        ],
        description: '杉の間伐作業を行うエリア。急斜面注意。',
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
    };
}

// ジオフェンス取得（Rustクライアント互換）
function getGeofences(): any[] {
    return [
        {
            area_id: 'area_forest_a',
            area_name: '森林A区域',
            description: '杉の間伐作業エリア',
            coordinates: [
                { latitude: 35.6895, longitude: 139.6917 },
                { latitude: 35.6900, longitude: 139.6920 },
                { latitude: 35.6898, longitude: 139.6925 },
                { latitude: 35.6893, longitude: 139.6922 }
            ]
        },
        {
            area_id: 'area_forest_b',
            area_name: '森林B区域',
            description: 'ヒノキの植林エリア',
            coordinates: [
                { latitude: 35.6910, longitude: 139.6930 },
                { latitude: 35.6915, longitude: 139.6935 },
                { latitude: 35.6912, longitude: 139.6940 },
                { latitude: 35.6907, longitude: 139.6935 }
            ]
        }
    ];
}

// 打刻データ取得（Rustクライアント互換）
function getPunches(employeeId: string | null): any[] {
    const punches = [
        {
            punch_id: 'punch_001',
            employee_id: '550e8400-e29b-41d4-a716-446655440101',
            status: 'PunchIn',
            timestamp: '2024-03-15T08:00:00Z',
            area_id: 'area_forest_a'
        },
        {
            punch_id: 'punch_002',
            employee_id: '550e8400-e29b-41d4-a716-446655440101',
            status: 'PunchOut',
            timestamp: '2024-03-15T17:00:00Z',
            area_id: 'area_forest_a'
        },
        {
            punch_id: 'punch_003',
            employee_id: '550e8400-e29b-41d4-a716-446655440102',
            status: 'PunchIn',
            timestamp: '2024-03-15T08:30:00Z',
            area_id: 'area_forest_b'
        }
    ];

    return employeeId
        ? punches.filter(punch => punch.employee_id === employeeId)
        : punches;
}

// タスク取得（Rustクライアント互換）
function getTasks(employeeId: string | null): any[] {
    const tasks = [
        {
            task_id: 'task_001',
            assigned_employee_id: ['550e8400-e29b-41d4-a716-446655440101'],
            time_to_begin: '2024-03-16T09:00:00Z',
            tools_to_work: [
                { tool_id: 'tool_chainsaw_001', tool_type: 'Chainsaw', count_to_use: 1 }
            ],
            content_of_duty: '森林A区域での杉の間伐作業'
        },
        {
            task_id: 'task_002',
            assigned_employee_id: ['550e8400-e29b-41d4-a716-446655440102'],
            time_to_begin: '2024-03-16T10:00:00Z',
            tools_to_work: [
                { tool_id: 'tool_shovel_001', tool_type: 'Shovel', count_to_use: 2 }
            ],
            content_of_duty: '森林B区域でのヒノキ植林作業'
        }
    ];

    if (employeeId) {
        return tasks.filter(task =>
            task.assigned_employee_id.includes(employeeId)
        );
    }

    return tasks;
}

// 従業員日報取得（Rustクライアント互換）
function getEmployeeReports(employeeId: string | null): any[] {
    const reports = [
        {
            report_id: 'report_001',
            date: '2024-03-15',
            employee_id: '550e8400-e29b-41d4-a716-446655440101',
            destination: '森林A区域',
            tools_used: [
                { tool_id: 'tool_chainsaw_001', tool_type: 'Chainsaw', count_to_use: 1 }
            ],
            details: '杉の間伐作業実施。15本伐採完了。',
            activity_data: {
                data: [
                    {
                        date: '2024-03-15T08:30:00Z',
                        acceleration_of_phone: { x: 0.1, y: 0.2, z: 9.8 },
                        direction_of_compass: { angle: 45.0 }
                    }
                ]
            }
        }
    ];

    return employeeId
        ? reports.filter(report => report.employee_id === employeeId)
        : reports;
}

// 管理者日報取得（Rustクライアント互換）
function getAdminReports(): any[] {
    return [
        {
            report_id: 'admin_report_001',
            date: '2024-03-15',
            employee_id: '550e8400-e29b-41d4-a716-446655440999', // 管理者ID
            details: '本日の森林作業は予定通り進行。安全管理問題なし。'
        }
    ];
}

// 道具取得（Rustクライアント互換）
function getTools(): any[] {
    return [
        {
            tool_id: 'tool_chainsaw_001',
            tool_type: 'Chainsaw',
            count_to_use: 15
        },
        {
            tool_id: 'tool_shovel_001',
            tool_type: 'Shovel',
            count_to_use: 25
        },
        {
            tool_id: 'tool_helmet_001',
            tool_type: 'Safety_Helmet',
            count_to_use: 50
        }
    ];
}

// 勤怠レコード作成
function createAttendanceRecord(e: GoogleAppsScript.Events.DoPost): AttendanceRecord {
    const postData = JSON.parse(e.postData?.contents || '{}');

    const newRecord: AttendanceRecord = {
        record_id: 'att_' + new Date().getTime(),
        employee_id: postData.employee_id,
        check_in_time: new Date().toISOString(),
        check_out_time: null,
        work_area_id: postData.work_area_id,
        is_offline_entry: postData.is_offline_entry || false,
        sync_time: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    return newRecord;
}

// 勤怠レコード更新
function updateAttendanceRecord(e: GoogleAppsScript.Events.DoPost): AttendanceRecord {
    const postData = JSON.parse(e.postData?.contents || '{}');

    const updatedRecord: AttendanceRecord = {
        record_id: postData.record_id,
        employee_id: postData.employee_id,
        check_in_time: postData.check_in_time,
        check_out_time: new Date().toISOString(),
        work_area_id: postData.work_area_id,
        is_offline_entry: postData.is_offline_entry,
        sync_time: new Date().toISOString(),
        created_at: postData.created_at,
        updated_at: new Date().toISOString()
    };

    return updatedRecord;
}
