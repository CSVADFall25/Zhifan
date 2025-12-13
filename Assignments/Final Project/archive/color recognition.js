//tps://www.youtube.com/watch?v=Joy4NQPIOxk

let video;

let tolerance = 20;

let colorToMatch;

function setup() {
  console.log("Setup started");
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  colorToMatch = color(0, 255, 0); // Purple color to match
  console.log("Setup completed");
}

function draw() {
  if (!video) {
    console.log("Video not initialized");
    return;
  }
  
  image(video, 0, 0);

  let firstPx = findcolor(video, colorToMatch, tolerance);
  
  if(firstPx !== null && firstPx !== undefined) {
    fill(colorToMatch);
    stroke(255);
    strokeWeight(2);
    circle(firstPx.x, firstPx.y, 30);
  }
}

function findcolor(input, c, tolerance) {
  if (input.width === 0 || input.height === 0) {
    return null;
  }

  let matchR = c[0];
  let matchG = c[1];
  let matchB = c[2];

  input.loadPixels();

  // Sample every 5 pixels for better performance
  const step = 5;
  for (let y = 0; y < input.height; y += step) {
    for (let x = 0; x < input.width; x += step) {
      let index = (x + y * input.width) * 4;
      let r = input.pixels[index + 0];
      let g = input.pixels[index + 1];
      let b = input.pixels[index + 2];

      if (abs(r - matchR) <= tolerance 
        && abs(g - matchG) <= tolerance 
        && abs(b - matchB) <= tolerance) {
        return createVector(x, y);
      }
    }
  }
  return null;
}


function mousePressed() {
  loadPixels();
  colorToMatch = get(mouseX, mouseY);
}