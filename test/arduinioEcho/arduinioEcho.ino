
void setup()
{
  Serial.begin(9600);
}

void loop()
{
  if (Serial.available() > 0) {
    char inByte = Serial.read();
    Serial.write(toupper(inByte));               
  }
}

