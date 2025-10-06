//This sketch is adapted from the given example PaletteExplorer

//Altered function: 
//1. Change color mode from RGB to HSB
//2. Alter the way to control a swatch's color: Hue-mouse moving in X, Saturation-mouse moving in Y, Brightness-mouse wheel*0.1
//3. After editting a swatch's color, a new swatch in random size and location will be generated on the canvas, whose color is the average color of the current swatches.
//4. Double-click to delete a swatch

//AI usage in this assignment:
//Chatgpt is used in this assignment for explaining the current code, providing possible solutions, and debugging. 
//ChatGPT has given advice on the functions double-click to delete, add new swatches, and create circular variable to calculate the average Hue

let swatch1;
let swatch2;
let swatch3; //initial swatches

let swatches = []; //array saving new swatches

let colorShift = false; //determin whether in the color changing process

function setup() {
  createCanvas(800, 800);

  swatch1 = new Swatch(100, 100, 500, 500);
  swatch2 = new Swatch(500, 100, 300, 100);
  swatch3 = new Swatch(400, 200, 200, 200);

  swatches.push(swatch1, swatch2, swatch3); //put the three new swatches into the swatch array
}

function draw() {
  colorMode(HSB, 360, 100, 100); //change colormode from RGB to HSV

  background(0, 0, 80);

  for (let i = 0; i < swatches.length; i++) {
    swatches[i].draw();
  } //draw the swatches in the array everyframe

  fill(0);
  text('click to select; drag to move; hold any key to edit color; mouse X-Hue,  mouse Y-Saturation; mouse wheel for brightness; double-click to delete selected',10, height-10);
}


function mousePressed() { 
  let hitAny = false;

  for (let i = swatches.length - 1; i >= 0; i--) {
    let s = swatches[i]; //go through all swatches from top to bottom, s is the swatch currently being manipulated
    if (s.hitTest(mouseX, mouseY)) { //if a swatch is selected
      deselectAllSwatches();  //make all swatches unselected first     
      s.selected = true; 
      hitAny = true;

      const picked = swatches.splice(i, 1)[0];
      swatches.push(picked);

      print("selected", swatches.length - 1);
      break;
    }
  }

  if (!hitAny) { //hitAny = false
    deselectAllSwatches(); 
  }
}

function keyPressed() {
  colorShift = true; //color is being changed
}

function keyReleased() {
  colorShift = false;
  AddSwatch(); //when key released, try to add a new swatch
}

function mouseReleased() {
  AddSwatch(); //when mouse released, try to add a new swatch
}

function mouseWheel(event) {
  let e = round(event.delta); // event.getCount() equivalent
  for (let i = 0; i < swatches.length; i++) {
    let s = swatches[i];
    if (s.selected) {
      if (colorShift) {
        s.updateColor(createVector(0, 0), e);
        pendingNewSwatch = true; //color changed, prepare to add a new swatch
      }
      return;
    }
  }
}

function mouseDragged() {
  let delta = createVector(mouseX - pmouseX, mouseY - pmouseY);
  for (let i = 0; i < swatches.length; i++) {
    let s = swatches[i];
    if (s.selected) {
      if (!colorShift) {
        s.moveBy(delta);
      } else {
        s.updateColor(delta, 0);
        pendingNewSwatch = true; //color changed, prepare to add a new swatch
      }
      return;
    }
  }
}

function deselectAllSwatches() {
  for (let i = 0; i < swatches.length; i++) {
    swatches[i].selected = false;
  }
}

//double click to delete a swatch
function doubleClicked() {
  for (let i = swatches.length - 1; i >= 0; i--) {
    let s = swatches[i]; //go through all the swatches from top to bottom
    if (s.selected && s.hitTest(mouseX, mouseY)) {
      swatches.splice(i, 1); //remove the swatch from array
      return false; 
    }
  }
  return false;
}

function AddSwatch() {
  if (pendingNewSwatch && !mouseIsPressed && !keyIsPressed) {
    let avgC = averageColorHSB(swatches);

    //create a new swatch in random size and location
    let w = random(50,350);
    let h = random(50,350);
    let x = random(10, width - w - 10);
    let y = random(10, height - h - 10);

    let nw = new Swatch(x, y, w, h); //define the new swatch
    nw.c = avgC; //let the average color become the new swatch's color
    swatches.push(nw); //add the new swatch into array

    pendingNewSwatch = false;
  }
}

//this function is suggested by ChatGPT; 
// use circular variable to avoid mistake in hue around 0 and 360
function averageColorHSB(arr) {
  if (arr.length === 0) return color(0, 0, 100); //arr.length = the number of swatches on the canvas

  let sumX = 0, sumY = 0, sumS = 0, sumB = 0;

  for (let i = 0; i < arr.length; i++) { 
    let c = arr[i].c; // c: color of the swatch
    let hRad = radians(hue(c));
    sumX += Math.cos(hRad);
    sumY += Math.sin(hRad);
    sumS += saturation(c);
    sumB += brightness(c);
  }

  let avgH = degrees(Math.atan2(sumY, sumX));
  if (avgH < 0) avgH += 360;
  let avgS = sumS / arr.length;
  let avgB = sumB / arr.length;

  return color(avgH, avgS, avgB);
}

// ---------------- Swatch Class ----------------

class Swatch {
  constructor(x, y, w, h) {
    this.pos = createVector(x, y);
    this.w = w;
    this.h = h;
    this.c = color(random(360), random(100), random(100));
    this.selected = false;
  }

  draw() {
    fill(this.c);
    rect(this.pos.x, this.pos.y, this.w, this.h);
    if (this.selected) {
      noFill();
      stroke(0);
      strokeWeight(2);
      rect(this.pos.x, this.pos.y, this.w, this.h);
      noStroke();
    }
  }

  hitTest(mx, my) {
    return (mx > this.pos.x && mx < this.pos.x + this.w &&
            my > this.pos.y && my < this.pos.y + this.h);
  }

  moveBy(delta) {
    this.pos.add(delta);
  }

  updateColor(delta, wheelDelta) {
    // Simple example: shift color channels
    let H = hue(this.c) + delta.x;
    let S = saturation(this.c) + delta.y;
    let B = brightness(this.c) + wheelDelta * 0.1;

    this.c = color(constrain(H, 0, 360),
                   constrain(S, 0, 100),
                   constrain(B, 0, 100));
  }
}
