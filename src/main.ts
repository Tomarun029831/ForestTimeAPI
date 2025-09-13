'use strict';

import {
    ApiResponse, AuthResponse, WorkArea, Employee, TokenCheckRequest,
    TokenCheckResponse, GetAllEmployeesRequest, GetAllEmployeesResponse
    , AddEmployeeRequest, AddEmployeeResponse,
    DeleteEmployeeRequest, DeleteEmployeeResponse,
    AddWorkareaRequest,
    CircularGeoFence,
    AddWorkareaResponse,
    GetAllWorkareaRequest,
    GetAllWorkareaResponse,
    DeleteWorkareaRequest,
    DeleteWorkareaResponse,
    AuthRequest,
    GetEmployeeByIdRequest,
    GetEmployeeByIdResponse
} from "./type"

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

// login
function handleLogin(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput { // HACK: stub
    const reqBody = JSON.parse(e.postData?.contents || '{}') as AuthRequest;
    const username = reqBody.username;
    const password = reqBody.password;
    if (username === 'admin' && password === 'admin123') {
        const uuid = Utilities.getUuid();
        const response: AuthResponse = {
            success: true,
            token: uuid
        };
        return ContentService.createTextOutput(JSON.stringify(response))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const uuid = Utilities.getUuid();
    const response: AuthResponse = {
        success: false,
        token: uuid
    };
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

// Token
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

// Employee
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

function getEmployeeById(employeeId: string): Employee | undefined {
    const allEmployees = getAllEmployees();
    const employee = allEmployees.find(e => e.id === employeeId);
    return employee ?? undefined;
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
        const res: DeleteEmployeeResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const result: boolean = deleteEmployee(reqBody.employeeId);
    const res: DeleteEmployeeResponse = { success: result };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function getAllArea(): CircularGeoFence[] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("areas");

    if (sheet === null) {
        sheet = ss.insertSheet("areas");
        sheet.appendRow(["id", "name", "lat", "lng", "radius", "description", "color"]);
        return [];
    }

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];

    const headers = values[0] as string[];
    const rows = values.slice(1);

    return rows.map(row => {
        return {
            id: row[headers.indexOf("id")],
            name: row[headers.indexOf("name")],
            center: {
                lat: parseFloat(row[headers.indexOf("lat")]),
                lng: parseFloat(row[headers.indexOf("lng")]),
            },
            radius: parseFloat(row[headers.indexOf("radius")]),
            description: row[headers.indexOf("description")] || "",
            color: row[headers.indexOf("color")] || "#000000",
        } as CircularGeoFence;
    });
}

function handleGetAllWorkareas(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as GetAllWorkareaRequest;
    const token = reqBody.token;
    if (!checkToken(token)) {
        const res: GetAllWorkareaResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const res: GetAllWorkareaResponse = { success: true, areas: getAllArea() };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function handleGetEmployeeById(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as GetEmployeeByIdRequest;
    const token = reqBody.token;
    const employeeId = reqBody.id
    if (!checkToken(token) || employeeId === undefined) {
        const res: GetEmployeeByIdResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const employee = getEmployeeById(employeeId);
    if (employee === undefined) {
        const res: GetEmployeeByIdResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const res: GetEmployeeByIdResponse = { success: true, employee: employee };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function addNewArea(area: CircularGeoFence): boolean {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName("areas");

        if (sheet === null) {
            sheet = ss.insertSheet("areas");
            sheet.appendRow(["id", "name", "lat", "lng", "radius", "description", "color"]);
        }

        sheet.appendRow([
            area.id,
            area.name,
            area.center.lat,
            area.center.lng,
            area.radius,
            area.description,
            area.color,
        ]);

        return true;
    } catch (err) {
        Logger.log("addNewArea error: " + err);
        return false;
    }
}

function handleAddWorkarea(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    Logger.log(e.postData?.contents);
    const reqBody = JSON.parse(e.postData?.contents || '{}') as AddWorkareaRequest;
    const token = reqBody.token;
    if (!checkToken(token) || reqBody.area === undefined) {
        const res: AddWorkareaResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const result: boolean = addNewArea(reqBody.area);
    const res = { success: result };
    return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
}

function deleteArea(areaId: string): boolean {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName("areas");
        if (!sheet) return false;

        const values = sheet.getDataRange().getValues();
        const headers = values[0] as string[];
        const idCol = headers.indexOf("id");
        if (idCol < 0) return false;

        for (let row = 1; row < values.length; row++) {
            if (values[row]?.[idCol] === areaId) {
                sheet.deleteRow(row + 1);
                return true;
            }
        }
        return false;
    } catch (err) {
        Logger.log("deleteArea error: " + err);
        return false;
    }
}

function handleDeleteWorkarea(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    const reqBody = JSON.parse(e.postData?.contents || '{}') as DeleteWorkareaRequest;
    const token = reqBody.token;
    if (!checkToken(token) || reqBody.areaId === undefined) {
        const res: DeleteWorkareaResponse = { success: false };
        return ContentService.createTextOutput(JSON.stringify(res))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const result: boolean = deleteArea(reqBody.areaId);
    const res: DeleteWorkareaResponse = { success: result };
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
            case 'getEmployeeById':
                return handleGetEmployeeById(e);

            case 'getAllWorkareas':
                return handleGetAllWorkareas(e);
            case 'addWorkarea':
                return handleAddWorkarea(e);
            case 'deleteWorkarea':
                return handleDeleteWorkarea(e);

            default:
                return createResponse(false, null, `POSTでサポートされていないアクション: ${action}`);
        }
    } catch (error: any) {
        console.error('doPost エラー:', error);
        return createResponse(false, null, error.toString());
    }
}
