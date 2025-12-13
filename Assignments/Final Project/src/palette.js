
export function createPalette(p) {
  const softColors = [
    "#9656a2",  // Purple
    "#369acc",  // Blue
    "#95cf92",  // Green
    "#f8e16f",  // Yellow
    "#f4895f",  // Orange
    "#de324c",  // Red/Pink
    "#6c584c"   // Brown
  ];

  let currentColorIndex = 0;

  // Convert HEX to p5.Color
  const hexToColor = (hexString) => {
    return p.color(hexString);
  };

  // Get current color as p5.Color object
  const getCurrentColor = () => {
    return hexToColor(softColors[currentColorIndex]);
  };

  // Get current color as HEX string
  const getCurrentColorHex = () => {
    return softColors[currentColorIndex];
  };

  // Move to next color in the palette
  const nextColor = () => {
    currentColorIndex = (currentColorIndex + 1) % softColors.length;
    return getCurrentColor();
  };

  // Move to previous color
  const previousColor = () => {
    currentColorIndex = (currentColorIndex - 1 + softColors.length) % softColors.length;
    return getCurrentColor();
  };

  // Shuffle to random color
  const shuffleColor = () => {
    currentColorIndex = Math.floor(Math.random() * softColors.length);
    return getCurrentColor();
  };

  // Get current color index
  const getCurrentIndex = () => {
    return currentColorIndex;
  };

  // Get all colors for display
  const getAllColors = () => {
    return softColors.map(hex => hexToColor(hex));
  };

  // Set specific color by index
  const setColorByIndex = (index) => {
    if (index >= 0 && index < softColors.length) {
      currentColorIndex = index;
    }
    return getCurrentColor();
  };

  return {
    getCurrentColor,
    getCurrentColorHex,
    nextColor,
    previousColor,
    shuffleColor,
    getCurrentIndex,
    getAllColors,
    setColorByIndex,
    colorCount: softColors.length
  };
}
