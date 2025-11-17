// Application state container

export function createAppState() {
  return {
    // Raw messages array: each contains sender, timestamp, type, content, etc.
    raw: null,

    // Aggregated result: { bins: [{start, end, counts:{A,B,total}, call:{voice,video}}, ...] }
    currentAgg: null,

    // Time resolution: 'day' | 'week'
    timeResolution: 'day',

    // Color palette
    palette: null,

    // Drawing parameters
    blockSizeScale: 1.0,         // Stitch size scale 
    startTimeIdx: 0,             // Starting bin index for drawing
    initialStartTimeIdx: 0,      // Initial start time set by user
    drawCursor: null,            

    // Gradient
    gradientCache: new Map(),
    
    // Total timeline length
    timelineLength: 0,
  };
}