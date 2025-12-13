import { createBodySegmentation } from './src/bodySegmentation.js';
import { createColorRecognition } from './src/colorRecognition.js';
import { createUI } from './src/ui.js';
import { createBrushCategory } from './src/brushcategory.js';
import { createPalette } from './src/palette.js';

const sketch = (p) => {
  const step = 10;
  const videoScale = 0.8; 
  let video;
  let fontMain;

  let displayRect = { x: 0, y: 0, w: 0, h: 0, scale: 1 };

  let bodySeg;
  let colorRec;
  let ui;
  let palette;
  let brushCategory;
  let currentBrushType = 'cloud'; 
  let frameCounter = 0; // Animation timing

  // WebSocket and Arduino
  let socket;
  let buttonA = 0; 
  let buttonB = 0; 
  let fsrValue = 0; 
  let prevButtonA = 0;
  let prevButtonB = 0;

  p.preload = () => {
    fontMain = p.loadFont('assets/Electrolize-Regular.ttf');
  };

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.textFont(fontMain);
    p.noStroke();
    p.fill(0);

    video = p.createCapture(p.VIDEO);
    video.size(1280, 960);
    video.hide();

    bodySeg = createBodySegmentation(p);
    bodySeg.init(video);

    colorRec = createColorRecognition(p);
    brushCategory = createBrushCategory(p, () => bodySeg.getSegmentation());

    palette = createPalette(p);

    ui = createUI(
      p,
      () => {
        brushCategory.clear();
      }, 
      (value) => {
        colorRec.setTolerance(value); 
        ui.updateToleranceLabel(value);
      }
    );
    ui.setup();
    ui.updateColorIndicator(palette.getCurrentColor());

    initializeWebSocket();
  };






  p.draw = () => {
    //background overlay
    p.background(239, 233, 227, 240);

    // make the video in the center
    const vw = video.width;
    const vh = video.height;
    const cw = p.width;
    const ch = p.height;
    const scale = Math.min(cw / vw, ch / vh) * videoScale;
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    displayRect = { x: dx, y: dy, w: dw, h: dh, scale };

    p.background(239, 233, 227, 240);

    // Load video pixels
    video.loadPixels();

    // video background style
    p.push();
    p.translate(dx + dw, dy);
    p.scale(-scale, scale); // Mirror
    for (let y = 0; y < video.height; y += step) {
      for (let x = 0; x < video.width; x += step) {
        const idx = (x + y * video.width) * 4;
        const r = video.pixels[idx];
        const g = video.pixels[idx + 1];
        const b = video.pixels[idx + 2];
        const brightness = (r + g + b) / 3;
        const radius = p.map(brightness, 0, 255, step, 1);
        p.fill(0);
        p.noStroke();
        p.ellipse(x, y, radius, radius);
      }
    }
    p.pop();

    p.background(239, 233, 227, 240);

    // Body segmentation
    p.push();
    p.translate(displayRect.x + displayRect.w, displayRect.y);
    p.scale(-1, 1); // Mirror
    bodySeg.draw({ x: 0, y: 0, w: displayRect.w, h: displayRect.h, scale: displayRect.scale });
    p.pop();

    // Update color recognition
    video.loadPixels();
    colorRec.updateMatch(video);

    addStrokePointFromDetection(displayRect);

    // Draw strokes
    p.push();
    p.clip(() => {
      p.rect(displayRect.x, displayRect.y, displayRect.w, displayRect.h);
    });
    brushCategory.draw(frameCounter, displayRect, true);
    p.pop();
    frameCounter++;

    //detection circle
    drawColorDetectionCircle(video, displayRect);

    // original video
    const previewWidth = 200;
    const previewHeight = 150;
    const previewX = 20;
    const previewY = (p.height * (1 + videoScale)) / 2 - previewHeight;
    p.push();
    p.translate(previewX + previewWidth, previewY);
    const previewScale = previewWidth / video.width;
    p.scale(-previewScale, previewScale); // Mirror
    p.image(video, 0, 0);
    p.pop();

    p.stroke(0);
    p.strokeWeight(2);
    p.noFill();
    p.rect(previewX, previewY, previewWidth, previewHeight);

    // text prompt
    p.noStroke();
    p.fill(0);
    p.push();
    p.textSize(24);
    p.textAlign(p.CENTER, p.TOP);
    p.text("HOW'S YOUR FEELING NOW?", p.width / 2, (p.height * (1 + videoScale)) / 2 + 10);
    p.pop();
  };

  // get brush color based on recognized color
  function getCurrentBrushColor() {
    const paletteColor = palette.getCurrentColor();
    const currentRecognizedColor = colorRec.getCurrentColor();

    if (currentRecognizedColor) {
      if (currentRecognizedColor.name === 'pink') {
        currentBrushType = brushCategory.SPIKY;
      } else if (currentRecognizedColor.name === 'blue') {
        currentBrushType = brushCategory.WAVE;
      } else if (currentRecognizedColor.name === 'yellow') {
        currentBrushType = brushCategory.CLOUD;
      }
    } else if (!currentBrushType) {
      currentBrushType = brushCategory.CLOUD;
    }

    return paletteColor;
  }

  // detection circle at recognized color
  function drawColorDetectionCircle(video, rect) {
    if (!video || video.width === 0 || video.height === 0) return;
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height, scale: 1 };

    const colorMatch = colorRec.getLastMatch();
    
    if (colorMatch) {
      const detectedColor = colorRec.getCurrentColor();
      if (!detectedColor) {
        return;
      }
      let canvasX = rect.x + colorMatch.x * rect.w / video.width;
      let canvasY = rect.y + colorMatch.y * rect.h / video.height;
      
      // Mirror
      canvasX = rect.x + rect.w - (colorMatch.x * rect.w / video.width);

      // Get the brush color to draw the circle
      const brushColor = p.color(detectedColor.r, detectedColor.g, detectedColor.b);
      
      p.stroke(255);
      p.strokeWeight(3);
      p.fill(brushColor);
      p.circle(canvasX, canvasY, 40);
    }
  }




  // Add stroke points for the currently detected color position
  function addStrokePointFromDetection(rect) {
    if (buttonA !== 1) return;
    if (!rect) return;
    if (!video || video.width === 0 || video.height === 0) return;

    const colorMatch = colorRec.getLastMatch();
    const detectedColor = colorRec.getCurrentColor();
    if (!colorMatch || !detectedColor) {
      return;
    }

    if (!brushCategory.isDrawing()) {
      const color = getCurrentBrushColor();
      brushCategory.startDrawing(currentBrushType, color);
    }

    const normalizedX = colorMatch.x / video.width;
    const normalizedY = colorMatch.y / video.height;
    const mirroredX = rect.x + rect.w - normalizedX * rect.w;
    const canvasY = rect.y + normalizedY * rect.h;

    brushCategory.addPoint(mirroredX, canvasY);
  }

  // switch brush types 
  //p.keyPressed = () => {
  //  // Press 1, 2, 3 to switch brush types
  //  if (p.key === '1') {
  //    currentBrushType = brushCategory.CLOUD;
  //    console.log('Switched to Cloud brush');
  //  } else if (p.key === '2') {
  //    currentBrushType = brushCategory.SPIKY;
  //    console.log('Switched to Spiky brush');
  //  } else if (p.key === '3') {
  ///    currentBrushType = brushCategory.WAVE;
  //    console.log('Switched to Wave brush');
   // }
    
    // Press +/- to adjust brush size
   // if (p.key === '+' || p.key === '=') {
   //   const newSize = brushCategory.getBrushSize() + 2;
   //   brushCategory.setBrushSize(newSize);
   //   console.log('Brush size: ' + brushCategory.getBrushSize());
   // } else if (p.key === '-' || p.key === '_') {
   //   const newSize = brushCategory.getBrushSize() - 2;
   //   brushCategory.setBrushSize(newSize);
   //   console.log('Brush size: ' + brushCategory.getBrushSize());
   // }
  //};




  // --------------------WebSocket----------------------------
  function initializeWebSocket() {
    try {
      socket = new WebSocket('ws://localhost:8765');

      socket.addEventListener('open', function (event) {
        console.log('WebSocket connection opened');
        socket.send('P5.js client connected');
      });

      socket.addEventListener('message', function (event) {
        if (!event?.data) {
          return;
        }

        console.log('Message from Arduino: ', event.data);

        // Parse incoming data: format is (A, B, C)
        // A = Button 1 (0/1), B = Button 2 (0/1), C = FSR value
        const sanitized = event.data.replace(/[()]/g, '');
        const values = sanitized.split(',').map((v) => v.trim());
        
        if (values.length >= 3) {
          prevButtonA = buttonA;
          prevButtonB = buttonB;
          
          buttonA = parseInt(values[0], 10);
          buttonB = parseInt(values[1], 10);
          fsrValue = parseInt(values[2], 10);

          if (Number.isNaN(buttonA)) {
            buttonA = 0;
          }
          if (Number.isNaN(buttonB)) {
            buttonB = 0;
          }
          if (Number.isNaN(fsrValue)) {
            fsrValue = 0;
          }

          console.log(`Button A: ${buttonA}, Button B: ${buttonB}, FSR: ${fsrValue}`);

          // FSR range is 0-1023, map to brush size 5-50
          const mappedBrushSize = p.map(fsrValue, 0, 1023, 5, 50);
          brushCategory.setBrushSize(Math.round(mappedBrushSize));

          // button A pressed - start drawing
          if (buttonA === 1 && prevButtonA === 0) {
            console.log('Button A pressed');
          }

          // button B pressed - switch color
          if (buttonB === 1 && prevButtonB === 0) {
            console.log('Button B pressed - switching color');
            palette.nextColor();
            ui.updateColorIndicator(palette.getCurrentColor());
          }

          // button A released - finish drawing
          if (buttonA === 0 && prevButtonA === 1) {
            //console.log('Button A released - finishing drawing');
            if (brushCategory.isDrawing()) {
              brushCategory.finishDrawing(displayRect, true);
            }
          }
        }
      });

      socket.addEventListener('error', function (event) {
        console.error('WebSocket error: ', event);
      });

      socket.addEventListener('close', function (event) {
        console.log('WebSocket connection closed');
      });
    } catch (e) {
      console.error('Failed to initialize WebSocket: ', e);
    }
  }

};


new p5(sketch);