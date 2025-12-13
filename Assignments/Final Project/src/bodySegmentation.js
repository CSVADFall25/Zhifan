export function createBodySegmentation(p) {
  const options = {
    maskType: 'parts',
  };

  let bodySegmentation;
  let segmentation;
  let processedMask = null;
  let edgeBuffer = null;
  let videoRef = null;

  const init = (video) => {
    videoRef = video;
    bodySegmentation = ml5.bodySegmentation('BodyPix', options);
    bodySegmentation.detectStart(videoRef, (result) => {
      segmentation = result;
    });
  };

  const getSegmentation = () => segmentation;

  const processSegmentation = () => {
    if (!segmentation || !segmentation.mask || !segmentation.data) return;

    const mask = segmentation.mask;
    const data = segmentation.data;

    if (!processedMask || processedMask.width !== mask.width || processedMask.height !== mask.height) {
      processedMask = p.createImage(mask.width, mask.height);
    }
    if (!edgeBuffer || edgeBuffer.width !== mask.width || edgeBuffer.height !== mask.height) {
      edgeBuffer = p.createImage(mask.width, mask.height);
    }

    processedMask.loadPixels();
    edgeBuffer.loadPixels();

    const w = mask.width;
    const h = mask.height;

    // Clear buffers
    for (let i = 0; i < processedMask.pixels.length; i += 4) {
      processedMask.pixels[i + 3] = 0;
      edgeBuffer.pixels[i + 3] = 0;
    }

    // Fill body as white
    for (let i = 0; i < data.length; i++) {
      const partId = data[i];
      const pixelIdx = i * 4;
      if (partId >= 0 && partId <= 23) {
        processedMask.pixels[pixelIdx] = 255;
        processedMask.pixels[pixelIdx + 1] = 255;
        processedMask.pixels[pixelIdx + 2] = 255;
        processedMask.pixels[pixelIdx + 3] = 170;
      }
    }

    // Edge detection
    const edgePixels = new Set();
    const backgroundEdgePixels = new Set();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const partId = data[idx];
        if (partId >= 0 && partId <= 23) {
          let isEdge = false;
          let isBackgroundEdge = false;

          for (let dy = -1; dy <= 1 && !isBackgroundEdge; dy++) {
            for (let dx = -1; dx <= 1 && !isBackgroundEdge; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
                isBackgroundEdge = true;
                break;
              }
              const nIdx = ny * w + nx;
              const neighborPartId = data[nIdx];
              if (neighborPartId < 0 || neighborPartId > 23) {
                isBackgroundEdge = true;
                break;
              }
              if (neighborPartId !== partId) {
                isEdge = true;
              }
            }
          }

          if (isBackgroundEdge) {
            backgroundEdgePixels.add(idx);
          } else if (isEdge) {
            edgePixels.add(idx);
          }
        }
      }
    }

    // Draw inner edges
    for (const idx of edgePixels) {
      const pixelIdx = idx * 4;
      edgeBuffer.pixels[pixelIdx] = 0;
      edgeBuffer.pixels[pixelIdx + 1] = 0;
      edgeBuffer.pixels[pixelIdx + 2] = 0;
      edgeBuffer.pixels[pixelIdx + 3] = 255;
    }

    // Draw background edges
    for (const idx of backgroundEdgePixels) {
      const x = idx % w;
      const y = Math.floor(idx / w);
      const pixelIdx = idx * 4;
      edgeBuffer.pixels[pixelIdx] = 0;
      edgeBuffer.pixels[pixelIdx + 1] = 0;
      edgeBuffer.pixels[pixelIdx + 2] = 0;
      edgeBuffer.pixels[pixelIdx + 3] = 255;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nIdx = ny * w + nx;
            const nPix = nIdx * 4;
            if (edgeBuffer.pixels[nPix + 3] === 0) {
              edgeBuffer.pixels[nPix] = 0;
              edgeBuffer.pixels[nPix + 1] = 0;
              edgeBuffer.pixels[nPix + 2] = 0;
              edgeBuffer.pixels[nPix + 3] = 255;
            }
          }
        }
      }
    }

    processedMask.updatePixels();
    edgeBuffer.updatePixels();
  };

  const draw = (rect) => {
    processSegmentation();
    if (!rect) rect = { x: 0, y: 0, w: p.width, h: p.height };
    if (processedMask) {
      p.image(processedMask, rect.x, rect.y, rect.w, rect.h);
    }
    if (edgeBuffer) {
      p.image(edgeBuffer, rect.x, rect.y, rect.w, rect.h);
    }
  };

  return {
    init,
    draw,
    getSegmentation,
  };
}
