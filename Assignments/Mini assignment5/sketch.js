//This sketch connects the temperature, humidity, and button data from Arduino (sensor: SHT-10) to a p5.js sketch that displays fish on the screen through websocket server.
//temperature controls fish color saturation (higher temp = more saturated colors)
//humidity controls number of fish (higher humidity = more fish)
//button press removes one fish from the screen


// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:8765');
let bgHue = 180; //cyan background!
let prevButton = 0;
let fishnum = 10; // starts with 10 fish
let fishsat = 0; // starts with no saturation
let fishArray = []; //storing all fish objects
let fish;

//--- WebSocket event handlers ---
// connection opened
socket.addEventListener('open', function (event) {
    socket.send('Hello Server!');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server ', event.data);

    let types = event.data.split(",");
    if (types.length > 2){
      let temp = float(types[0]);
      let humid = float(types[1]);
      let button = int(types[2]); // 0/1 for not pressed/pressed
      
      // Generate fish with the received data
      generateFish(temp, humid);
      removeFish(button);
    }
});

//--- p5.js code ---

function setup() {
  createCanvas(windowWidth, windowHeight);
  fishArray = []; 

  //generateFish(20, 50); // Initial fish generation
}


function draw() {
  colorMode(HSB, 360, 100, 100);
  background(bgHue, 100, 100);

  // Draw all fish in the array
  for (let fish of fishArray) {
    fish.drawFish();
  }
}


function generateFish(temp, hum) {
  fishArray = [];
  let fishnum = int(map(hum, 0, 100, 1, 30));
  let fishsat = int(map(temp, 20, 40, 0, 200));

  for (let i = 0; i < fishnum; i++) {
    let randomX = random(width);
    let randomY = random(height);
    let randomSize = random(20, 60);
    let randomAngle = random([0, PI]);
    
    let color1 = color(0, fishsat, 100);    // Red
    let color2 = color(200, fishsat, 100);  // Blue
    
    fishArray.push(new Fish(randomX, randomY, randomSize, [color1, color2], randomAngle));
  }
}

function removeFish(button) {
  if (button == 1 && prevButton == 0 && fishArray.length > 0) {
    fishArray.pop();
  }
  prevButton = button;
}



//--------Class-----------

class Fish {
  constructor(x, y, r, colors, angle) {
    this.pos = createVector(x, y);
    this.r = r;
    this.colors = colors;
    this.angle = angle;
    this.tailAngle = -PI/6;
  }

  drawFish() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    // Draw body
    noStroke();
    fill(this.colors[0]);
    
    // Main body using bezier curves
    beginShape();
    vertex(-this.r, 0);
    bezierVertex(
      -this.r, -this.r/2,  // control point 1
      this.r/2, -this.r/2,  // control point 2
      this.r, 0           // endpoint
    );
    bezierVertex(
      this.r/2, this.r/2,   // control point 1
      -this.r, this.r/2,    // control point 2
      -this.r, 0           // endpoint
    );
    endShape(CLOSE);

    // tail
    push();
    translate(-this.r, 0);
    rotate(this.tailAngle);
    fill(this.colors[1]);
    triangle(0, 0, -this.r/2, -this.r/2, -this.r/2, this.r/2);
    pop();
    

    // Eye
    fill(255);
    ellipse(this.r/2, -this.r/6, this.r/4);
    fill(0);
    ellipse(this.r/2, -this.r/6, this.r/8);

    pop();
  }

}
