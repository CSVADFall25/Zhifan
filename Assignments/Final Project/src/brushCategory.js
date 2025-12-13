export function createBrushCategory(p, getSegmentation) {
  // Store all animated strokes with their metadata
  let animatedStrokes = [];
  let completedStrokes = []; // Strokes that finished drawing and persist for animation
  let brushSize = 20; // --FSR data
  let isDrawing = false;
  let currentStroke = null;
  let currentPreviewStroke = null;
  let currentStrokeSeed = null;
  let drawingBrushType = null;
  let bindings = []; // Body part bindings for tracking movement


  // Compute part statistics from body segmentation
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
      stats[id] = { cx, cy };
    }
    return stats;
  };

 
  const createBinding = (strokePoints, rect, isMirrored = false) => {
    const segmentation = getSegmentation();
    if (!segmentation || !segmentation.data || !segmentation.mask) return null;
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height };

    const partStats = computePartStats(segmentation, isMirrored);
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


  // Resample stroke points with interpolation
  const resampleStrokePoints = (points, interpolationDistance) => {
    const sampledPoints = [];
    for (let i = 0; i < points.length; i++) {
      sampledPoints.push(points[i]);
      // Add interpolated points between consecutive points
      if (i < points.length - 1) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = p.dist(p1.x, p1.y, p2.x, p2.y);
        // Add intermediate points based on distance
        const steps = Math.ceil(dist / interpolationDistance);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const ix = p.lerp(p1.x, p2.x, t);
          const iy = p.lerp(p1.y, p2.y, t);
          sampledPoints.push(p.createVector(ix, iy));
        }
      }
    }
    return sampledPoints;
  };



 
  // -------------------BRUSH 1: Cloud/Smoke Brush + Drifting Effect---------------------
  // Parameters:
  //   - particleCount: Number of particles in each brush spot 
  //   - particleSize: Base size of each particle (larger = bigger cloud) 
  //   - spreadRadius: How spread out the particles are (larger = more dispersed)
  //   - opacity: Alpha value 0-255 (lower = more transparent)
  //   - driftAmount: How much particles move during animation (larger = more movement)
  //   - driftSpeed: How fast particles move (larger = faster movement)
  
  const createCloudBrush = (points, color) => {
    const particleCount = 5;
    const particleSize = brushSize * 2;
    const spreadRadius = brushSize * 1.2;
    const opacity = 40;
    const driftAmount = brushSize * 0.5;
    const driftSpeed = 0.1;

    // Resample points for denser coverage
    const denseSampledPoints = resampleStrokePoints(points, brushSize * 0.3);

    const particles = [];
    
  
    for (let i = 0; i < denseSampledPoints.length; i++) {
      const pt = denseSampledPoints[i];

      for (let j = 0; j < particleCount; j++) {
        const angle = p.random(p.TWO_PI);
        const distance = p.random(0, spreadRadius);
        const offsetX = p.cos(angle) * distance;
        const offsetY = p.sin(angle) * distance;
        
        particles.push({
          x: pt.x + offsetX,
          y: pt.y + offsetY,
          baseX: pt.x + offsetX,
          baseY: pt.y + offsetY,
          size: p.random(particleSize * 0.5, particleSize),

          phase: p.random(p.TWO_PI),
          driftAmount: driftAmount,
          driftSpeed: driftSpeed
        });
      }
    }

    return {
      type: 'cloud',
      particles: particles,
      color: color,
      opacity: opacity,
      age: 0,
      maxAge: 60, // Animation duration in frames
      persistent: true,
      baseBrushSize: brushSize,
      idlePhase: p.random(p.TWO_PI),
      idleSpeed: p.random(0.01, 0.03)
    };
  };

  // Cloud Animiation
  const drawCloudBrush = (stroke, time, deltaX = 0, deltaY = 0) => {
    p.push();
    p.noStroke();
    
    for (const particle of stroke.particles) {
      // Calculate drift movement
      const drift = p.sin(time * particle.driftSpeed + particle.phase) * particle.driftAmount;
      const driftY = p.cos(time * particle.driftSpeed + particle.phase) * particle.driftAmount * 0.5;
      
      const x = particle.baseX + drift + deltaX;
      const y = particle.baseY + driftY + deltaY;
      
      p.fill(p.red(stroke.color), p.green(stroke.color), p.blue(stroke.color), stroke.opacity);
      
      p.circle(x, y, particle.size);
    }
    p.pop();
  };






  //------------------------------ BRUSH 2: Spiky Brush + Shaking Effect---------------------
  // Parameters
  //   - bristleCount: Number of bristles (more = denser, more = slower)
  //   - bristleLength: Length of each bristle line (longer = more spiky)
  //   - bristleWidth: Stroke width of bristles (thicker = bolder)
  //   - jitterAmount: How much bristles shake (larger = more movement)
  //   - jitterSpeed: How fast bristles shake (larger = faster shaking)
  //   - bristleDensity: How close bristles are to each other (smaller = denser)
  
  const createSpikyBrush = (points, color) => {
    const bristleCount = 80;
    const bristleLength = brushSize * 1.2;
    const bristleWidth = 1.5;
    const jitterAmount = brushSize * 0.5;
    const jitterSpeed = 0.8;
    const bristleDensity = brushSize * 0.25;

    // Resample points for denser coverage
    const denseSampledPoints = resampleStrokePoints(points, brushSize * 0.25);

    const bristles = [];
    
 
    for (let i = 0; i < denseSampledPoints.length; i++) {
      const pt = denseSampledPoints[i];

      for (let j = 0; j < bristleCount / Math.max(1, denseSampledPoints.length); j++) {
        const angle = p.random(p.TWO_PI);
        const distance = p.random(0, bristleDensity);
        const baseX = pt.x + p.cos(angle) * distance;
        const baseY = pt.y + p.sin(angle) * distance;
        
        const bristleAngle = p.atan2(pt.y - baseY, pt.x - baseX);
        const endX = baseX + p.cos(bristleAngle) * bristleLength;
        const endY = baseY + p.sin(bristleAngle) * bristleLength;
        
        bristles.push({
          baseX: baseX,
          baseY: baseY,
          endX: endX,
          endY: endY,
          bristleAngle: bristleAngle,
          length: bristleLength,

          phase: p.random(p.TWO_PI),
          jitterAmount: jitterAmount,
          jitterSpeed: jitterSpeed
        });
      }
    }

    return {
      type: 'spiky',
      bristles: bristles,
      color: color,
      strokeWidth: bristleWidth,
      age: 0,
      maxAge: 80, 
      persistent: true, 
      baseBrushSize: brushSize,
      idlePhase: p.random(p.TWO_PI),
      idleSpeed: p.random(0.01, 0.03)
    };
  };

  // Spiky Animation
  const drawSpikyBrush = (stroke, time, deltaX = 0, deltaY = 0) => {
    p.push();
    p.stroke(p.red(stroke.color), p.green(stroke.color), p.blue(stroke.color));
    p.strokeWeight(stroke.strokeWidth);
    
    for (const bristle of stroke.bristles) {
    
      const lengthMultiplier = 0.5 + 0.5 * p.sin(time * bristle.jitterSpeed + bristle.phase);
      const animatedLength = bristle.length * lengthMultiplier;
      
      // Calculate end point based on animated length
      const x1 = bristle.baseX + deltaX;
      const y1 = bristle.baseY + deltaY;
      const x2 = bristle.baseX + p.cos(bristle.bristleAngle) * animatedLength + deltaX;
      const y2 = bristle.baseY + p.sin(bristle.bristleAngle) * animatedLength + deltaY;
      
      p.line(x1, y1, x2, y2);
    }
    p.pop();
  };






  // -------------------------------------------BRUSH 3: Wave Line Brush-------------------------
  // Parameters:
  //   - lineCount: Number of parallel wave lines
  //   - lineSpacing: Distance between parallel lines
  
  const createWaveBrush = (points, color) => {
    const lineCount = 3; 
    const lineSpacing = brushSize * 0.4; // Space between lines
    const strokeWidth = 2;
    
    const lines = [];
    
    for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
      
      const waveAmplitude = p.random(brushSize * 0.3, brushSize * 0.8); // wave height
      const waveFreq = p.random(0.1, 0.25); // wave frequency
      const wavePhase = p.random(p.TWO_PI); // starting phase
      

      const linePoints = [];
      for (let i = 0; i < points.length; i++) {
        linePoints.push(points[i]);
        
 
        if (i < points.length - 1) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const dist = p.dist(p1.x, p1.y, p2.x, p2.y);
          const steps = Math.max(1, Math.ceil(dist / 5));
          
          for (let step = 1; step < steps; step++) {
            const t = step / steps;
            const ix = p.lerp(p1.x, p2.x, t);
            const iy = p.lerp(p1.y, p2.y, t);
            linePoints.push(p.createVector(ix, iy));
          }
        }
      }
      

      let offsetX = (lineIdx - lineCount / 2 + 0.5) * lineSpacing;
      let offsetY = (lineIdx - lineCount / 2 + 0.5) * lineSpacing;
      
      lines.push({
        points: linePoints,
        waveAmplitude: waveAmplitude,
        waveFrequency: waveFreq,
        wavePhase: wavePhase,
        offsetX: offsetX,
        offsetY: offsetY
      });
    }
    
    return {
      type: 'wave',
      lines: lines,
      color: color,
      strokeWidth: strokeWidth,
      age: 0,
      maxAge: 200,
      persistent: true,
      baseBrushSize: brushSize,
      idlePhase: p.random(p.TWO_PI),
      idleSpeed: p.random(0.01, 0.03)
    };
  };
  
  const drawWaveBrush = (stroke, time, deltaX = 0, deltaY = 0) => {
    p.push();
    p.stroke(p.red(stroke.color), p.green(stroke.color), p.blue(stroke.color));
    p.strokeWeight(stroke.strokeWidth);
    p.noFill();
    
    for (const line of stroke.lines) {
      p.beginShape();
      
      for (let i = 0; i < line.points.length; i++) {
        const basePoint = line.points[i];
  
        const waveOffset = Math.sin(i * line.waveFrequency + line.wavePhase + time * 0.05) * line.waveAmplitude;
        
        const dx = -Math.sin(i * line.waveFrequency + line.wavePhase) * line.waveAmplitude * 0.3; //horizontal offset
        const dy = Math.cos(i * line.waveFrequency + line.wavePhase) * line.waveAmplitude * 0.3; //vertical offset
        
        // Parallel line offset + wave offset + body movement offset
        const finalX = basePoint.x + line.offsetX + dx + waveOffset * 0.2 + deltaX;
        const finalY = basePoint.y + line.offsetY + dy + waveOffset + deltaY;
        
        p.vertex(finalX, finalY);
      }
      
      p.endShape();
    }
    
    p.pop();
  };




  // ----------------------------------Public Interface------------------------------

  const getIdleOffset = (stroke, time) => {
    if (!stroke) {
      return { x: 0, y: 0 };
    }
    const baseSize = stroke.baseBrushSize || brushSize || 10;
    const amplitude = baseSize * 0.08;
    const speed = stroke.idleSpeed || 0.02;
    const phase = stroke.idlePhase || 0;
    return {
      x: p.sin(time * speed + phase) * amplitude,
      y: p.cos(time * speed + phase) * amplitude * 0.6
    };
  };

  const regeneratePreviewStroke = () => {
    if (!isDrawing || !currentStroke || currentStroke.points.length < 2) {
      currentPreviewStroke = null;
      return;
    }

    if (currentStrokeSeed === null) {
      currentStrokeSeed = Math.floor(Math.random() * 1000000000);
    }

    p.randomSeed(currentStrokeSeed);
    switch (currentStroke.brushType) {
      case 'cloud':
        currentPreviewStroke = createCloudBrush(currentStroke.points, currentStroke.color);
        break;
      case 'spiky':
        currentPreviewStroke = createSpikyBrush(currentStroke.points, currentStroke.color);
        break;
      case 'wave':
        currentPreviewStroke = createWaveBrush(currentStroke.points, currentStroke.color);
        break;
      default:
        currentPreviewStroke = null;
    }
    p.randomSeed(Date.now());
  };


  // Start continuous drawing
  const startDrawing = (brushType, color) => {
    isDrawing = true;
    drawingBrushType = brushType;
    currentStrokeSeed = Math.floor(Math.random() * 1000000000);
    currentStroke = {
      points: [],
      color: color,
      brushType: brushType
    };
    currentPreviewStroke = null;
  };

  // Add point to current stroke during drawing
  const addPoint = (x, y) => {
    if (!isDrawing || !currentStroke) return;
    
    currentStroke.points.push(p.createVector(x, y));
    regeneratePreviewStroke();
  };

  // Finish drawing and convert to animated stroke
  const finishDrawing = (rect = null, isMirrored = false) => {
    if (!isDrawing || !currentStroke || currentStroke.points.length < 2) {
      isDrawing = false;
      currentStroke = null;
      return;
    }
    
    if (currentStrokeSeed === null) {
      currentStrokeSeed = Math.floor(Math.random() * 1000000000);
    }

    p.randomSeed(currentStrokeSeed);
    const sourcePoints = currentStroke.points.map((pt) => ({ x: pt.x, y: pt.y }));

    let stroke;
    switch (currentStroke.brushType) {
      case 'cloud':
        stroke = createCloudBrush(currentStroke.points, currentStroke.color);
        break;
      case 'spiky':
        stroke = createSpikyBrush(currentStroke.points, currentStroke.color);
        break;
      case 'wave':
        stroke = createWaveBrush(currentStroke.points, currentStroke.color);
        break;
      default:
        isDrawing = false;
        currentStroke = null;
        currentStrokeSeed = null;
        return;
    }
    p.randomSeed(Date.now());
    
    // Add to completed strokes
    completedStrokes.push(stroke);
    stroke.__sourcePoints = sourcePoints;
    const rectForBinding = rect ? { x: rect.x, y: rect.y, w: rect.w, h: rect.h } : { x: 0, y: 0, w: p.width, h: p.height };
    stroke.__rect = rectForBinding;
    stroke.__isMirrored = isMirrored;
    
    // Create binding for body movement tracking
    const binding = createBinding(sourcePoints, rectForBinding, isMirrored);
    if (binding) {
      binding.brushType = currentStroke.brushType; // Store brush type for drawing
      bindings.push(binding);
    } else {
      bindings.push(null);
    }
    
    isDrawing = false;
    currentStroke = null;
    currentPreviewStroke = null;
    currentStrokeSeed = null;
  };


  const addStroke = (points, brushType, color) => {
    if (points.length < 2) return;

    let stroke;
    switch (brushType) {
      case 'cloud':
        stroke = createCloudBrush(points, color);
        break;
      case 'spiky':
        stroke = createSpikyBrush(points, color);
        break;
      case 'wave':
        stroke = createWaveBrush(points, color);
        break;
      default:
        return;
    }

    completedStrokes.push(stroke);
  };

  // Update and draw all animated strokes
  const draw = (time, rect = null, isMirrored = false) => {
    // Get current body part positions for tracking
    const segmentation = getSegmentation();
    const partStats = segmentation ? computePartStats(segmentation, isMirrored) : null;
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height };

    // Draw all completed strokes with body movement tracking
    for (let i = completedStrokes.length - 1; i >= 0; i--) {
      const stroke = completedStrokes[i];
      let binding = bindings[i];
      if (!binding && stroke.__sourcePoints && stroke.__rect) {
        const regenerated = createBinding(stroke.__sourcePoints, stroke.__rect, stroke.__isMirrored);
        if (regenerated) {
          regenerated.brushType = stroke.type;
          bindings[i] = regenerated;
          binding = regenerated;
        }
      }
      
      // Calculate body movement offset if binding exists
      let deltaCanvasX = 0;
      let deltaCanvasY = 0;
      if (binding && partStats && partStats[binding.partId]) {
        const stat = partStats[binding.partId];
        const w = segmentation.mask.width;
        const h = segmentation.mask.height;
        const deltaX = stat.cx - binding.originalPartCenterX;
        const deltaY = stat.cy - binding.originalPartCenterY;
        deltaCanvasX = deltaX * rect.w / w;
        deltaCanvasY = deltaY * rect.h / h;
      }

      const idleOffset = getIdleOffset(stroke, time);
      deltaCanvasX += idleOffset.x;
      deltaCanvasY += idleOffset.y;
      
      // Draw based on type with body movement offset
      switch (stroke.type) {
        case 'cloud':
          drawCloudBrush(stroke, time, deltaCanvasX, deltaCanvasY);
          break;
        case 'spiky':
          drawSpikyBrush(stroke, time, deltaCanvasX, deltaCanvasY);
          break;
        case 'wave':
          drawWaveBrush(stroke, time, deltaCanvasX, deltaCanvasY);
          break;
      }
      
      // Update age
      stroke.age++;
      if (!stroke.persistent && stroke.age > stroke.maxAge) {
        completedStrokes.splice(i, 1);
        bindings.splice(i, 1);
      }
    }

    // Draw the in-progress stroke for immediate feedback
    drawPreviewStroke(time);
  };

  const drawPreviewStroke = (time) => {
    if (!currentPreviewStroke) return;

    const idleOffset = getIdleOffset(currentPreviewStroke, time);

    switch (currentPreviewStroke.type) {
      case 'cloud':
        drawCloudBrush(currentPreviewStroke, time, idleOffset.x, idleOffset.y);
        break;
      case 'spiky':
        drawSpikyBrush(currentPreviewStroke, time, idleOffset.x, idleOffset.y);
        break;
      case 'wave':
        drawWaveBrush(currentPreviewStroke, time, idleOffset.x, idleOffset.y);
        break;
    }
  };

  // Set brush size ---FSR data
  const setBrushSize = (size) => {
    brushSize = p.constrain(size, 5, 100);
  };

  // Get current brush size
  const getBrushSize = () => {
    return brushSize;
  };

  // Clear all strokes
  const clear = () => {
    completedStrokes = [];
    currentStroke = null;
    isDrawing = false;
    currentPreviewStroke = null;
    currentStrokeSeed = null;
    bindings = [];
  };

  return {
    // Continuous drawing functions
    startDrawing,
    addPoint,
    finishDrawing,
    isDrawing: () => isDrawing,
    
    // Legacy functions
    addStroke,
    draw,
    setBrushSize,
    getBrushSize,
    clear,
    // Brush type constants
    CLOUD: 'cloud',
    SPIKY: 'spiky',
    WAVE: 'wave'
  };
}
