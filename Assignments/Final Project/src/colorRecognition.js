export function createColorRecognition(p) {
  let tolerance = 20; 
  
  // Define color palette to recognize
  const palette = [
    { r: 240, g: 122, b: 195, name: 'pink' }, 
    { r: 163, g: 212, b: 222, name: 'blue' }, 
    { r: 237, g: 196, b: 108, name: 'yellow' } 
  ];
  
  let currentColorIndex = 0;
  let lastMatch = null;
  let detectedColor = null;
  const getCurrentColor = () => detectedColor;

  const switchColor = () => {
    currentColorIndex = (currentColorIndex + 1) % palette.length;
  };

  // Update color match
  const updateMatch = (video) => {
    if (!video || !video.pixels || video.pixels.length === 0) {
      detectedColor = null;
      lastMatch = null;
      return;
    }

    const { color, match } = findBestMatchingColor(video);
    if (color && match) {
      detectedColor = color;
      lastMatch = match;
    } else {
      detectedColor = null;
      lastMatch = null;
    }
  };

  const draw = (video, rect, isMirrored = false) => {
    if (!video || video.width === 0 || video.height === 0) return;
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height, scale: 1 };
    
    const currentColor = getCurrentColor();
    
    // Find color
    if (!currentColor) {
      detectedColor = null;
      lastMatch = null;
    } else {
      const matchResult = findColor(video, currentColor, tolerance);
      lastMatch = matchResult?.match ?? null;
      if (!lastMatch) {
        detectedColor = null;
      }
    }
    
    drawColorIndicator(rect, currentColor, isMirrored);
    
    // Draw detection circle if match found
    if (lastMatch) {
      let canvasX = rect.x + lastMatch.x * rect.w / video.width;
      let canvasY = rect.y + lastMatch.y * rect.h / video.height;
      
      // Mirror the x coordinate
      if (isMirrored) {
        canvasX = rect.x + rect.w - (lastMatch.x * rect.w / video.width);
      }
      
      p.stroke(255);
      p.strokeWeight(5);
      p.fill(currentColor.r, currentColor.g, currentColor.b, 200);
      p.circle(canvasX, canvasY, 50);
    }
  };

  const drawColorIndicator = (rect, color, isMirrored = false) => {
    const indicatorWidth = 40;
    const indicatorHeight = 40;
    let indicatorX = rect.x - indicatorWidth - 15;
    const indicatorY = rect.y;
    
    // Mirror indicator position
    if (isMirrored) {
      indicatorX = rect.x + rect.w + 15;
    }
    
    p.fill(color.r, color.g, color.b);
    p.stroke(0);
    p.strokeWeight(2);
    p.rect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
  };

  const findColor = (input, colorObj, tol) => {
    if (!input.pixels || input.pixels.length === 0) {
      return null;
    }
    
    const matchR = colorObj.r;
    const matchG = colorObj.g;
    const matchB = colorObj.b;
    const step = 5; // Sample every 5 pixels

    let bestMatch = null;
    let bestScore = Number.POSITIVE_INFINITY;

    // Search through original video pixels with sampling
    for (let y = 0; y < input.height; y += step) {
      for (let x = 0; x < input.width; x += step) {
        const idx = (x + y * input.width) * 4;
        const r = input.pixels[idx];
        const g = input.pixels[idx + 1];
        const b = input.pixels[idx + 2];
        
        // Check if pixel matches target color within tolerance
        const dr = Math.abs(r - matchR);
        const dg = Math.abs(g - matchG);
        const db = Math.abs(b - matchB);
        if (dr <= tol && dg <= tol && db <= tol) {
          const score = dr * dr + dg * dg + db * db;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { x, y };
          }
        }
      }
    }
    
    if (!bestMatch) {
      return null;
    }

    return { match: bestMatch, score: bestScore };
  };

  const findBestMatchingColor = (video) => {
    let bestResult = { color: null, match: null, score: Number.POSITIVE_INFINITY };

    for (let i = 0; i < palette.length; i++) {
      const color = palette[i];
      const result = findColor(video, color, tolerance);
      if (result && result.match && result.score < bestResult.score) {
        bestResult = { color, match: result.match, score: result.score };
        currentColorIndex = i;
      }
    }

    return bestResult;
  };

  const setTolerance = (t) => {
    tolerance = t;
  };

  return {
    draw,
    switchColor,
    setTolerance,
    getCurrentColor,
    getLastMatch: () => lastMatch,
    updateMatch
  };
}
