/**
 * RFID Attendance System - Google Sheets Integration
 *
 * This Google Apps Script serves as a web app to receive attendance data
 * from an ESP32-S3 RFID system and log it into a Google Sheet.
 */

// Spreadsheet ID - replace with your Google Sheet ID
const SPREADSHEET_ID = "1KD2fcuHudXhGhM4KW1OQ5JwCDvNQ8NLH6-dCXEb8PpI"; // Replace this with your actual Google Sheet ID
const SHEET_NAME = "Attendance_Log";

/**
 * Handle HTTP GET requests from the ESP32-S3
 */
function doGet(e) {
  try {
    // Get parameters from the request
    const tagId = e.parameter.tag;
    const name = e.parameter.name;

    // Validate required parameters
    if (!tagId || !name) {
      return ContentService.createTextOutput(
        "Error: Missing required parameters"
      );
    }

    // Log the attendance record
    const result = logAttendance(tagId, name);

    // Return response to ESP32-S3
    return ContentService.createTextOutput(result);
  } catch (error) {
    Logger.log("Error in doGet: " + error.toString());
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}

/**
 * Handle HTTP POST requests from the ESP32-S3
 */
function doPost(e) {
  try {
    let tagId, name;

    // Check if parameters are in URL parameters
    if (e.parameter) {
      tagId = e.parameter.tag;
      name = e.parameter.name;
    }
    // Check if parameters are in POST body
    else if (e.postData && e.postData.contents) {
      try {
        // Try to parse as JSON first
        const postData = JSON.parse(e.postData.contents);
        tagId = postData.tag;
        name = postData.name;
      } catch (parseError) {
        // If not JSON, try to parse as form data
        const formData = e.postData.contents.split("&");
        for (let i = 0; i < formData.length; i++) {
          const pair = formData[i].split("=");
          if (pair[0] === "tag") {
            tagId = decodeURIComponent(pair[1]);
          } else if (pair[0] === "name") {
            name = decodeURIComponent(pair[1]);
          }
        }
      }
    }

    // Validate required parameters
    if (!tagId || !name) {
      return ContentService.createTextOutput(
        "Error: Missing required parameters"
      );
    }

    // Log the attendance record
    const result = logAttendance(tagId, name);

    // Return response to ESP32-S3
    return ContentService.createTextOutput(result);
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}

/**
 * Logs the attendance record to the Google Sheet
 */
function logAttendance(tagId, name) {
  try {
    // Access the spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || createAttendanceSheet(ss);

    // Get current date and time
    const timestamp = new Date();

    // Format date and time
    const dateFormatted = Utilities.formatDate(
      timestamp,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
    const timeFormatted = Utilities.formatDate(
      timestamp,
      Session.getScriptTimeZone(),
      "HH:mm:ss"
    );

    // Check last entry for this tag to determine if this is Entry or Exit
    const status = determineEntryExitStatus(sheet, tagId);

    // Add new row with attendance data
    sheet.appendRow([
      timestamp, // Full timestamp
      dateFormatted, // Date only
      timeFormatted, // Time only
      tagId, // RFID Tag UID
      name, // Person's name
      status, // Entry or Exit
    ]);

    // Log the successful entry
    Logger.log("Attendance recorded: " + name + " (" + tagId + ") - " + status);

    return "Success: Attendance recorded for " + name + " (" + status + ")";
  } catch (error) {
    Logger.log("Error logging attendance: " + error.toString());
    return "Error: " + error.toString();
  }
}

/**
 * Creates a new attendance sheet with headers if it doesn't exist
 */
function createAttendanceSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEET_NAME);

  // Add headers
  sheet.appendRow(["Timestamp", "Date", "Time", "Tag ID", "Name", "Status"]);

  // Format headers
  sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
  sheet.setFrozenRows(1);

  // Auto-resize columns
  sheet.autoResizeColumns(1, 6);

  return sheet;
}

/**
 * Determines if this scan is an entry or exit
 */
function determineEntryExitStatus(sheet, tagId) {
  // Get all data from the sheet
  const data = sheet.getDataRange().getValues();

  // Skip header row and search from bottom to top for the last record of this tag
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][3] === tagId) {
      // Column 4 (index 3) contains Tag ID
      // If the last record was "Entry", this is "Exit", and vice versa
      return data[i][5] === "Entry" ? "Exit" : "Entry";
    }
  }

  // If no previous record found, default to "Entry"
  return "Entry";
}

/**
 * Creates a dashboard view of today's attendance
 */
function createDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Check if Dashboard sheet already exists
  let dashboardSheet = ss.getSheetByName("Dashboard");
  if (!dashboardSheet) {
    dashboardSheet = ss.insertSheet("Dashboard");
  } else {
    // Clear existing content (except headers)
    const lastRow = Math.max(dashboardSheet.getLastRow(), 1);
    if (lastRow > 1) {
      dashboardSheet
        .getRange(2, 1, lastRow - 1, dashboardSheet.getLastColumn())
        .clear();
    }
  }

  // Set up dashboard headers if it's a new sheet
  if (dashboardSheet.getLastRow() === 0) {
    dashboardSheet.appendRow(["Attendance Dashboard", "", "", "", "", ""]);
    dashboardSheet.appendRow(["Today's Date:", new Date(), "", "", "", ""]);
    dashboardSheet.appendRow(["", "", "", "", "", ""]);
    dashboardSheet.appendRow([
      "Name",
      "Tag ID",
      "Entry Time",
      "Exit Time",
      "Duration",
      "Status",
    ]);
    dashboardSheet.getRange(1, 1, 1, 6).merge();
    dashboardSheet.getRange(1, 1).setFontSize(16).setFontWeight("bold");
    dashboardSheet.getRange(4, 1, 1, 6).setFontWeight("bold");
    dashboardSheet.setFrozenRows(4);
  }

  // Get today's date in yyyy-MM-dd format
  const today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );

  // Get attendance data
  const attendanceSheet = ss.getSheetByName(SHEET_NAME);
  const attendanceData = attendanceSheet.getDataRange().getValues();

  // Filter for today's records and organize by person
  const personRecords = {};

  for (let i = 1; i < attendanceData.length; i++) {
    // Skip header row
    const row = attendanceData[i];
    const date = row[1]; // Date column
    const formattedDate = Utilities.formatDate(
      new Date(date),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    if (formattedDate === today) {
      const name = row[4]; // Name column
      const tagId = row[3]; // Tag ID column
      const time = row[2]; // Time column
      const status = row[5]; // Status column

      if (!personRecords[name]) {
        personRecords[name] = { tagId: tagId, entries: [] };
      }

      personRecords[name].entries.push({ time: time, status: status });
    }
  }

  // Add records to dashboard
  for (const name in personRecords) {
    const record = personRecords[name];
    let entryTime = "";
    let exitTime = "";
    let status = "Present";

    // Find first entry and last exit
    for (const entry of record.entries) {
      if (
        entry.status === "Entry" &&
        (entryTime === "" || entry.time < entryTime)
      ) {
        entryTime = entry.time;
      } else if (entry.status === "Exit" && entry.time > exitTime) {
        exitTime = entry.time;
      }
    }

    // Calculate duration if both entry and exit exist
    let duration = "";
    if (entryTime && exitTime) {
      // Parse times to calculate duration
      const entryParts = entryTime.split(":");
      const exitParts = exitTime.split(":");

      const entryDate = new Date();
      entryDate.setHours(entryParts[0], entryParts[1], entryParts[2], 0);

      const exitDate = new Date();
      exitDate.setHours(exitParts[0], exitParts[1], exitParts[2], 0);

      // Calculate difference in milliseconds
      const diff = exitDate - entryDate;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      duration = hours + "h " + minutes + "m";
      status = "Completed";
    } else if (entryTime && !exitTime) {
      status = "Present";
    } else {
      status = "Error";
    }

    // Add to dashboard
    dashboardSheet.appendRow([
      name,
      record.tagId,
      entryTime,
      exitTime,
      duration,
      status,
    ]);
  }

  // Format dashboard
  dashboardSheet.autoResizeColumns(1, 6);
}

/**
 * Trigger to update the dashboard every hour
 */
function setupTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "createDashboard") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create a new hourly trigger
  ScriptApp.newTrigger("createDashboard").timeBased().everyHours(1).create();

  // Also create a trigger to run at midnight to reset the dashboard for the new day
  ScriptApp.newTrigger("createDashboard")
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();
}

/**
 * Run this function manually to set up the spreadsheet and triggers
 */
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Create attendance sheet if it doesn't exist
  if (!ss.getSheetByName(SHEET_NAME)) {
    createAttendanceSheet(ss);
  }

  // Create initial dashboard
  createDashboard();

  // Set up triggers for automatic dashboard updates
  setupTriggers();

  return "Setup completed successfully";
}
