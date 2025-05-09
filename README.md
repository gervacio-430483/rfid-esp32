# RFID Attendance System with Google Sheets Integration

## Overview

This project implements an automated attendance system using RFID technology with data storage in Google Sheets. The system reads RFID tags, displays status on an LCD screen, provides audio feedback via a buzzer, and logs attendance records to a Google Sheet in real-time.

## Hardware Components

- **ESP32-S3**: WiFi & Bluetooth enabled microcontroller
- **RFID-RC522**: 13.56MHz RFID reader/writer module
- **16x2 I2C LCD Display**: For user feedback and status information
- **Active Buzzer**: For audio feedback on successful/failed scans

## Software Requirements

- Arduino IDE
- Required libraries:
  - WiFi (ESP32)
  - SPI
  - MFRC522
  - LiquidCrystal_I2C
  - WiFiClientSecure
  - HTTPClient

## Setup Instructions

1. Install required libraries in Arduino IDE
2. Configure WiFi credentials in the code
3. Set up Google Sheets API and obtain credentials
4. Upload the code to ESP32-S3
5. Power the system and test RFID scanning

## Google Sheets Integration

The system connects to Google Sheets using Google Apps Script to log attendance data including:

- RFID Tag ID
- Timestamp
- Entry/Exit status

## Usage

1. Power on the system
2. Wait for "Ready to Scan" message on LCD
3. Scan RFID card/tag
4. System will display confirmation, sound the buzzer for feedback, and send data to Google Sheets

## Pinout Diagram

### ESP32-S3 to RFID-RC522 Connections

| ESP32-S3 | RFID-RC522 |
| -------- | ---------- |
| GPIO10   | SDA/SS     |
| GPIO12   | SCK        |
| GPIO11   | MOSI       |
| GPIO13   | MISO       |
| GPIO9    | RST        |
| 3.3V     | 3.3V       |
| GND      | GND        |

### ESP32-S3 to I2C LCD Display

| ESP32-S3 | LCD Display |
| -------- | ----------- |
| GPIO8    | SDA         |
| GPIO7    | SCL         |
| 5V       | VCC         |
| GND      | GND         |

### ESP32-S3 to Buzzer

| ESP32-S3 | Active Buzzer |
| -------- | ------------- |
| GPIO5    | + (Positive)  |
| GND      | - (Negative)  |

**Note:** Ensure all components are properly connected and verify the pinout before powering up the system.

## Documentation

For detailed instructions and code explanations, see the [Wiki](https://github.com/yourusername/rfid-gsheet/wiki).
