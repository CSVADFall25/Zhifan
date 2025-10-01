function setup() {
  createCanvas(400, 400);

  background(244, 214, 181);

  //eyes
  strokeWeight(5);

  fill(185, 140, 90);

  ellipse(100, 150, 120, 80);

  ellipse(300, 150, 120, 80);

  //eyebrows
  noFill();

  strokeWeight(10);

  arc(100, 100, 130, 30, PI, TWO_PI);

  arc(300, 100, 130, 30, PI, TWO_PI);

  //eyes line
  strokeWeight(5);

  line(50, 150, 150, 150);

  line(250, 150, 350, 150);

  //book
  fill(255, 255, 255);

  rect(0, 300, 200, 200, 0, 40, 10, 10);

  rect(200, 300, 200, 200, 40, 0, 10, 10);

  fill(123, 158, 109);

  rect(0, 325, 200, 200, 0, 40, 10, 10);

  rect(200, 325, 200, 200, 40, 0, 10, 10);

  //nose
  fill(231, 150, 134);

  triangle(200, 100, 175, 200, 225, 200);

  //beard
  fill(62, 47, 35);

  rect(130, 190, 140, 80, 40, 40, 10, 10);

  line(160, 220, 160, 270);

  line(200, 220, 200, 270);

  line(240, 220, 240, 270);

  //hair
  fill(62, 47, 35);
  strokeWeight(5);
  bezier(30, 0, 20, 50, 70, 70, 300, 0);

  //eyeglasses
  strokeWeight(5);
  erase(150, 255);
  circle(120, 200, 120);
  circle(280, 200, 120);

  noFill();
  strokeWeight(10);
  arc(200, 150, 90, 30, PI, TWO_PI);
}

function draw() {}
