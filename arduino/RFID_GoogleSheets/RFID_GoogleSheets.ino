/*
 * ESP32-S3 RFID Attendance System with Google Sheets Integration
 *
 * This sketch reads RFID tags using RC522 module, displays information on an I2C LCD,
 * provides audio feedback via buzzer, and sends attendance data to Google Sheets.
 *
 * Hardware Connections for ESP32-S3:
 * ---------------------------------
 * RFID-RC522:
 *   - SDA/SS   -> GPIO10
 *   - SCK      -> GPIO12
 *   - MOSI     -> GPIO11
 *   - MISO     -> GPIO13
 *   - RST      -> GPIO9
 *   - GND      -> GND
 *   - 3.3V     -> 3.3V
 *
 * I2C LCD (16x2):
 *   - SDA      -> GPIO8
 *   - SCL      -> GPIO7
 *   - VCC      -> 5V
 *   - GND      -> GND
 *
 * Buzzer:
 *   - Positive -> GPIO5
 *   - Negative -> GND
 *
 * System Workflow:
 * 1. Scans for RFID tags
 * 2. Checks if tag is authorized
 * 3. Provides feedback via LCD and buzzer
 * 4. Sends data to Google Sheets for logging
 *
 * Created: May 10, 2025
 * Author: [Your Name]
 * License: MIT
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <LiquidCrystal_I2C.h>

// WiFi credentials
const char *ssid = "ssid";     // Replace with your WiFi SSID
const char *password = "pass"; // Replace with your WiFi password

// Google Script ID - deploy your Google Apps Script as web app and get the ID
const char *scriptId = "AKfycbyPJiQ043nRKhXtGbzQ-qSKIpt54fZ_pLAPmkIeIHIJXSJCNEPgGsKfEniYlTKu358l"; // Replace with your Google Script ID

// RFID pins for ESP32-S3
#define SS_PIN 10 // SDA pin (GPIO10)
#define RST_PIN 9 // RST pin (GPIO9)
MFRC522 rfid(SS_PIN, RST_PIN);

// LCD setup (0x27 is the default I2C address, adjust if needed)
// ESP32-S3 default I2C pins: SDA (GPIO8), SCL (GPIO9)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Buzzer pin
#define BUZZER_PIN 5 // GPIO5

// Host for making HTTP request to Google Sheets
const char *host = "script.google.com";
const int httpsPort = 443;

// Maximum number of connection attempts
const int MAX_CONNECTION_ATTEMPTS = 3;

// Cooldown time between scans (milliseconds)
const unsigned long scanCooldown = 3000;
unsigned long lastScanTime = 0;

// Known tags database (replace with your actual RFID tag IDs and names)
struct
{
    String uid;
    String name;
} knownTags[] = {
    {"F6 A1 1B 03", "John Doe"},
    {"33 B1 2F 22", "Jane Smith"}
    // Add more authorized tags as needed
};

// Function prototypes
void connectWiFi();
bool isKnownTag(String tagId, String &name);
void sendToGoogleSheets(String tagId, String name);
void buzzerFeedback(bool success);
void displayMessage(String line1, String line2);
String urlEncode(String str);

void setup()
{
    Serial.begin(115200);

    // Initialize buzzer
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    // Initialize LCD
    lcd.init();
    lcd.backlight();
    displayMessage("Initializing", "System...");

    // Initialize SPI bus
    SPI.begin();

    // Initialize RFID reader
    rfid.PCD_Init();

    // Connect to WiFi
    connectWiFi();

    // Ready to scan
    displayMessage("System Ready", "Scan RFID Tag");

    Serial.println("System ready for scanning");
}

void loop()
{
    // Check if new RFID tag is present
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial())
    {
        unsigned long currentTime = millis();

        // Check if cooldown period has passed
        if (currentTime - lastScanTime > scanCooldown)
        {
            lastScanTime = currentTime;

            // Get RFID tag UID
            String tagId = "";
            for (byte i = 0; i < rfid.uid.size; i++)
            {
                tagId += (rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
                tagId += String(rfid.uid.uidByte[i], HEX);
            }
            tagId.toUpperCase();
            tagId = tagId.substring(1); // Remove leading space

            Serial.print("Tag detected: ");
            Serial.println(tagId);

            // Check if the tag is authorized
            String userName;
            if (isKnownTag(tagId, userName))
            {
                displayMessage("Welcome", userName);
                buzzerFeedback(true);

                // Send data to Google Sheets
                sendToGoogleSheets(tagId, userName);
            }
            else
            {
                displayMessage("Unauthorized", "Access Denied");
                buzzerFeedback(false);
            }

            // Reset back to ready state after a delay
            delay(2000);
            displayMessage("System Ready", "Scan RFID Tag");
        }

        // Stop reading
        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
    }

    // Maintain WiFi connection
    if (WiFi.status() != WL_CONNECTED)
    {
        connectWiFi();
    }
}

// Connect to WiFi network
void connectWiFi()
{
    displayMessage("Connecting to", ssid);
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20)
    {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("\nWiFi connected");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
        displayMessage("WiFi Connected", WiFi.localIP().toString());
        delay(1000);
    }
    else
    {
        Serial.println("\nWiFi connection failed");
        displayMessage("WiFi Failed", "Check Settings");
        delay(2000);
    }
}

// Check if the scanned tag is in the known tags database
bool isKnownTag(String tagId, String &name)
{
    for (int i = 0; i < sizeof(knownTags) / sizeof(knownTags[0]); i++)
    {
        if (tagId == knownTags[i].uid)
        {
            name = knownTags[i].name;
            return true;
        }
    }
    return false;
}

// Send attendance data to Google Sheets
void sendToGoogleSheets(String tagId, String name)
{
    WiFiClientSecure client;
    HTTPClient https;

    Serial.println("Connecting to Google Sheets...");
    displayMessage("Sending Data", "Please Wait...");

    // Use WiFiClientSecure without certificate validation for ESP32-S3
    client.setInsecure(); // Skip verification since fingerprints expire frequently

    // URL encode the parameters to handle spaces and special characters
    String encodedTagId = urlEncode(tagId);
    String encodedName = urlEncode(name);

    // Prepare URL and data - use GET method only since doGet is already deployed
    String url = "https://script.google.com/macros/s/" + String(scriptId) + "/exec";
    String payload = "tag=" + encodedTagId + "&name=" + encodedName;
    String fullUrl = url + "?" + payload;

    // Set follow redirects to true - critical for Google Apps Script
    https.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

    Serial.println("Sending GET request to Google Apps Script...");
    Serial.print("URL: ");
    Serial.println(fullUrl);

    if (https.begin(client, fullUrl))
    {
        // Send GET request
        int httpCode = https.GET();
        Serial.print("HTTP Response code: ");
        Serial.println(httpCode);

        // Handle response
        if (httpCode == HTTP_CODE_OK)
        {
            String response = https.getString();
            Serial.println("Response: " + response);
            displayMessage("Data Sent", "Successfully");
        }
        else
        {
            Serial.println("GET request failed");
            displayMessage("Send Failed", "Error: " + String(httpCode));

            // Try again after a delay
            delay(2000);
            httpCode = https.GET();
            if (httpCode == HTTP_CODE_OK)
            {
                String response = https.getString();
                Serial.println("Retry successful!");
                displayMessage("Data Sent", "After Retry");
            }
            else
            {
                displayMessage("Send Failed", "After Retry");
            }
        }
        https.end();
    }
    else
    {
        Serial.println("Unable to connect to server");
        displayMessage("Server Connect", "Failed");
    }
}

// URL encode a string (replace spaces with %20 and other special characters)
String urlEncode(String str)
{
    String encodedString = "";
    char c;
    char code0;
    char code1;
    for (int i = 0; i < str.length(); i++)
    {
        c = str.charAt(i);
        if (c == ' ')
        {
            encodedString += '+';
        }
        else if (isAlphaNumeric(c))
        {
            encodedString += c;
        }
        else
        {
            // Convert special characters to hex format
            code1 = (c & 0xf) + '0';
            if ((c & 0xf) > 9)
                code1 = (c & 0xf) - 10 + 'A';
            c = (c >> 4) & 0xf;
            code0 = c + '0';
            if (c > 9)
                code0 = c - 10 + 'A';
            encodedString += '%';
            encodedString += code0;
            encodedString += code1;
        }
    }
    return encodedString;
}

// Audio feedback based on scan result
void buzzerFeedback(bool success)
{
    if (success)
    {
        // Success tone: one long beep
        digitalWrite(BUZZER_PIN, HIGH);
        delay(200);
        digitalWrite(BUZZER_PIN, LOW);
    }
    else
    {
        // Error tone: three short beeps
        for (int i = 0; i < 3; i++)
        {
            digitalWrite(BUZZER_PIN, HIGH);
            delay(100);
            digitalWrite(BUZZER_PIN, LOW);
            delay(100);
        }
    }
}

// Display message on LCD
void displayMessage(String line1, String line2)
{
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
}