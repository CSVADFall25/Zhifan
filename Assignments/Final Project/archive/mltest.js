let bodySegmentation;
let video;
let segmentation;
let step = 10; 

let options = {
  maskType: "parts", // 输出彩色身体部位 + 白色背景
};

// 缓存用于避免频闪
let processedMask = null;
let edgeBuffer = null;

function preload() {
  bodySegmentation = ml5.bodySegmentation("BodyPix", options);
}

function setup() {
  createCanvas(640, 480);
  // Create the video
  video = createCapture(VIDEO);
  video.size(640, 480);
  //video.elt.setAttribute('playsinline', ''); // 避免某些设备全屏/闪烁
  video.hide();

  bodySegmentation.detectStart(video, gotResults);
}

function draw() {
  // 先绘制视频背景
  //image(video, 0, 0, width, height);
  video.loadPixels();

  for (let y = 0; y < video.height; y += step) {
    for (let x = 0; x < video.width; x += step) {
      let index = (x + y * video.width) * 4;
      let r = video.pixels[index];
      let g = video.pixels[index + 1];
      let b = video.pixels[index + 2];

      // 灰度
      let brightness = (r + g + b) / 3;

      // 亮度越暗 → 点越大
      let radius = map(brightness, 0, 255, step, 1);

      fill(0);
      ellipse(x, y, radius, radius);
    }
  }

  background(239, 233, 227, 240);

  if (segmentation && segmentation.mask && segmentation.data) {
    processSegmentationData();
    
    // 绘制处理后的白色身体
    if (processedMask) {
      image(processedMask, 0, 0, width, height);
    }
    
    // 绘制黑色边缘
    if (edgeBuffer) {
      image(edgeBuffer, 0, 0, width, height);
    }
  }
}

// 处理分割数据：将身体部位改为白色，检测边缘
function processSegmentationData() {
  let mask = segmentation.mask;
  let data = segmentation.data; // 每像素的部位ID数组
  
  // 初始化或重用缓存
  if (!processedMask || processedMask.width !== mask.width || processedMask.height !== mask.height) {
    processedMask = createImage(mask.width, mask.height);
  }
  if (!edgeBuffer || edgeBuffer.width !== mask.width || edgeBuffer.height !== mask.height) {
    edgeBuffer = createImage(mask.width, mask.height);
  }
  
  processedMask.loadPixels();
  edgeBuffer.loadPixels();
  
  const w = mask.width;
  const h = mask.height;
  
  // 清空两个缓冲
  for (let i = 0; i < processedMask.pixels.length; i += 4) {
    processedMask.pixels[i + 3] = 0;     // 透明
    edgeBuffer.pixels[i + 3] = 0;        // 透明
  }
  
  // 快速填充：身体部位变白，背景透明
  for (let i = 0; i < data.length; i++) {
    const partId = data[i];
    const pixelIdx = i * 4;
    
    if (partId >= 0 && partId <= 23) {
      // 这是身体部位 (partId = 0-23)
      processedMask.pixels[pixelIdx] = 255;     // R
      processedMask.pixels[pixelIdx + 1] = 255; // G
      processedMask.pixels[pixelIdx + 2] = 255; // B
      processedMask.pixels[pixelIdx + 3] = 170; // A
    }
  }
  
  // 第一步：标记所有边缘像素
  let edgePixels = new Set(); // 普通边缘（身体部位之间）
  let backgroundEdgePixels = new Set(); // 背景边缘（身体与背景）
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const partId = data[idx];
      
      if (partId >= 0 && partId <= 23) { // 身体像素 (0-23)
        let isEdge = false;
        let isBackgroundEdge = false;
        
        // 检查 8 邻域
        for (let dy = -1; dy <= 1 && !isBackgroundEdge; dy++) {
          for (let dx = -1; dx <= 1 && !isBackgroundEdge; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            // 边界 = 背景边缘
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
              isBackgroundEdge = true;
              break;
            }
            
            const neighborIdx = ny * w + nx;
            const neighborPartId = data[neighborIdx];
            
            // 相邻是背景
            if (neighborPartId < 0 || neighborPartId > 23) {
              isBackgroundEdge = true;
              break;
            }
            
            // 相邻是不同身体部位
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
  
  // 第二步：绘制普通边缘（身体部位之间）
  for (let idx of edgePixels) {
    const pixelIdx = idx * 4;
    edgeBuffer.pixels[pixelIdx] = 0;       // R
    edgeBuffer.pixels[pixelIdx + 1] = 0;   // G
    edgeBuffer.pixels[pixelIdx + 2] = 0;   // B
    edgeBuffer.pixels[pixelIdx + 3] = 255; // A
  }
  
  // 第三步：绘制背景边缘 + 扩张（加倍宽度）
  for (let idx of backgroundEdgePixels) {
    const x = idx % w;
    const y = Math.floor(idx / w);
    const pixelIdx = idx * 4;
    
    // 绘制当前像素
    edgeBuffer.pixels[pixelIdx] = 0;
    edgeBuffer.pixels[pixelIdx + 1] = 0;
    edgeBuffer.pixels[pixelIdx + 2] = 0;
    edgeBuffer.pixels[pixelIdx + 3] = 255;
    
    // 扩张：在邻域内也绘制黑色（加倍宽度）
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const neighborIdx = ny * w + nx;
          const neighborPixelIdx = neighborIdx * 4;
          
          // 如果该邻域像素还是透明的，才填充（避免覆盖白色身体）
          if (edgeBuffer.pixels[neighborPixelIdx + 3] === 0) {
            edgeBuffer.pixels[neighborPixelIdx] = 0;
            edgeBuffer.pixels[neighborPixelIdx + 1] = 0;
            edgeBuffer.pixels[neighborPixelIdx + 2] = 0;
            edgeBuffer.pixels[neighborPixelIdx + 3] = 255;
          }
        }
      }
    }
  }
  
  processedMask.updatePixels();
  edgeBuffer.updatePixels();
}

// callback function for body segmentation
function gotResults(result) {
  segmentation = result;
}
