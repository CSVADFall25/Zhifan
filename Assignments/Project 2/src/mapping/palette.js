// Hue: determined by the user (Two hues for A and B), saturation based on time, lightness fixed
// 

export function buildPalette(hueA = 200, hueB = 30, lightness = 60) {


  return {
    hueA,
    hueB,
    lightness,
    minSaturation: 5,  
    maxSaturation: 95,  

    // calculate color for a given bin (solid or gradient)
    //output: { type: 'solid', color: { h, s, l } } 
    // or { type: 'gradient', colorA: { h, s, l }, colorB: { h, s, l } }
    colorForBin(bin, p) {
      if (!bin || !bin.counts) return null;

      const { A, B } = bin.counts;
      const normT = bin.normT || 0; // 0..1
      const saturation = p.map(normT, 0, 1, this.minSaturation, this.maxSaturation);

      // if both A and B have messages, use a gradient
      if (A > 0 && B > 0) {
        return {
          type: 'gradient',
          colorA: { h: this.hueA, s: saturation, l: this.lightness },
          colorB: { h: this.hueB, s: saturation, l: this.lightness },
        };
      }

      // otherwise, use a solid color based on which sender has messages
      const hue = A > 0 ? this.hueA : this.hueB;
      return {
        type: 'solid',
        color: { h: hue, s: saturation, l: this.lightness },
      };
    },


    // apply solid fill to stitch (single color fill)
    applySolidFill(p, colorObj) {
      if (!colorObj || colorObj.type !== 'solid') return;
      const { h, s, l } = colorObj.color;
      p.colorMode(p.HSL, 360, 100, 100);
      p.fill(h, s, l);
    },

    // apply gradient fill to stitch (using Canvas 2D linear gradient or p.fillGradient helper)
    applyGradientFill(p, colorObj, x, y, w, h, direction = 'horizontal') {
      if (!colorObj || colorObj.type !== 'gradient') return;
      const { colorA, colorB } = colorObj;

      // 优先使用注入的 p.fillGradient（如果存在）
      if (typeof p.fillGradient === 'function') {
        p.noStroke();
        p.fillGradient(x, y, w, h, colorA, colorB, direction);
        return;
      }

      // 否则使用原生 Canvas 线性渐变（等价于示例：createLinearGradient + addColorStop）
      const ctx = p.drawingContext;
      const grad = direction === 'vertical'
        ? ctx.createLinearGradient(x, y, x, y + h)
        : ctx.createLinearGradient(x, y, x + w, y);

      grad.addColorStop(0, toCssHsl(colorA));
      grad.addColorStop(1, toCssHsl(colorB));

      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.restore();
    },
  };
}

// 提供默认调色板（蓝色 A vs 橙色 B）
export const defaultPalette = buildPalette(200, 30, 60);

// 将 {h,s,l} 对象转为 CSS hsl() 字符串
function toCssHsl({ h, s, l }) {
  const hh = Math.round(h);
  const ss = Math.round(s);
  const ll = Math.round(l);
  return `hsl(${hh}, ${ss}%, ${ll}%)`;
}

// 向 p5 实例注入 p.fillGradient(x, y, w, h, colorA, colorB, direction)
// colorA/colorB 需为 {h,s,l}
export function attachFillGradient(p) {
  if (typeof p.fillGradient === 'function') return; // 已存在则跳过
  p.fillGradient = (x, y, w, h, colorA, colorB, direction = 'vertical') => {
    const ctx = p.drawingContext;
    const grad = direction === 'vertical'
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y);

    grad.addColorStop(0, toCssHsl(colorA));
    grad.addColorStop(1, toCssHsl(colorB));

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.restore();
  };
}
