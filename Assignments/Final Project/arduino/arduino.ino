const int button1Pin = 2;     
const int button2Pin = 3;  
const int fsrPin     = A0;    

void setup() {
  Serial.begin(9600);

  pinMode(button1Pin, INPUT);
  pinMode(button2Pin, INPUT);
}

void loop() {

  int A = digitalRead(button1Pin); 
  int B = digitalRead(button2Pin);
  int C = analogRead(fsrPin);

  Serial.print("(");
  Serial.print(A);
  Serial.print(", ");
  Serial.print(B);
  Serial.print(", ");
  Serial.print(C);
  Serial.println(")");

  delay(50); 
}
