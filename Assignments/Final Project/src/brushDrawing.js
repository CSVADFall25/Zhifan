// Manages strokes that follow body movement
export function createBrushDrawing(p, getSegmentation) {
  let isDrawing = false;
  let currentStroke = [];
  let strokes = [];
  let bindings = [];
  let lastColorPosition = null;
  const smoothingFactor = 0.3; 

  // Track color detection position and add to stroke
  const updateColorPosition = (colorMatch, rect, isMirrored = false) => {
    if (!colorMatch) {
      // No color detected, end current stroke if drawing
      if (isDrawing && currentStroke.length > 0) {
        const binding = createBinding(currentStroke, rect, isMirrored);
        strokes.push([...currentStroke]);
        bindings.push(binding);
        currentStroke = [];
      }
      isDrawing = false;
      lastColorPosition = null;
      return;
    }

    // Convert color position from video (1280x960) coordinates to canvas coordinates
    let canvasX = rect.x + colorMatch.x * rect.w / 1280; 
    let canvasY = rect.y + colorMatch.y * rect.h / 960;  
    
    // Mirror
    if (isMirrored) {
      canvasX = rect.x + rect.w - (colorMatch.x * rect.w / 1280);
    }

    // smooth position
    let smoothX = canvasX;
    let smoothY = canvasY;
    if (lastColorPosition) {
      smoothX = p.lerp(lastColorPosition.x, canvasX, smoothingFactor);
      smoothY = p.lerp(lastColorPosition.y, canvasY, smoothingFactor);
    }

    // Start new stroke if not drawing
    if (!isDrawing) {
      isDrawing = true;
      currentStroke = [p.createVector(smoothX, smoothY)];
    } else {
      // Only add point if it moved enough distance (reduce redundant points)
      const lastPoint = currentStroke[currentStroke.length - 1];
      const dist = p.dist(smoothX, smoothY, lastPoint.x, lastPoint.y);
      if (dist > 2) { // Minimum distance threshold
        currentStroke.push(p.createVector(smoothX, smoothY));
      }
    }

    lastColorPosition = { x: smoothX, y: smoothY };
  };

  // Clear all strokes
  const clearStrokes = () => {
    strokes = [];
    bindings = [];
    currentStroke = [];
    isDrawing = false;
    lastColorPosition = null;
  };

  const onMousePressed = (rect) => {
  };

  const onMouseDragged = (rect) => {
  };

  const onMouseReleased = (rect) => {
  };

  // Compute body part statistics for current segmentation
  const computePartStats = (segmentation, isMirrored = false) => {
    if (!segmentation || !segmentation.data || !segmentation.mask) return null;
    const data = segmentation.data;
    const w = segmentation.mask.width;
    const h = segmentation.mask.height;

    const count = Array(24).fill(0);
    const sumX = Array(24).fill(0);
    const sumY = Array(24).fill(0);

    for (let i = 0; i < data.length; i++) {
      const partId = data[i];
      if (partId >= 0 && partId <= 23) {
        let x = i % w;
        const y = Math.floor(i / w);
        // Mirror
        if (isMirrored) {
          x = w - 1 - x;
        }
        count[partId]++;
        sumX[partId] += x;
        sumY[partId] += y;
      }
    }

    const stats = {};
    for (let id = 0; id <= 23; id++) {
      if (count[id] === 0) continue;
      const cx = sumX[id] / count[id];
      const cy = sumY[id] / count[id];
      stats[id] = {
        cx,
        cy,
      };
    }
    return stats;
  };

  const createBinding = (strokePoints, rect, isMirrored = false) => {
    const segmentation = getSegmentation();
    if (!segmentation || !segmentation.data || !segmentation.mask) return null;
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height };

    const partStats = computePartStats(segmentation);
    if (!partStats) return null;

    // Stroke center in canvas coordinates
    let centerCanvasX = 0;
    let centerCanvasY = 0;
    for (const pt of strokePoints) {
      centerCanvasX += pt.x;
      centerCanvasY += pt.y;
    }
    centerCanvasX /= strokePoints.length;
    centerCanvasY /= strokePoints.length;

    // Convert to mask coordinates (accounting for mirror)
    const w = segmentation.mask.width;
    const h = segmentation.mask.height;
    let centerMaskX = ((centerCanvasX - rect.x) / rect.w) * w;
    if (isMirrored) {
      centerMaskX = ((rect.x + rect.w - centerCanvasX) / rect.w) * w;
    }
    centerMaskX = Math.floor(p.constrain(centerMaskX, 0, w - 1));
    const centerMaskY = Math.floor(p.constrain(((centerCanvasY - rect.y) / rect.h) * h, 0, h - 1));

    const data = segmentation.data;
    const centerIdx = centerMaskY * w + centerMaskX;
    let partId = data[centerIdx];

    // If on background, find nearest available part center
    if (partId < 0 || partId > 23 || !partStats[partId]) {
      let bestId = -1;
      let bestDist = Infinity;
      for (const [idStr, stat] of Object.entries(partStats)) {
        const id = Number(idStr);
        const dx = stat.cx - centerMaskX;
        const dy = stat.cy - centerMaskY;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      }
      partId = bestId;
      if (partId === -1) return null;
    }

    const stat = partStats[partId];
    if (!stat) return null;

    return {
      partId,
      originalPartCenterX: stat.cx,
      originalPartCenterY: stat.cy,
      points: strokePoints.map((pt) => ({ x: pt.x, y: pt.y })),
    };
  };

  const drawStrokes = (rect, isMirrored = false) => {
    const segmentation = getSegmentation();
    if (!segmentation || !segmentation.data || !segmentation.mask) return;
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height };

    const partStats = computePartStats(segmentation, isMirrored);
    if (!partStats) return;

    const w = segmentation.mask.width;
    const h = segmentation.mask.height;

    p.stroke(0, 0, 255);
    p.strokeWeight(3);
    p.noFill();

    for (let i = 0; i < bindings.length; i++) {
      const binding = bindings[i];
      if (!binding) continue;
      const stat = partStats[binding.partId];
      if (!stat) continue; // part not visible, hide stroke

      // Compute delta from original part center to current part center

      const deltaX = stat.cx - binding.originalPartCenterX;
      const deltaY = stat.cy - binding.originalPartCenterY;

      const deltaCanvasX = deltaX * rect.w / w;
      const deltaCanvasY = deltaY * rect.h / h;

      // Draw curveVertex
      if (binding.points.length > 2) {
        p.beginShape();
        // first point as control point
        const first = binding.points[0];
        p.curveVertex(first.x + deltaCanvasX, first.y + deltaCanvasY);
        
        for (const pt of binding.points) {
          p.curveVertex(pt.x + deltaCanvasX, pt.y + deltaCanvasY);
        }
        
        // Use last point as control point
        const last = binding.points[binding.points.length - 1];
        p.curveVertex(last.x + deltaCanvasX, last.y + deltaCanvasY);
        p.endShape();
      } else {
        // Fallback for short strokes
        p.beginShape();
        for (const pt of binding.points) {
          p.vertex(pt.x + deltaCanvasX, pt.y + deltaCanvasY);
        }
        p.endShape();
      }
    }

    if (isDrawing && currentStroke.length > 0) {
      p.stroke(255, 0, 0);
      p.strokeWeight(4);
      
      // Current stroke is also already in canvas coordinates
      if (currentStroke.length > 2) {
        p.beginShape();
        p.curveVertex(currentStroke[0].x, currentStroke[0].y);
        for (const pt of currentStroke) {
          p.curveVertex(pt.x, pt.y);
        }
        const last = currentStroke[currentStroke.length - 1];
        p.curveVertex(last.x, last.y);
        p.endShape();
      } else {
        p.beginShape();
        for (const pt of currentStroke) {
          p.vertex(pt.x, pt.y);
        }
        p.endShape();
      }
    }
  };

  return {
    onMousePressed,
    onMouseDragged,
    onMouseReleased,
    drawStrokes,
    updateColorPosition,
    clearStrokes,
  };
}
