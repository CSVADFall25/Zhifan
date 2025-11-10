/**
 * ReadSHT1xValues
 *
 * Read temperature and humidity values from an SHT1x-series (SHT10,
 * SHT11, SHT15) sensor.
 *
 * Copyright 2009 Jonathan Oxer <jon@oxer.com.au>
 * www.practicalarduino.com
 */

#include <SHT1x.h>

// Specify data and clock connections and instantiate SHT1x object
#define dataPin  10
#define clockPin 11
#define buttonPin 7
SHT1x sht1x(dataPin, clockPin);

int button_pressed; 

void setup()
{
   Serial.begin(9600); // Open serial connection to report values to host
   Serial.println("Starting up");
   pinMode(buttonPin, INPUT);
}

void loop()
{
  float temp_c;
  float temp_f;
  float humidity;

  // Read values from the sensor
  temp_c = sht1x.readTemperatureC();
  temp_f = sht1x.readTemperatureF();
  humidity = sht1x.readHumidity();

  button_pressed = digitalRead(buttonPin);

  // Print the values to the serial port
  //Serial.print("Temperature: ");
  Serial.print(temp_c);
  Serial.print(",");
  Serial.print(humidity);
  Serial.print(",");
  Serial.println(button_pressed);
  //Serial.print(temp_f, DEC);
  //Serial.print("F. Humidity: ");
  //Serial.print(humidity);
  //Serial.println("%");

  delay(500);
}
