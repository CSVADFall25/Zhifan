// UI controls for the application
export function createUI(p, onClearStrokes, onToleranceChange) {
  let clearButton;
  let toleranceSlider;
  let toleranceLabel;
  let colorLabel;
  let colorIndicator;

  const setup = () => {
    // clear button
    clearButton = p.createButton('Clear Strokes');
    clearButton.position(20, 20);
    clearButton.style('padding', '10px 20px');
    clearButton.style('font-size', '14px');
    clearButton.style('font-family', 'Electrolize, sans-serif');
    clearButton.style('background-color', '#ffffff');
    clearButton.style('border', '2px solid #000000');
    clearButton.style('border-radius', '5px');
    clearButton.style('cursor', 'pointer');
    clearButton.mousePressed(() => {
      if (onClearStrokes) onClearStrokes();
    });

    // tolerance slider 
    toleranceSlider = p.createSlider(5, 150, 20, 5);
    toleranceSlider.position(20, 70);
    toleranceSlider.style('width', '200px');
    toleranceSlider.input(() => {
      if (onToleranceChange) onToleranceChange(toleranceSlider.value());
    });

    // tolerance label
    toleranceLabel = p.createDiv('Color Tolerance: 20');
    toleranceLabel.position(20, 100);
    toleranceLabel.style('font-size', '14px');
    toleranceLabel.style('font-family', 'Electrolize, sans-serif');
    toleranceLabel.style('color', '#000000');

    // Initialize tolerance callback with default value
    if (onToleranceChange) {
      onToleranceChange(toleranceSlider.value());
    }

    // current stroke color
    colorLabel = p.createDiv('Current Stroke Color:');
    colorLabel.position(20, 140);
    colorLabel.style('font-size', '14px');
    colorLabel.style('font-family', 'Electrolize, sans-serif');
    colorLabel.style('color', '#000000');

    // color recognition indicator 
    colorIndicator = p.createDiv('');
    colorIndicator.position(200, 135);
    colorIndicator.style('width', '50px');
    colorIndicator.style('height', '30px');
    colorIndicator.style('border', '2px solid #000000');
    colorIndicator.style('border-radius', '3px');
    colorIndicator.style('background-color', '#9656a2');
  };

  const updateToleranceLabel = (value) => {
    if (toleranceLabel) {
      toleranceLabel.html(`Color Tolerance: ${value}`);
    }
  };

  const updateColorIndicator = (color) => {
    if (colorIndicator && color) {
      const r = p.red(color);
      const g = p.green(color);
      const b = p.blue(color);
      const rgbStr = `rgb(${r}, ${g}, ${b})`;
      colorIndicator.style('background-color', rgbStr);
    }
  };

  const getToleranceValue = () => {
    return toleranceSlider ? toleranceSlider.value() : 20;
  };

  return {
    setup,
    updateToleranceLabel,
    getToleranceValue,
    updateColorIndicator
  };
}
