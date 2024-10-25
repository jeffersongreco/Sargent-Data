// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

let iqrFactor: number = 1.5;
let scaleFactor: number = 0.2;
let strengthFactor: number = 1.0;
let originalData: number[] = [];
let compressedData: number[] = [];

figma.showUI(__html__, { themeColors: true, width: 1000, height: 320, title: "Sargent" })

updateSelectionStatus();
generateStringFromSelectedTextNodes();

figma.on('selectionchange', () => {
  updateSelectionStatus();
  generateStringFromSelectedTextNodes();
});

function updateSelectionStatus() {
  const selectedNodes = figma.currentPage.selection;
  const hasSelection = selectedNodes.length > 0;
  const allTextNodes = selectedNodes.every(node => node.type === 'TEXT');

  figma.ui.postMessage({
    type: 'selection-status',
    hasSelection,
    allTextNodes,
    selectionCount: selectedNodes.length
  });
}

figma.on('selectionchange', updateSelectionStatus);

function generateStringFromSelectedTextNodes() {
  const selectedNodes = figma.currentPage.selection.filter(node => node.type === 'TEXT') as TextNode[];

  selectedNodes.sort((a, b) => {
    const aBottom = a.y + a.height;
    const bBottom = b.y + b.height;

    if (a.y < bBottom && b.y < aBottom) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const concatenatedText = selectedNodes.map(node => node.characters).join(',');

  originalData = concatenatedText.split(',').map(Number);

  figma.ui.postMessage({
    type: 'selection-status',
    hasSelection: selectedNodes.length > 0,
    allTextNodes: selectedNodes.every(node => node.type === 'TEXT'),
    selectionCount: selectedNodes.length,
    concatenatedText
  });
}

figma.ui.onmessage = message => {

  if (message.type === 'update-iqr-factor') {
    iqrFactor = message.value;
  }
  if (message.type === 'update-scale-factor') {
    scaleFactor = message.value;
  }
  if (message.type === 'update-strength-factor') {
    strengthFactor = message.value;
  }

  if (message.type === 'compress-data') {
    compressData(originalData, iqrFactor, scaleFactor, strengthFactor);
  }
};

function compressData(
  dataValues: number[],
  iqrFactor: number = 1.5,
  scaleFactor: number = 0.1,
  compressionStrength: number = 1.0
): void {
  const median = (arr: number[]): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const percentile = (arr: number[], p: number): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const dataMedian = median(dataValues);
  const q1 = percentile(dataValues, 25);
  const q3 = percentile(dataValues, 75);
  const iqr = q3 - q1;
  const threshold = dataMedian + iqrFactor * iqr;

  const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

  const compress = (value: number): number => {
    if (value <= threshold) {
      return value;
    }
    const compressed =
      threshold +
      (value - threshold) * (1 - sigmoid((value - threshold) / scaleFactor));
    return threshold + (compressed - threshold) * compressionStrength;
  };

  compressedData = dataValues.map((value) => parseFloat(compress(value).toFixed(3)));

  figma.ui.postMessage({
    type: 'result-data',
    originalData: originalData,
    compressedData: compressedData
  });

  // console.log("Original Data: ", originalData);
  // console.log("Compressed Data: ", compressedData);
}