// UI control module

import { buildPalette } from '../mapping/palette.js';
import { aggregateMessages } from '../data/aggregate.js';

/**
 * Initialize UI controls
 * @param {Object} context - { app, palette, setPalette, p }
 * @returns {Object} ui - { sliders, labels, select }
 */



export function initUI(context) {
  const { app, palette, setPalette, p } = context;
  const ui = { sliders: {}, labels: {}, select: null };

  // Utility: make label
  const makeLabel = (txt, topPx) => {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = '12px';
    el.style.top = `${topPx}px`;
    el.style.color = '#8e8e8eff';
    el.style.font = '18px "Inria Serif", serif';
    el.textContent = txt;
    document.body.appendChild(el);
    return el;
  };

  // Hue A slider
  ui.labels.hueA = makeLabel('Hue for Sender A:', 100);
  ui.sliders.hueA = document.createElement('input');
  ui.sliders.hueA.type = 'range';
  ui.sliders.hueA.min = '0';
  ui.sliders.hueA.max = '360';
  ui.sliders.hueA.step = '1';
  ui.sliders.hueA.value = String(palette.hueA);
  Object.assign(ui.sliders.hueA.style, { position: 'absolute', left: '186px', top: '102px', width: '180px' });
  document.body.appendChild(ui.sliders.hueA);
  ui.sliders.hueA.addEventListener('input', () => {
    const v = parseInt(ui.sliders.hueA.value, 10);
    const newPalette = buildPalette(v, palette.hueB, palette.lightness);
    setPalette(newPalette);
    ui.labels.hueA.textContent = `Hue for Sender A: ${v}`;
  });

  // Hue B slider
  ui.labels.hueB = makeLabel('Hue for Sender B:', 120);
  ui.sliders.hueB = document.createElement('input');
  ui.sliders.hueB.type = 'range';
  ui.sliders.hueB.min = '0';
  ui.sliders.hueB.max = '360';
  ui.sliders.hueB.step = '1';
  ui.sliders.hueB.value = String(palette.hueB);
  Object.assign(ui.sliders.hueB.style, { position: 'absolute', left: '186px', top: '122px', width: '180px' });
  document.body.appendChild(ui.sliders.hueB);
  ui.sliders.hueB.addEventListener('input', () => {
    const v = parseInt(ui.sliders.hueB.value, 10);
    const newPalette = buildPalette(palette.hueA, v, palette.lightness);
    setPalette(newPalette);
    ui.labels.hueB.textContent = `Hue for Sender B: ${v}`;
  });

  // Lightness slider
  ui.labels.light = makeLabel('Brightness:', 140);
  ui.sliders.light = document.createElement('input');
  ui.sliders.light.type = 'range';
  ui.sliders.light.min = '20';
  ui.sliders.light.max = '95';
  ui.sliders.light.step = '1';
  ui.sliders.light.value = String(palette.lightness);
  Object.assign(ui.sliders.light.style, { position: 'absolute',left: '186px', top: '142px', width: '180px' });
  document.body.appendChild(ui.sliders.light);
  ui.sliders.light.addEventListener('input', () => {
    const v = parseInt(ui.sliders.light.value, 10);
    const newPalette = buildPalette(palette.hueA, palette.hueB, v);
    setPalette(newPalette);
    ui.labels.light.textContent = `Brightness: ${v}`;
  });

  // Resolution select
  ui.labels.res = makeLabel('Time Resolution:', 160);
  ui.select = document.createElement('select');
  Object.assign(ui.select.style, { position: 'absolute', left: '190px', top: '162px' });
  const opts = [/* 'hour', */ 'day', 'week'];
  for (const o of opts) {
    const opt = document.createElement('option');
    opt.value = o;
    opt.text = o;
    if (o === app.timeResolution) opt.selected = true;
    ui.select.appendChild(opt);
  }
  document.body.appendChild(ui.select);
  ui.select.addEventListener('change', () => {
    const val = ui.select.value;
    app.timeResolution = val;
    if (app.raw && Array.isArray(app.raw)) {
      app.currentAgg = aggregateMessages(app.raw, app.timeResolution);
      app.timelineLength = app.currentAgg.bins.length;
      console.log('[UI] Resolution changed to', val, 'Bins:', app.timelineLength);
      
      // update the startBin slider max value based on new timeline length
      if (ui.sliders.startBin) {
        ui.sliders.startBin.max = String(Math.max(0, app.timelineLength - 1));
        // If the current value is out of range, reset to 0
        if (app.startTimeIdx >= app.timelineLength) {
          app.startTimeIdx = 0;
          app.initialStartTimeIdx = 0;
          ui.sliders.startBin.value = '0';
          ui.labels.startBin.textContent = 'Start Bin: 0';
        }
      }
      
      // update the startBin slider max value based on new timeline length
      if (context.onResolutionChange) {
        context.onResolutionChange();
      }
    }
  });

  // Start Bin slider + remaining time calculation
  ui.labels.startBin = makeLabel('Start Bin: 0', 240);
  document.body.appendChild(ui.labels.startBin);

  
  ui.sliders.startBin = document.createElement('input');
  ui.sliders.startBin.type = 'range';
  ui.sliders.startBin.min = '0';
  ui.sliders.startBin.max = String(Math.max(0, app.timelineLength - 1));
  ui.sliders.startBin.step = '1';
  ui.sliders.startBin.value = String(app.startTimeIdx || 0);
  Object.assign(ui.sliders.startBin.style, { position: 'absolute', left: '12px', top: '265px', width: '366px', zIndex: '10', background: 'transparent' });
  document.body.appendChild(ui.sliders.startBin);
  ui.sliders.startBin.addEventListener('input', () => {
    const v = parseInt(ui.sliders.startBin.value, 10);
    app.startTimeIdx = v;
    app.initialStartTimeIdx = v; // record the initial value for reset
    ui.labels.startBin.textContent = `Start Bin: ${v}`;

    if (context.onStartBinChange) {
      context.onStartBinChange();
    }
  });


  // Clear
  ui.clearButton = document.createElement('button');
  ui.clearButton.textContent = 'Reset Drawing';
  ui.clearButton.style.cssText = 'position: absolute; box-sizing: border-box; left: 20px; top: 200px; width: 120px; margin: 0; padding: 5px; border: none; border-radius: 4px; cursor: pointer; background: #c3e2ffff; font-style: italic;';
  document.body.appendChild(ui.clearButton);
  ui.clearButton.addEventListener('click', () => {
    console.log('[UI] Clear button clicked');
    if (context.onClearDrawing) {
      context.onClearDrawing();
    }
  });

  return ui;
}
