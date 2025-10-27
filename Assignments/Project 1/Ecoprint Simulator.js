/*
***Still in development***


choose one season, each season is combined with a set of plants and a color palette


random generate plants (springs:flowers, summer:broad leaves, fall:maples, winter: pines(TBD))


plants fall to the bottom of the canvas, with 15 plants at maximum


mouse left click to drag a plant on the print area


left click one plant and press +- to rotate


plant imprint its color, as time passes, the longer the plant stays still on the print area, the darker the imprint gets


hold delete/backspace key and left click a plant to remove it




references:


maple generator revised from https://openprocessing.org/sketch/1681353


--- IGNORE ---
todo:
2. create broadleaf class
3. create pine class
4. add title and instructions
5. imprint shape do not exceed the print area boundary
6.improve the canvas bg color blending mode and add textures


*/




//color palette
const SpringPalette = [
   "#fff3faff",
   "#ffafdbff",
   "#e8729fff",
   "#e25088",
   "#b468cbff",
   "#7a71ddff",
   "#aac5eeff",
   "#a33030ff",
   "#3d22c0ff",
];




const SummerPalette = [
   "#c6eb56ff",
   "#86ed67ff",
   "#0bb747ff",
   "#048e2bff",
   "#afe151ff",
   "#c0ec3cff",
   "#86b314ff",
   "#186824ff",
   "#023014ff",
];




const FallPalette = [
   "#feebe1",
   "#d97645",
   "#f6d251ff",
   "#e25088",
   "#d81354",
   "#ec423c",
   "#495829ff",
   "#68182d",
   "#4f171a",
];




const WinterPalette = [
   "#bbcaeeff",
   "#514c61ff",
   "#575460ff",
   "#474864ff",
   "#5e6e71ff",
   "#747887ff",
   "#1b1d2fff",
   "#28312dff",
   "#36483cff",
];


//----------------------------global variables-----------------------------------
const MAX_SETTLED_PLANTS = 15;
const PlantGenerationDelay = 0;


let activePlant = null;
let settledPlant = [];
let nextPlantAt = 0;
let groundY;


let printArea;


let imprintLayer;




//UI
let clearBtn;


let seasonBtns = {};
let currentPalette = FallPalette; // default
let currentSeason = 'Fall';






//---------------------------P5.js functions--------------------------------
function setup() {
   createCanvas(windowWidth, windowHeight);
   myPicker = createColorPicker('white');
   myPicker.position(0.95 * width, 0.1*height-15);




   //clear canvas button
   clearBtn = createButton('CLEAR CANVAS');
   clearBtn.position(20, 0.1*height-25);
   clearBtn.style('padding', '6px 8px');
   clearBtn.style('font-size', '14px');
   clearBtn.mousePressed(() => clearPrintAreaImprints());


   // season buttons
   const seasons = ['Spring', 'Summer', 'Fall'];
   let sx = 160;
   for (let i = 0; i < seasons.length; i++) {
       const s = seasons[i];
       const btn = createButton(s);
       btn.position(sx + i * 100, 0.1*height-25);
       btn.style('padding', '6px 12px');
       btn.style('font-size', '14px');
       btn.style('background-color', 'transparent');
       btn.style('color', '#cdcdcdff');
       btn.style('cursor', 'pointer');
       btn.mousePressed(() => selectSeason(s));
       seasonBtns[s] = btn;
   }
   selectSeason('Fall');


   //plant falling
   groundY = height - 40; //groudn y position


   // inline scheduleNextPlant(0)
   nextPlantAt = millis() + 0;


   //imprint
   printArea = { x: width / 2, y: height / 2 - 68, w: width, h: 1.8 * height / 3 };


   imprintLayer = createGraphics(width, height);
   imprintLayer.clear();
}



function draw() {
   background(0);


   fill(255);
   noStroke();
   textAlign(LEFT, CENTER);
   textSize(36);
   text("Ecoprint Simulator", 20, 30);


   textSize(14);
   text("Drag a plant to imprint on canvas | Click and press +/- to rotate | Press 'delete' and click to remove a plant", 350, 30);
   textAlign(RIGHT, CENTER);
   text("Change canvas color", 0.95 * width - 20, 0.1*height);


   stroke(10);
   let c = myPicker.color();
   fill(c);
   rectMode(CENTER);
   rect(printArea.x, printArea.y, printArea.w, printArea.h);


   image(imprintLayer, 0, 0);


   //draw settled plants
   for (const plant of settledPlant) {
       const inside = isInPrintArea(plant.pos.x, plant.pos.y);
       if (inside && !plant._tracking) attachImprintTracking(plant);
       if (!inside && plant._tracking) { plant._tracking = false; }


       if (plant._tracking) updateDwellAndStamp(plant);


       plant.drwRdmMaple();
   }


   //generate new plant
   if (!activePlant && millis() >= nextPlantAt && settledPlant.length <= MAX_SETTLED_PLANTS) {
       activePlant = generateAPlant();
   }


   //active plant falling motion
   if (activePlant) {
       activePlant.pos.y += activePlant.speedY;
       activePlant.pos.x = activePlant.baseX + activePlant.swayAmp * Math.sin(frameCount * 0.05);
       activePlant.angle += activePlant.angleVel;


       activePlant.drwRdmMaple();


       const landingY = groundY - activePlant.r * 0.2;


       if (activePlant.pos.y >= landingY) {


           activePlant.pos.y = landingY;
           activePlant.angleVel = 0;
           activePlant.speedY = 0;


           settledPlant.push(activePlant);
           activePlant = null;


           nextPlantAt = millis() + PlantGenerationDelay;
       }
   }




   rotationKeyPressed()
}


//-----------------------------------plant generation--------------------------------
function generateAPlant() {


   //make 2 colors random from current palette
   const colors = shuffle(currentPalette.slice(), true).slice(0, 2);
   const r = random(180, 350);


   //initial location
   const startX = random(width);
   const startY = -r;




   //generate plant from season
   let plant;
   if (currentSeason === 'Spring') {
       plant = new Flower(startX, startY, r, colors, random(-PI / 10, PI / 10)) || new Maple(startX, startY, r, colors, random(-PI / 10, PI / 10));
   }
   // else if (currentSeason === 'Summer') {
   //     plant = new BroadLeaves(startX, startY, r, colors, random(-PI / 10, PI / 10)) || new Maple(startX, startY, r, colors, random(-PI / 10, PI / 10));
   // }
   //else if (currentSeason === 'Winter') {
    //   plant = new Pine(startX, startY, r, colors, random(-PI / 10, PI / 10));
   //}
   else { // Fall
       plant = new Maple(startX, startY, r, colors, random(-PI / 10, PI / 10)); // || new BroadLeaves(startX, startY, r, colors, random(-PI / 10, PI / 10));
   }




   // Falling parameters
   plant.speedY = random(5.0, 8.0);
   plant.baseX = startX;
   plant.swayAmp = random(0.5, 2.0);
   plant.angleVel = random(-0.004, 0.004);




   return plant;


}






//-----------------------------------mouse interaction--------------------------------


function mouseDragged() {
   let delta = createVector(mouseX - pmouseX, mouseY - pmouseY);
   for (let i = 0; i < settledPlant.length; i++) {
       let s = settledPlant[i];
       if (s.selected) {
           s.moveBy(delta);
           return;
       }
   }
}




function mousePressed() {
// Deletion
   const deleteHeld = keyIsDown(46) || keyIsDown(8) || keyIsDown(127);


   if (deleteHeld) {
       for (let i = settledPlant.length - 1; i >= 0; i--) {
           if (settledPlant[i].hitTest(mouseX, mouseY)) {
               settledPlant.splice(i, 1);
               return;
           }
       }
      
       return;
   }


   // Selection
   for (let i = settledPlant.length - 1; i >= 0; i--) {
       let s = settledPlant[i];
       if (s.hitTest(mouseX, mouseY)) {
           deselectAllPlants();
           s.selected = true;
           return;
       }
   }


   deselectAllPlants();
}




function deselectAllPlants() {
   for (let i = 0; i < settledPlant.length; i++) {
       settledPlant[i].selected = false;
   }
}




function mouseReleased() {
   deselectAllPlants();
}




function rotationKeyPressed() {
   // find topmost selected plant
   let rotationPlant = null;
   for (let i = settledPlant.length - 1; i >= 0; i--) {
       if (settledPlant[i].selected) {
           rotationPlant = settledPlant[i];
           break;
       }
   }


   if (!rotationPlant) return;


   const rotSpeed = 0.02;


   // '-' key
   if (keyIsDown(189) || keyIsDown(109)) rotationPlant.angle -= rotSpeed;
   //  '+' key
   if (keyIsDown(187) || keyIsDown(107)) rotationPlant.angle += rotSpeed;
}



//-----------------------------------imprint tracking and stamping--------------------------------
// I consulted ChatGPT for help with this section.


function isInPrintArea(x, y) {
   const halfW = printArea.w * 0.5;
   const halfH = printArea.h * 0.5;
   return (
       x >= printArea.x - halfW &&
       x <= printArea.x + halfW &&
       y >= printArea.y - halfH &&
       y <= printArea.y + halfH
   );
}



// when a plant first comes to rest inside the print area, attach tracking data
function attachImprintTracking(plant) {
   plant._prevX = plant.pos.x;
   plant._prevY = plant.pos.y;
   plant._prevAngle = plant.angle;
   plant._dwellMs = 0;
   plant._stampedHere = false;
   plant._tracking = true;
   // accumulated alpha already stamped for this dwell session (0..255)
   plant._imprintAccum = 0;
}



function updateDwellAndStamp(plant) {


   const dwellRequiredMs = 2000;


   // If the user is pressing the mouse, reset dwell tracking
   if (mouseIsPressed) {
       plant._dwellMs = 0;
       plant._stampedHere = false;
       // keep any previous imprint accumulation so we don't erase existing imprints
       plant._imprintAccum = plant._imprintAccum || 0;
       plant._prevX = plant.pos.x;
       plant._prevY = plant.pos.y;
       plant._prevAngle = plant.angle;
       return;
   }


   // detect small motion (tolerance) — if moving, reset dwell
   const moveThreshPx = 0.6;
   const angleThresh = 0.004;
   const dx = Math.abs(plant.pos.x - (plant._prevX || plant.pos.x));
   const dy = Math.abs(plant.pos.y - (plant._prevY || plant.pos.y));
   const da = Math.abs(plant.angle - (plant._prevAngle || plant.angle));
   const moving = dx > moveThreshPx || dy > moveThreshPx || da > angleThresh;


   if (moving) {
       plant._dwellMs = 0;
       plant._stampedHere = false;
       plant._imprintAccum = plant._imprintAccum || 0;
   } else {
       // accumulate dwell time up to a reasonable max
       const maxDwell = dwellRequiredMs * 4;
       plant._dwellMs = Math.min((plant._dwellMs || 0) + deltaTime, maxDwell);


       // compute desired accumulated alpha from dwell time
       const clamped = constrain(plant._dwellMs, 0, maxDwell);
       const progress = map(clamped, dwellRequiredMs, maxDwell, 0, 1);
       const minA = 6, maxA = 140;
       const desiredAlpha = lerp(minA, maxA, constrain(progress, 0, 1));


       const already = plant._imprintAccum || 0;
       const incremental = desiredAlpha - already;
       if (incremental > 1) {
           // smaller increments for smoother buildup
           const rel = incremental / 512;
           stampPlantToImprint(plant, rel);
           plant._imprintAccum = already + incremental;
           plant._stampedHere = true;
       }
   }


   plant._prevX = plant.pos.x;
   plant._prevY = plant.pos.y;
   plant._prevAngle = plant.angle;
}




function stampPlantToImprint(plant, relAlpha = 1) {


   const pad = Math.ceil(plant.r * 1.4);
   const sz = pad * 2;


   let pg = plant._stampPg;
   if (!pg) {
       pg = createGraphics(sz, sz);
       const ctx = pg.drawingContext;
       if (typeof ctx.imageSmoothingEnabled !== 'undefined') ctx.imageSmoothingEnabled = true;
       else if (typeof ctx.webkitImageSmoothingEnabled !== 'undefined') ctx.webkitImageSmoothingEnabled = true;
       else if (typeof ctx.mozImageSmoothingEnabled !== 'undefined') ctx.mozImageSmoothingEnabled = true;


       const cfg = plant.cfgMain ?? (plant.cfgMain = plant.makePieceConfig(plant.r));
       const tipY = -plant.r * cfg.tipScale;
       const cTop = color(plant.colors[0]);
       const cBot = color(plant.colors[1]);
       const cMid = lerpColor(cTop, cBot, 0.5);
       const gd = ctx.createLinearGradient(0, 0, 0, tipY);
       gd.addColorStop(0.00, cBot.toString());
       gd.addColorStop(0.50, cMid.toString());
       gd.addColorStop(1.00, cTop.toString());
       ctx.fillStyle = gd;
       ctx.strokeStyle = 'rgba(0,0,0,0)';
       ctx.lineWidth = 0;


       ctx.save();
       ctx.translate(pad, pad);


       function drawPiecePath(r, cfgPiece) {
           const x3 = 0;
           const y3 = -r * cfgPiece.tipScale;
           const x1 = Math.cos(cfgPiece.a1) * cfgPiece.r1;
           const y1 = Math.sin(cfgPiece.a1) * cfgPiece.r1;
           const x2 = x3 + Math.cos(cfgPiece.a2) * cfgPiece.r2;
           const y2 = y3 + Math.sin(cfgPiece.a2) * cfgPiece.r2;
           const a4 = Math.PI - cfgPiece.a1;
           const x4 = Math.cos(a4) * cfgPiece.r1;
           const y4 = Math.sin(a4) * cfgPiece.r1;
           ctx.beginPath();
           ctx.moveTo(0, 0);
           ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
           ctx.bezierCurveTo(x2, y2, x4, y4, 0, 0);
           ctx.closePath();
           ctx.fill();
       }


       if (plant.constructor && plant.constructor.name === 'Flower') {
           function drawFlowerPetal(r, cfgPiece) {
               const x0 = 0, y0 = 0;
               const x3 = x0;
               const y3 = y0 - r * cfgPiece.tipScale;
               const x1 = x0 + Math.cos(cfgPiece.a1) * cfgPiece.r1;
               const y1 = y0 + Math.sin(cfgPiece.a1) * cfgPiece.r1;
               const x2 = x3 + Math.cos(cfgPiece.a2) * cfgPiece.r2;
               const y2 = y3 ;
               const a5 = Math.PI - cfgPiece.a1;
               const x5 = x0 + Math.cos(a5) * cfgPiece.r1;
               const y5 = y0 + Math.sin(a5) * cfgPiece.r1;
               const a4 = Math.PI - cfgPiece.a2;
               const x4 = x3 + Math.cos(a4) * cfgPiece.r2;
               const y4 = y3;
               ctx.beginPath();
               ctx.moveTo(x0, y0);
               ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
               ctx.bezierCurveTo(x4, y4, x5, y5, x0, y0);
               ctx.closePath();
               ctx.fill();
           }
           drawFlowerPetal(plant.r, cfg);
           const petals = cfg.petalnumber || 6;
           for (let i = 1; i < petals; i++) { ctx.save(); ctx.rotate(i * Math.PI * 2 / petals); drawFlowerPetal(plant.r, cfg); ctx.restore(); }
           ctx.beginPath(); ctx.arc(0, 0, cfg.r0, 0, Math.PI * 2); ctx.closePath(); ctx.fill();
       }
      
       //if (plant.constructor && plant.constructor.name === 'BroadLeaves')
       //if (plant.constructor && plant.constructor.name === 'Pine')
      
       else {
           drawPiecePath(plant.r, cfg);
           ctx.save(); ctx.rotate(-Math.PI * 0.25); drawPiecePath(plant.r * 0.8, cfg); ctx.restore();
           ctx.save(); ctx.rotate(Math.PI * 0.25); drawPiecePath(plant.r * 0.8, cfg); ctx.restore();
           ctx.save(); ctx.rotate(-Math.PI * 0.48); drawPiecePath(plant.r * 0.8, cfg); ctx.restore();
           ctx.save(); ctx.rotate(Math.PI * 0.48); drawPiecePath(plant.r * 0.8, cfg); ctx.restore();
           ctx.beginPath(); ctx.moveTo(0, -plant.r * 0.5); ctx.lineTo(-plant.r * 0.015, plant.r * 0.35); ctx.lineTo(plant.r * 0.015, plant.r * 0.35); ctx.closePath(); ctx.fill();
       }
       ctx.restore();
       plant._stampPg = pg;
   }


   const cTop = color(plant.colors[0]);
   const cBot = color(plant.colors[1]);
   const avgColor = lerpColor(cTop, cBot, 0.5);
   const br = 0.299 * red(avgColor) + 0.587 * green(avgColor) + 0.114 * blue(avgColor);
   const maxAllowedAlpha = map(br, 0, 255, 60, 220);


   imprintLayer.push();
   imprintLayer.blendMode(MULTIPLY);
   const passes = 4;
   for (let k = 0; k < passes; k++) {
       imprintLayer.push();
       imprintLayer.translate(plant.pos.x, plant.pos.y);
       imprintLayer.rotate(plant.angle + random(-0.05, 0.05));
       imprintLayer.scale(1 + random(0.02, 0.08));
       const passAlpha = constrain(20 * relAlpha, 3, 60);
       imprintLayer.tint(255, passAlpha);
       imprintLayer.image(plant._stampPg, -pad, -pad);
       imprintLayer.pop();
   }


   imprintLayer.blendMode(BLEND);
   imprintLayer.push();
   imprintLayer.translate(plant.pos.x, plant.pos.y);
   imprintLayer.rotate(plant.angle);
   const mainAlpha = constrain(120 * relAlpha, 8, maxAllowedAlpha);
   imprintLayer.tint(255, mainAlpha);
   imprintLayer.image(plant._stampPg, -pad, -pad);
   imprintLayer.pop();


   imprintLayer.blendMode(BLEND);
   imprintLayer.pop();
}






function drawPlantOn(pg, plant, cfgMain) {
   function piece(pg, x, y, r, cfg) {
       pg.beginShape();
       const x0 = x, y0 = y;
       const x3 = x0, y3 = y0 - r * cfg.tipScale;
       const x1 = x0 + Math.cos(cfg.a1) * cfg.r1;
       const y1 = y0 + Math.sin(cfg.a1) * cfg.r1;
       const x2 = x3 + Math.cos(cfg.a2) * cfg.r2;
       const y2 = y3 + Math.sin(cfg.a2) * cfg.r2;
       const a4 = Math.PI - cfg.a1;
       const x4 = x0 + Math.cos(a4) * cfg.r1;
       const y4 = y0 + Math.sin(a4) * cfg.r1;
       pg.vertex(x0, y0);
       pg.bezierVertex(x1, y1, x2, y2, x3, y3);
       pg.bezierVertex(x2, y2, x4, y4, x0, y0);
       pg.endShape(pg.CLOSE);
   }




   // mian piece
   piece(pg, 0, 0, plant.r, cfgMain);
   // side pieces
   for (let s of [-1, 1]) {
       pg.push(); pg.rotate(s * Math.PI * 0.25); piece(pg, 0, 0, plant.r * 0.8, cfgMain); pg.pop();
       pg.push(); pg.rotate(s * Math.PI * 0.48); piece(pg, 0, 0, plant.r * 0.8, cfgMain); pg.pop();
   }
   // bottom triangle
   pg.triangle(0, -plant.r * 0.5, -plant.r * 0.015, plant.r * 0.35, plant.r * 0.015, plant.r * 0.35);
}




function clearPrintAreaImprints() {
   if (!imprintLayer) return;
   imprintLayer.push();
   imprintLayer.rectMode(CENTER);
   imprintLayer.noStroke();
   // erase pixels inside the print area rectangle (small padding to avoid edge artifacts)
   imprintLayer.erase();
   const pad = 4;
   imprintLayer.rect(printArea.x, printArea.y, printArea.w + pad, printArea.h + pad);
   imprintLayer.noErase();
   imprintLayer.pop();
}




//-----------------------------------season selection--------------------------------


function selectSeason(season) {
   currentSeason = season;
   const palettes = {
       Spring: SpringPalette,
       Summer: SummerPalette,
       Fall: FallPalette,
       //Winter: WinterPalette
   };
   currentPalette = palettes[season];


   for (let s in seasonBtns) {
       const btn = seasonBtns[s];
       if (!btn) continue;
       btn.style('z-index', '1000');
       if (s === season) {
           btn.style('border', '4px solid white');
       } else {
           btn.style('border', 'none');
       }
   }


   if (clearBtn) clearBtn.style('z-index', '1000');
   if (myPicker) myPicker.style('z-index', '1000');
}


//-----------------------------------Plant Classes--------------------------------


class Flower {


   constructor(x, y, r, colors, angle) {
       // object properties
       this.pos = createVector(x, y);
       this.r = r /2;
       this.colors = colors;
       this.angle = angle;


       this.speedY = 0;
       this.baseX = this.pos.x;
       this.swayAmp = 5;
       this.angleVel = 0;


       this.cfgMain = this.makePieceConfig(this.r);


       this.selected = false;
   }


   makePieceConfig(r) {
       const petalnumber = Math.floor(random(4, 8));
       return {
           //r = flower radius
           petalnumber: petalnumber, // number of petals
           tipScale: random(0.5, 0.8),
           r0: r * random(0.1, 0.2),   // flower center radius
           r1: r * random(0.4, 0.6),   // base control radius
           a1: -PI * random(0.6, 1.0) / petalnumber, // left control angle
           r2: r * random(0, 0.5),   // top control radius
           a2: PI * random(0.1, 0.5)   // top control angle
       };
   }



   drwFlowerPiece(x, y, r, cfg) {
       beginShape();


       const x0 = x, y0 = y;


       // petal top point x3,y3
       const x3 = x0;
       const y3 = y0 - r * cfg.tipScale;


       // bottom left x1,y1
       const x1 = x0 + cos(cfg.a1) * cfg.r1;
       const y1 = y0 + sin(cfg.a1) * cfg.r1;


       // top left x2,y2
       const x2 = x3 + cos(cfg.a2) * cfg.r2;
       const y2 = y3;
       //const y2 = y3 + sin(cfg.a2) * cfg.r2;

       // right bottom x5，y5
       const a5 = PI - cfg.a1;
       const x5 = x0 + cos(a5) * cfg.r1;
       const y5 = y0 + sin(a5) * cfg.r1;


       // right top x4，y4


       const a4 = PI - cfg.a2;
       const x4 = x3 + cos(a4) * cfg.r2;
       const y4 = y3;
       //const y4 = y3 + sin(a4) * cfg.r2;


       vertex(x0, y0);
       bezierVertex(x1, y1, x2, y2, x3, y3);
       vertex(x3, y3);
       bezierVertex(x4, y4, x5, y5, x0, y0);
       endShape(CLOSE);


   }


   // draw a whole flower
   drwRdmFlw() {
       push();
       translate(this.pos.x, this.pos.y);
       rotate(this.angle);


       const ctx = drawingContext;


       const tipY = -this.r * this.cfgMain.tipScale;
       const cTop = color(this.colors[0]);     //
       const cBot = color(this.colors[1]);     //
       const cMid = lerpColor(cTop, cBot, 0.5);




       const gd = ctx.createLinearGradient(0, 0, 0, tipY);
       gd.addColorStop(0.00, cBot.toString()); //
       gd.addColorStop(0.50, cMid.toString()); //
       gd.addColorStop(1.00, cTop.toString()); //
       ctx.fillStyle = gd;


       noStroke();

       // draw one petal
       this.drwFlowerPiece(0, 0, this.r, this.cfgMain);


       // side petals
       for (let i = 1; i < this.cfgMain.petalnumber; i++) {
           push(); rotate(i * PI * 2 / this.cfgMain.petalnumber);
           this.drwFlowerPiece(0, 0, this.r, this.cfgMain);
           pop();
       }



       // flower center
       circle(0, 0, 2 * this.cfgMain.r0);


       pop();
   }


   moveBy(delta) {
       this.pos.add(delta);
   }

   drwRdmMaple() {
       this.drwRdmFlw();
   }

   hitTest(mx, my) {
       const d = dist(mx, my, this.pos.x, this.pos.y);
       return d <= this.r * 0.6;
   }


}




class BroadLeaves {


}



class Pine {



}


class Maple {

   constructor(x, y, r, colors, angle) {
       // object properties
       this.pos = createVector(x, y);
       this.r = r;
       this.colors = colors; // [topColor, bottomColor]
       this.angle = angle;

       this.speedY = 0;
       this.baseX = this.pos.x;
       this.swayAmp = 5;
       this.angleVel = 0;

       this.cfgMain = this.makePieceConfig(this.r);

       this.selected = false;
   }


   // generate random configuration for one maple piece
   makePieceConfig(r) {
       return {
           tipScale: random(0.6, 0.8),       // scale for leaf tip point
           r1: r * random(0.4, 0.57),   // base control point radius
           a1: -PI * random(0.55, 0.8), // left control angle
           r2: r * random(0.5, 0.7),   // top control point radius
           a2: PI * 0.5              // top control angle
       };
   }








   drwMaplePiece(x, y, r, cfg) {
       beginShape();




       const x0 = x, y0 = y;




       // leaf tip point
       const x3 = x0;
       const y3 = y0 - r * cfg.tipScale;




       // left control point
       const x1 = x0 + cos(cfg.a1) * cfg.r1;
       const y1 = y0 + sin(cfg.a1) * cfg.r1;




       // top control point
       const x2 = x3 + cos(cfg.a2) * cfg.r2;
       const y2 = y3 + sin(cfg.a2) * cfg.r2;




       // right control point (mirrored from left)
       const a4 = PI - cfg.a1;
       const x4 = x0 + cos(a4) * cfg.r1;
       const y4 = y0 + sin(a4) * cfg.r1;


       vertex(x0, y0);
       bezierVertex(x1, y1, x2, y2, x3, y3);
       bezierVertex(x2, y2, x4, y4, x0, y0);
       endShape(CLOSE);


   }




   // draw a whole maple leaf
   drwRdmMaple() {
       push();
       translate(this.pos.x, this.pos.y);
       rotate(this.angle);

       const ctx = drawingContext;

       const tipY = -this.r * this.cfgMain.tipScale;
       const cTop = color(this.colors[0]);   
       const cBot = color(this.colors[1]);     
       const cMid = lerpColor(cTop, cBot, 0.5);




       const gd = ctx.createLinearGradient(0, 0, 0, tipY);
       gd.addColorStop(0.00, cBot.toString()); 
       gd.addColorStop(0.50, cMid.toString()); 
       gd.addColorStop(1.00, cTop.toString()); 
       ctx.fillStyle = gd;

       noStroke();


       // mian piece
       this.drwMaplePiece(0, 0, this.r, this.cfgMain);




       // side pieces
       for (let i of [-1, 1]) {
           push(); rotate(i * PI * 0.25); this.drwMaplePiece(0, 0, this.r * 0.8, this.cfgMain); pop();
           push(); rotate(i * PI * 0.48); this.drwMaplePiece(0, 0, this.r * 0.8, this.cfgMain); pop();
           //push(); rotate(i * PI * 0.68); this.drwMaplePiece(0, 0, this.r * 0.5, cfgMain); pop();
       }



       //  leaf stem
       triangle(0, -this.r * 0.5, -this.r * 0.015, this.r * 0.35, this.r * 0.015, this.r * 0.35);


       // leaf veins
       push();
       blendMode(MULTIPLY);
       stroke(102, 51, 0, 100);
       strokeWeight(this.r * 0.008);
       noFill();

       const ctrlY = tipY + this.cfgMain.r2;          
       const veinEndY = (4 / 5) * (ctrlY + tipY);
       line(0, 0, 0, veinEndY);




       for (let i of [-1, 1]) {
           push(); rotate(i * PI * 0.25);
           line(0, 0, 0, veinEndY * 0.75);
           pop();


           push(); rotate(i * PI * 0.48);
           line(0, 0, 0, veinEndY * 0.75);
           pop();
       }
       pop();




       pop();
   }



   moveBy(delta) {
       this.pos.add(delta);
   }


   hitTest(mx, my) {
       const d = dist(mx, my, this.pos.x, this.pos.y);
       return d <= this.r * 0.6;
   }




}

