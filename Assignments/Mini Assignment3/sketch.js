/*
mini assignment3

This sketch is modified from the delaunay/voronoi example

left click to add a point
right click on an exisiting point to delete the point
hold shift and left click to color an area blue
hold shift and right click to cancel coloring

chatGPT is used in this assignment to debug the image upoad, image resize and mouse-click function 

*/


//image upload
let input;  
let img;
let imageReady = false; 
let x = 0, y = 0, w = 0, h = 0; 
//

let points = [];
let velocities = [];
let delaunay, voronoi;
let coloredCells = new Set();

function setup() {
  createCanvas(windowWidth, windowHeight);

// Upload button
createP("Upload an image:");
input = createFileInput(handleFile);
input.style('position','fixed');
input.style('left','12px');
input.style('top','12px');
input.style('z-index','9999');

  updateTriangulation();

}


function draw() {
  background(0);

 if (img && imageReady && w > 0 && h > 0) {
    image(img, x, y, w, h);
  } else {
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text("Upload an image to begin", width / 2, height / 2);
  }

  if (!voronoi || points.length === 0) return;

// Color a selected area
  noStroke();
  fill(0, 100, 255, 120);
  for (let i = 0; i < points.length; i++) {
    const key = keyFor(points[i]);
    if (!coloredCells.has(key)) continue;
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    beginShape();
    for (const [vx, vy] of poly) vertex(vx, vy);
    endShape(CLOSE);
  }

  // Draw Voronoi edges
  stroke(0, 255, 0, 180);
  strokeWeight(1);
  noFill();
  for (const cell of voronoi.cellPolygons()) {
    beginShape();
    for (const [vx, vy] of cell) vertex(vx, vy);
    endShape(CLOSE);
  }
 
  // Draw points
  noStroke();
  fill(255);
  for (const p of points) {
  const [px, py] = p;
  circle(px, py, 8);
  }

  drawInstructions();

}

function handleFile(file) {
  if (file.type === 'image') {
    imageReady = false;
    loadImage(file.data, loaded => {
      img = loaded;
      fitImageToCanvas();
      imageReady = true;
    }, err => {
      //when errors occur
      console.error('Image load error:', err);
      img = null;
      imageReady = false;
    });
  } else {
    img = null;
    imageReady = false;
  }
}

function fitImageToCanvas() {
  if (!img) return;
  const scale = min(width / img.width, height / img.height);
  w = img.width * scale;
  h = img.height * scale;
  x = (width - w) / 2;
  y = (height - h) / 2;
}

function mousePressed() {
  if (mouseButton === LEFT) {
    if (keyIsDown(SHIFT)) {
      colorCellAt(mouseX, mouseY, true);
    } else {
      points.push([mouseX, mouseY]);
      updateTriangulation();
    }
  } else if (mouseButton === RIGHT) {
    if (keyIsDown(SHIFT)) {
      colorCellAt(mouseX, mouseY, false);
    } else {
      deletePointNear(mouseX, mouseY);
    }
    return false;
  }
}

function colorCellAt(xi, yi, add) {
  if (!delaunay || points.length === 0) return;
  const i = delaunay.find(xi, yi);
  if (i == null) return;
  const key = keyFor(points[i]);
  if (add) coloredCells.add(key);
  else coloredCells.delete(key);
}

function deletePointNear(xi, yi) {
  if (!delaunay || points.length === 0) return;
  const i = delaunay.find(xi, yi);
  if (i == null) return;
  const [px, py] = points[i];
  if (dist(xi, yi, px, py) <= 10) {
    coloredCells.delete(keyFor(points[i]));
    points.splice(i, 1);
    updateTriangulation();
  }
}

function updateTriangulation() {
  if (points.length < 1) {
    delaunay = null;
    voronoi = null;
    return;
  }
  delaunay = d3.Delaunay.from(points);
  voronoi = delaunay.voronoi([0, 0, width, height]);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (img) {
    fitImageToCanvas(); // re-fit on resize
  }
  if (delaunay) {
    voronoi = delaunay.voronoi([0, 0, width, height]); // update bounds
  }
}

function keyFor(p) {
  return `${Math.round(p[0])},${Math.round(p[1])}`;
}

function drawInstructions() {
  noStroke();
  fill(255);
  textAlign(LEFT, BASELINE);
  textSize(14);
  text(
    'Left-click: add | Right-click: delete | Shift+Left: color | Shift+Right: uncolor',
    10, height - 10
  );
}

document.addEventListener('contextmenu', e => e.preventDefault());