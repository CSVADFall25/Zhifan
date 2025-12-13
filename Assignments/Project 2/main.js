import { createAppState } from './src/state.js';
import { loadMessagesFromP5Table } from './src/data/loader.js';
import { aggregateMessages, getMaxCounts } from './src/data/aggregate.js';
import { buildPalette, attachFillGradient } from './src/mapping/palette.js';
import { initUI } from './src/ui/control.js';
import { buildMappingRules, decideStitchName } from './src/mapping/rules.js';
import { createStitchRenderer, getStitchWidth, buildStitches, drawTooltipAt } from './src/render/stitches.js';
import { createDrawCursor, resetCursor, startDrawing, stopDrawing, updateCursor, calculateStitchSpacing, drawProgressiveStitches } from './src/render/drawingCursor.js';

const app = createAppState();

const uiWidth = 350;
const uiHeight = 320;

let table;
let dataLoaded = false;
let initialized = false;
let palette;
let ui;
let mappingRules;
let stitchRenderer;
let stitches = [];
let stitchSpacing = 0;
let inriaFont1;
let inriaFont2;
let bgimage;


new p5(p => {

  p.preload = () => {
    console.log('[Preload] Starting to load CSV...');
    // preload the Inria Serif font
    inriaFont1 = p.loadFont('assets/InriaSerif-Regular.ttf');
    inriaFont2 = p.loadFont('assets/InriaSerif-Bold.ttf');

    bgimage = p.loadImage('assets/texture.png');

    table = p.loadTable('chatdata.csv', 'csv', 'header',
      () => {
        console.log('[Preload] CSV loaded with', table.getRowCount(), 'rows');
        dataLoaded = true;
      },
      (err) => {
        console.error('[Preload] CSV load failed:', err);
      }
    );
  };

  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight);
    console.log('[Setup] Canvas created');

    if (bgimage) {
      p.background(bgimage);
    }

    //global font
    if (inriaFont1) {
      p.textFont(inriaFont1);
    }

    attachFillGradient(p);
  };

  p.draw = () => {
    if (!dataLoaded) {
      p.background(100);
      return;
    }
    // proceed only after data is loaded


    if (!initialized) {
      console.log('[Init] Starting initialization...');

      const rowCount = table.getRowCount();
      console.log('[Init] CSV rows:', rowCount);

      const messages = loadMessagesFromP5Table(table);
      console.log('[Init] Messages loaded:', messages.length);
      app.raw = messages;

      app.timeResolution = 'day';
      app.currentAgg = aggregateMessages(messages, app.timeResolution);
      console.log('[Init] Aggregation complete. Bins:', app.currentAgg.bins.length);

      // get the max counts for A, B, and total to build mapping rules
      const maxCounts = getMaxCounts(app.currentAgg);
      mappingRules = buildMappingRules(maxCounts.maxTotal, app.timeResolution);

      app.timelineLength = app.currentAgg.bins.length;


      // Initialize palette
      const USER_HUE_A = 210;
      const USER_HUE_B = 330;
      const LIGHTNESS = 65;
      palette = buildPalette(USER_HUE_A, USER_HUE_B, LIGHTNESS);



      // -------init UI with callbacks for palette and resolution changes-----------------
      ui = initUI({
        app,
        palette,
        setPalette: (newPalette) => {
          palette = newPalette;
          // rebuild stitches with new palette
          stitches = buildStitches(p, app, mappingRules, palette, decideStitchName, app.blockSizeScale);
        },
        onResolutionChange: () => {
          // rebuild mapping rules and stitches with new resolution
          const maxCounts = getMaxCounts(app.currentAgg);
          mappingRules = buildMappingRules(maxCounts.maxTotal, app.timeResolution);
          stitchRenderer = createStitchRenderer(p, palette, app.blockSizeScale);
          stitches = buildStitches(p, app, mappingRules, palette, decideStitchName, app.blockSizeScale);
          // recalculate spacing and reset cursor
          const stitchWidth = getStitchWidth(p.height, app.blockSizeScale);
          stitchSpacing = calculateStitchSpacing(p.width, stitches.length, stitchWidth);
          if (app.drawCursor) resetCursor(app.drawCursor, app.startTimeIdx);
        },
        onStartBinChange: () => {
          // user adjusts the start time, reset the drawing cursor to the new start time index
          if (app.drawCursor) resetCursor(app.drawCursor, app.startTimeIdx);
        },
        onClearDrawing: () => {
          // clear drawing content
          if (app.drawCursor) {
            resetCursor(app.drawCursor, app.startTimeIdx);
          }
          // reset start time index to 0
          if (ui && ui.sliders && ui.sliders.startBin) {
            ui.sliders.startBin.value = String(app.initialStartTimeIdx);
            if (ui.labels && ui.labels.startBin) {
              ui.labels.startBin.textContent = `Start Bin: ${app.initialStartTimeIdx}`;
            }
          }
        },
        p
      });


//----------- Build stitches and stitch renderer for the first time
      stitchRenderer = createStitchRenderer(p, palette, app.blockSizeScale);

      stitches = buildStitches(p, app, mappingRules, palette, decideStitchName, app.blockSizeScale);

      const stitchWidth = getStitchWidth(p.height, app.blockSizeScale);
      stitchSpacing = calculateStitchSpacing(p.width, stitches.length, stitchWidth);

      app.drawCursor = createDrawCursor(app.startTimeIdx);

      initialized = true;
      return;
    }

//--------------------- Draw background and stitches---------------------

    p.background(240);
    if (bgimage && bgimage.width > 0) {
      const ctx = p.drawingContext;
      ctx.save();
      ctx.globalAlpha = 0.6; 
      p.image(bgimage, 0, 0, p.width, p.height);
      ctx.restore();
    }

    //safe return early if not ready
    if (!app.currentAgg || !app.currentAgg.bins || !stitchRenderer) return;

    // draw from the current start bin index
    const startIdx = app.startTimeIdx || 0;
    const stitchesToDraw = stitches.filter(s => s.idx >= startIdx);

    // update the drawing cursor position based on mouse movement, but only if not in UI area
    if (app.drawCursor && app.drawCursor.isDrawing) {
      const inUIArea = p.mouseX < uiWidth && p.mouseY < uiHeight;
      // Only update cursor if not in UI area
      if (!inUIArea) {
        updateCursor(app.drawCursor, p.mouseX, p.mouseY, stitchesToDraw, stitchSpacing);
      }
    }




    // draw stitches up to the current cursor position
    if (app.drawCursor) {
      drawProgressiveStitches(p, stitchRenderer, app.drawCursor);

      //drawMouseTrail(p, app.drawCursor, p.mouseX, p.mouseY);

      // drawCursorInfo(p, app.drawCursor, stitchesToDraw.length);


      if (app.drawCursor.isDrawing && ui && ui.sliders && ui.sliders.startBin) {
        const globalProgressBin = Math.min(app.timelineLength - 1, startIdx + app.drawCursor.binIndex);
        ui.sliders.startBin.value = String(globalProgressBin);
        if (ui.labels && ui.labels.startBin) {
          ui.labels.startBin.textContent = `Start Bin: ${ui.sliders.startBin.value}`;
        }
      }

      // tooltip check
      if (!app.drawCursor.isDrawing && app.drawCursor.drawnStitches.length > 0) {
        let hoveredStitch = null;
        let hoveredX = 0;
        let hoveredY = 0;
        const hoverRadius = 20; // detection radius

        // Check from the end (most recently drawn first)
        for (let i = app.drawCursor.drawnStitches.length - 1; i >= 0; i--) {
          const drawn = app.drawCursor.drawnStitches[i];
          const dist = Math.sqrt((p.mouseX - drawn.x) ** 2 + (p.mouseY - drawn.y) ** 2);
          if (dist < hoverRadius) {
            hoveredStitch = drawn.stitch;
            hoveredX = drawn.x;
            hoveredY = drawn.y;
            break;
          }
        }

        // Show tooltip
        if (hoveredStitch) {
          drawTooltipAt(p, hoveredStitch, hoveredX, hoveredY);
        }
      }
    }



    // Titles
    p.push();
    p.colorMode(p.RGB, 255);
    p.textSize(48);
    p.fill(100, 50, 50);
    p.textAlign(p.LEFT, p.TOP);
    p.noStroke();
    p.textFont(inriaFont2);
    p.text('Cro-versation', 10, 0);
    p.textFont(inriaFont1);
    p.textSize(24);
    p.text('Draw my digital dialogue into crochet stiches', 10, 50);



    //mapping rules
    p.textSize(14);
    p.fill(180, 180, 180);
    p.textAlign(p.RIGHT, p.TOP);
    p.text('Mapping Rules:', p.width - 10, 10);
    p.text('chainskip: 0 messages', p.width - 10, 30);
    p.text('sc/single crochet: 20% maximum messages', p.width - 10, 50);
    p.text('hdc/half double crochet: 40% maximum messages', p.width - 10, 70);
    p.text('dc/double crochet: 60% maximum messages', p.width - 10, 90);
    p.text('tr/triple crochet: 80% maximum messages', p.width - 10, 110);
    p.text('dt/double triple crochet: maximum messages', p.width - 10, 130);
    p.text('picot: video & voice calls', p.width - 10, 150);
    p.pop();
  };


  p.mousePressed = () => {
    if (app.drawCursor && initialized) {
      // check if mouse is in UI area

      if (p.mouseX < uiWidth && p.mouseY < uiHeight) {
        // in UI area, do not start drawing
        return;
      }
      startDrawing(app.drawCursor, p.mouseX, p.mouseY);
    }
  };


  p.mouseReleased = () => {
    if (app.drawCursor) {
      stopDrawing(app.drawCursor);
    }
  };

});

 