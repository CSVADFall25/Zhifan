// Stitch rendering logic: convert bin counts to stitch types, and render them on the canvas.

function createStitchObject(bin, idx, stitchType, colorInfo) {
  return {
    bin, //object-data bin
    idx, // number - index in the bins array
    type: stitchType, //string - stitch type (e.g., 'sc', 'hdc', 'dc', etc.)
    colorInfo //object-soild or gradient
  };
}




export function createStitchRenderer(p, palette, blockSizeScale = 1.0) {
// basic unit: 1/100 of screen height * scale
  const block = (p.height / 100) * blockSizeScale;

// map stitch types to their heights in blocks
  const stitchHeightMap = {
    'chainSkip': 1,
    'sc': 1,
    'hdc': 2,
    'dc': 3,
    'tr': 4,
    'dtr': 5
  };




  //draw a single stitch based on its type and color info
  function drawStitch(stitch) {
    const { type, x, y, colorInfo, bin } = stitch;

    if (type === 'chainSkip') {
      drawChainSkip(x, y, block, colorInfo);
    } else {
      drawRegularStitch(x, y, block, stitchHeightMap[type], colorInfo);
    }

    // Draw picots at top of stitch if there are calls
    if (bin && bin.call && bin.call.count > 0) {
      const callCount = bin.call.count;
      const stitchHeight = stitchHeightMap[type] * block;
      const topY = y - stitchHeight - block * 0.3;
      
      let picotCount = 0;
      if (callCount >= 3) picotCount = 5;
      else if (callCount >= 2) picotCount = 3;
      else if (callCount >= 1) picotCount = 1;
      
      drawPicots(x, topY, block, picotCount, colorInfo);
    }
  }


  //chain skip
  function drawChainSkip(x, y, blockSize, colorInfo) {
    drawGradientEllipse(x, y, blockSize * 2, blockSize, colorInfo);
  }


  // Regular stitch (sc, hdc, dc, tr, dtr)
  function drawRegularStitch(x, y, blockSize, heightInBlocks, colorInfo) {
    const stitchHeight = heightInBlocks * blockSize;

    // Bottom ellipse (position: y, bottom)
    drawGradientEllipse(x, y, blockSize * 2, blockSize, colorInfo);

drawGradientEllipse(x, y - stitchHeight, blockSize * 2, blockSize, colorInfo);

    // connection part (vertical ellipse)
    if (stitchHeight > blockSize) {
      drawGradientEllipse(x, y - stitchHeight/ 2 - 1, blockSize * 2 / 3, stitchHeight, colorInfo);
    } 

    // Decorative ellipses for taller stitches
    const decoAngle = Math.PI / 12; 
    if (heightInBlocks >= 3) {
      drawGradientEllipse(x, y - 1.5 * blockSize, blockSize * 2, blockSize * 0.5, colorInfo, decoAngle);
    }
    if (heightInBlocks >= 4) {
      drawGradientEllipse(x, y - 2.5 * blockSize, blockSize * 2, blockSize * 0.5, colorInfo, decoAngle);
    }
    if (heightInBlocks >= 5) {
      drawGradientEllipse(x, y - 3.5 * blockSize, blockSize * 2, blockSize * 0.5, colorInfo, decoAngle);
    }
  }



  function drawPicots(x, y, blockSize, count, colorInfo) {
    const picotSize = blockSize * 0.5;
    const spacing = blockSize * 0.6;
    
    p.push();
    p.noStroke();
    
    // Set color for picots
    if (colorInfo && colorInfo.type === 'solid') {
      palette.applySolidFill(p, colorInfo);
    } else if (colorInfo && colorInfo.type === 'gradient') {
      // Use color B for picots
      const colorB = colorInfo.colorB;
      p.fill(colorB.h, colorB.s, colorB.l);
    } else {
      p.fill(200);
    }
    
    if (count === 1) {
      p.circle(x, y-blockSize/2, picotSize);
    } else if (count === 3) {
      p.circle(x - spacing, y-blockSize/2, picotSize);
      p.circle(x, y-blockSize/2, picotSize);
      p.circle(x + spacing, y-blockSize/2, picotSize);
    } else if (count === 5) {
      p.circle(x - spacing * 1.5, y-blockSize/2.5, picotSize);
      p.circle(x - spacing*0.75, y-blockSize/1.2, picotSize);
      p.circle(x, y-blockSize, picotSize);
      p.circle(x + spacing*0.75, y-blockSize/1.2, picotSize);
      p.circle(x + spacing * 1.5, y-blockSize/2.5, picotSize);
    }
    
    p.pop();
  }


  // Draw a gradient ellipse at specified position, size, and color info
  function drawGradientEllipse(x, y, w, h, colorInfo, angle = 0) {
 
    if (!colorInfo || colorInfo.type === 'solid') {
      //soild color fill
      p.push();
      p.translate(x, y);
      p.rotate(angle);
      if (colorInfo) {
        palette.applySolidFill(p, colorInfo);
      } else {
        p.fill(200);
      }
      p.ellipse(0, 0, w, h);
      p.pop();
      return;
    }

    // gradient color fill
    const ctx = p.drawingContext;
    const colorA = colorInfo.colorA;
    const colorB = colorInfo.colorB;

    ctx.save();
    // Move coordinate system to ellipse center and rotate, then draw in local coordinates
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);

    const gradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    gradient.addColorStop(0, `hsl(${colorA.h}, ${colorA.s}%, ${colorA.l}%)`);
    gradient.addColorStop(1, `hsl(${colorB.h}, ${colorB.s}%, ${colorB.l}%)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return {
    drawStitch,
    blockSize: block,
  };
}


// Get stitch width based on screen height and block size scale
export function getStitchWidth(screenHeight, blockSizeScale = 1.0) {
  const block = (screenHeight / 100) * blockSizeScale;
  return block * 2; // Base stitch width is 2 blocks wide
}


// Build stitch objects array
export function buildStitches(p, app, mappingRules, palette, decideStitchName, blockSizeScale = 1.0) {
  const stitches = [];
  if (!app.currentAgg || !app.currentAgg.bins) return stitches;

  for (let i = 0; i < app.currentAgg.bins.length; i++) {
    const bin = app.currentAgg.bins[i];

    // Determine stitch type by rules
    const stitchType = decideStitchName(bin.counts.total, mappingRules, bin);

    // Get color information
    const colorInfo = palette?.colorForBin(bin, p);

    // Create stitch object
    const stitch = createStitchObject(bin, i, stitchType, colorInfo);

    stitches.push(stitch);
  }


  return stitches;
}



//draw tooltip 
export function drawTooltipAt(p, stitch, stitchX, stitchY) {
  const { bin, type, idx } = stitch;

  const callCount = bin.call?.count || 0;
  const tooltipWidth = 160;
  const tooltipHeight = callCount > 0 ? 105 : 90;
  const offsetX = 20;
  const offsetY = -10;

  // Calculate tooltip position to ensure it doesn't go off-screen
  let tooltipX = stitchX + offsetX;
  let tooltipY = stitchY + offsetY - tooltipHeight;

  // Boundary check
  if (tooltipX + tooltipWidth > p.width) {
    tooltipX = stitchX - offsetX - tooltipWidth;
  }
  if (tooltipY < 0) {
    tooltipY = stitchY + offsetY;
  }

  // Draw background
  p.push();
  p.fill(0, 0, 0, 0.85);
  p.noStroke();
  p.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);

  // Draw text
  p.fill(255);
  p.textSize(12);
  p.textAlign(p.LEFT, p.TOP);
  let textY = tooltipY + 8;
  p.text(`Bin Index: ${idx}`, tooltipX + 8, textY);
  textY += 15;
  p.text(`Stitch Type: ${type}`, tooltipX + 8, textY);
  textY += 15;
  p.text(`Total: ${bin.counts.total}`, tooltipX + 8, textY);
  textY += 15;
  p.text(`A: ${bin.counts.A} | B: ${bin.counts.B}`, tooltipX + 8, textY);
  textY += 15;
  p.text(`Date: ${bin.key}`, tooltipX + 8, textY);
  if (callCount > 0) {
    textY += 15;
    p.text(`Calls: ${callCount}`, tooltipX + 8, textY);
  }
  p.pop();
}

