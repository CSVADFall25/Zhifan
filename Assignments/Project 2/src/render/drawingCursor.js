// Drawing cursor module: manages progressive stitch drawing along mouse path


export function createDrawCursor(startBinIndex = 0) {
  return {
    binIndex: 0,                   // Current bin index (relative to filtered stitchesToDraw array)
    isDrawing: false,              // Whether currently drawing
    lastX: 0,                      // Last mouse X position
    lastY: 0,                      // Last mouse Y position
    accumulatedDistance: 0,        // Accumulated drawing distance
    drawnStitches: []              // Drawn stitch positions [{stitchIndex, x, y, angle, stitch}]
  };
}

/**
 * Reset cursor to specified position
 * @param {object} cursor - cursor object
 * @param {number} binIndex - new start index (kept for logging, but internal index reset to 0)
 */

export function resetCursor(cursor, binIndex = 0) {
  cursor.binIndex = 0;  // Reset to 0 since it indexes the filtered stitchesToDraw array
  cursor.accumulatedDistance = 0;
  cursor.drawnStitches = [];
  console.log('[DrawCursor] Reset to bin:', binIndex, '(cursor index reset to 0)');
}


export function startDrawing(cursor, x, y) {
  cursor.isDrawing = true;
  cursor.lastX = x;
  cursor.lastY = y;
  console.log('[DrawCursor] Start drawing at bin:', cursor.binIndex);
}


export function stopDrawing(cursor) {
  cursor.isDrawing = false;
  console.log('[DrawCursor] Stop drawing at bin:', cursor.binIndex);
}




export function updateCursor(cursor, mouseX, mouseY, stitches, stitchSpacing) {
  if (!cursor.isDrawing || stitches.length === 0) return false;
  
  // Calculate movement vector and length
  const dx = mouseX - cursor.lastX;
  const dy = mouseY - cursor.lastY;
  const segmentLength = Math.sqrt(dx * dx + dy * dy);
  
  if (segmentLength < 0.5) return false; // ignore small movements
  
  // Calculate movement direction (unit vector)
  const dirX = dx / segmentLength;
  const dirY = dy / segmentLength;
  const angle = Math.atan2(dy, dx);
  
  // Accumulate this segment's distance
  cursor.accumulatedDistance += segmentLength;
  
  // Place stitches along this segment at fixed spacing
  let updated = false;
  let placedCount = 0;
  
  while (cursor.accumulatedDistance >= stitchSpacing && cursor.binIndex < stitches.length) {
    const currentStitch = stitches[cursor.binIndex];
    
    // Calculate exact position for this stitch
    // Starting from segment start (lastX, lastY), move along direction to stitch position
    const distanceFromSegmentStart = segmentLength - cursor.accumulatedDistance + stitchSpacing;
    const stitchX = cursor.lastX + dirX * distanceFromSegmentStart;
    const stitchY = cursor.lastY + dirY * distanceFromSegmentStart;
    
    // Record drawn stitch with calculated position
    cursor.drawnStitches.push({
      stitchIndex: cursor.binIndex,
      x: stitchX,
      y: stitchY,
      angle: angle,              // Tangent direction for stitch orientation
      stitch: currentStitch
    });
    
    // Move to next bin
    cursor.binIndex++;
    cursor.accumulatedDistance -= stitchSpacing;
    updated = true;
    placedCount++;
    
    // Safety check: avoid placing too many stitches in one update
    if (placedCount > 100) {
      console.warn('[DrawCursor] Placed', placedCount, 'stitches in one update, breaking');
      break;
    }
  }
  
  // Update last position to current mouse position
  cursor.lastX = mouseX;
  cursor.lastY = mouseY;
  
  return updated;
}


export function calculateStitchSpacing(canvasWidth, totalStitches, stitchWidth) {
  if (totalStitches === 0) return stitchWidth;
  return Math.max(stitchWidth, canvasWidth / totalStitches);
}


// Draws stitches progressively based on draw cursor's recorded positions
export function drawProgressiveStitches(p, stitchRenderer, cursor) {
  if (!cursor || !cursor.drawnStitches) return;

  p.noStroke();
  p.colorMode(p.HSL, 360, 100, 100);

  for (const drawnStitch of cursor.drawnStitches) {
    drawStitchAtPosition(p, stitchRenderer, drawnStitch.stitch, drawnStitch.x, drawnStitch.y, drawnStitch.angle, 1.0);
  }
}

function drawStitchAtPosition(p, stitchRenderer, stitch, x, y, angle, alpha = 1.0) {
  p.push();
  p.translate(x, y);
  p.rotate(angle);

  const tempStitch = { ...stitch, x: 0, y: 0 };

  if (alpha < 1.0) {
    const adjustedAlpha = alpha * 0.5 + 0.5;
    p.drawingContext.globalAlpha = adjustedAlpha;
  }

  stitchRenderer.drawStitch(tempStitch);

  if (alpha < 1.0) {
    p.drawingContext.globalAlpha = 1.0;
  }

  p.pop();
}
