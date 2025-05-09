# RFID Attendance System - Setup Guide

This guide walks you through setting up your RFID attendance system with Google Sheets integration using an ESP32-S3 microcontroller.

## Hardware Setup

1. **Connect Components** according to the pinout diagram in the README.md:

   - Connect the RFID-RC522 module to the ESP32-S3:

     - SDA/SS → GPIO10
     - SCK → GPIO12
     - MOSI → GPIO11
     - MISO → GPIO13
     - RST → GPIO9
     - 3.3V → 3.3V
     - GND → GND

   - Connect the I2C LCD display to the ESP32-S3:

     - SDA → GPIO8
     - SCL → GPIO7
     - VCC → 5V
     - GND → GND

   - Connect the buzzer to the ESP32-S3:
     - Positive (+) → GPIO5
     - Negative (-) → GND

2. **Power the System**:
   - You can power the ESP32-S3 using a USB-C cable connected to a power source

## Software Setup

### Arduino Configuration

1. **Install Required Libraries**:

   - In Arduino IDE, go to Sketch > Include Library > Manage Libraries
   - Search for and install:
     - WiFi (included with ESP32 board installation)
     - SPI
     - MFRC522
     - LiquidCrystal_I2C
     - WiFiClientSecure (included with ESP32 board installation)
     - HTTPClient (included with ESP32 board installation)

2. **Install ESP32 Board Support**:

   - In Arduino IDE, go to File > Preferences
   - Add the following URL to the "Additional Boards Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to Tools > Board > Boards Manager
   - Search for "ESP32" and install "ESP32 by Espressif Systems"

3. **Configure the Arduino Code**:

   - Open `arduino/RFID_GoogleSheets/RFID_GoogleSheets.ino` in Arduino IDE
   - Modify the following variables:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";          // Your WiFi network name
     const char* password = "YOUR_WIFI_PASSWORD";  // Your WiFi password
     const char* scriptId = "YOUR_GOOGLE_SCRIPT_ID"; // ID from your deployed Google Apps Script
     ```
   - Update the RFID tag database with your own RFID tags:
     ```cpp
     struct {
       String uid;
       String name;
     } knownTags[] = {
       {"AA BB CC DD", "John Doe"},
       {"11 22 33 44", "Jane Smith"}
       // Add more tags here
     };
     ```

4. **Upload the Code**:
   - Select the correct board (ESP32S3 Dev Module) from Tools > Board > ESP32
   - Select the correct port from Tools > Port
   - Set the upload speed to 921600 baud (recommended for ESP32-S3)
   - Click on the Upload button

### Google Sheets Configuration

1. **Create a New Google Spreadsheet**:

   - Go to [Google Drive](https://drive.google.com)
   - Click New > Google Sheets
   - Rename the spreadsheet (e.g., "RFID Attendance System")

2. **Set Up Google Apps Script**:

   - In your Google Sheet, click on Extensions > Apps Script
   - Delete any code in the editor
   - Copy the entire code from `googlesheet/RFID_Attendance_WebApp.gs` and paste it into the editor
   - Replace `YOUR_SPREADSHEET_ID` with your actual spreadsheet ID:
     ```javascript
     const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
     ```
     (The Spreadsheet ID can be found in the URL of your Google Sheet: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`)

3. **Deploy as Web App**:

   - Save the project (name it something like "RFID Attendance System")
   - Click on Deploy > New deployment
   - Select type: Web app
   - Enter description: "RFID Attendance System"
   - Set "Who has access" to "Anyone" (this allows the ESP32-S3 to access it)
   - Click "Deploy"
   - Copy the Web app URL that appears (you'll need this for the Arduino code)

4. **Run Initial Setup**:

   - In the Apps Script editor, select the `setup` function from the dropdown
   - Click the Run button to create the necessary sheets and triggers

5. **Update Arduino Code with Web App URL**:
   - Go back to the Arduino IDE
   - Update the `scriptId` variable with the ID from your web app URL:
     ```cpp
     const char* scriptId = "YOUR_GOOGLE_SCRIPT_ID"; // Extract ID from the URL
     ```
     (The ID is the part between `/macros/s/` and `/exec` in the URL: `https://script.google.com/macros/s/SCRIPT_ID/exec`)

## Testing the System

1. **Power on the ESP32-S3**:

   - Connect it to a power source
   - The LCD should display initialization messages and eventually show "System Ready"

2. **Test RFID Scanning**:

   - Scan an authorized RFID tag/card
   - The LCD should display a welcome message and confirmation
   - The buzzer should sound a success tone
   - Check your Google Sheet to verify that the attendance was recorded

3. **Monitoring**:
   - The Dashboard sheet in your Google Spreadsheet will update hourly to show current attendance status
   - You can manually update it by running the `createDashboard` function in the Apps Script editor

## Troubleshooting

### ESP32-S3 Connection Issues

- Verify your WiFi credentials are correct
- Ensure your WiFi network is working
- Check serial monitor output for error messages (set baud rate to 115200)
- If you encounter bootloader issues, hold down the BOOT button while connecting USB

### RFID Reading Issues

- Make sure the RFID module is properly connected to the correct pins
- Verify that your RFID tags are listed in the `knownTags` array
- Try scanning the tag at different angles or distances
- Check if the MFRC522 module is receiving power (3.3V)

### Google Sheets Integration Issues

- Verify your script ID is correct
- Check that your web app is deployed and accessible
- Look for error messages in Apps Script logs (View > Logs)
- Ensure your ESP32-S3 has internet connectivity

## Advanced Customization

### Adding Additional Features

- **HTTPS Security**: Implement authentication tokens for more secure communication
- **Multiple Devices**: Set up multiple devices to report to the same Google Sheet
- **Data Visualization**: Create charts and graphs in Google Sheets to visualize attendance patterns
- **Deep Sleep Mode**: Implement ESP32-S3 deep sleep to conserve power when not in use

### Hardware Modifications

- Add an external antenna to the ESP32-S3 for extended WiFi range
- Implement a battery backup system using the ESP32-S3's low power modes
- Add an RGB LED for more detailed status indications
- Integrate with a TouchScreen display for interactive operation
