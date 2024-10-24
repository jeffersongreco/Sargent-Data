// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true, width: 1000, height: 320, title: "Sargent" })

let globalNumberArray: number[] = [];
let globalResultArray: number[] = [];

// Função para atualizar o status da seleção
function updateSelectionStatus() {
  const selectedNodes = figma.currentPage.selection;
  const hasSelection = selectedNodes.length > 0;
  const allTextNodes = selectedNodes.every(node => node.type === 'TEXT');

  // Envia o status para a interface do usuário
  figma.ui.postMessage({
    type: 'selection-status',
    hasSelection,
    allTextNodes,
    selectionCount: selectedNodes.length
  });
}

// Escuta eventos de alteração de seleção
figma.on('selectionchange', updateSelectionStatus);

// ... código existente ...

// Função para gerar uma string a partir dos textos selecionados
function generateStringFromSelectedTextNodes() {
  const selectedNodes = figma.currentPage.selection.filter(node => node.type === 'TEXT') as TextNode[];

  // Ordena os nós de texto por linha (y) e depois por coluna (x)
  selectedNodes.sort((a, b) => {
    const aBottom = a.y + a.height;
    const bBottom = b.y + b.height;

    // Verifica se estão na mesma linha
    if (a.y < bBottom && b.y < aBottom) {
      return a.x - b.x; // Mesma linha, ordena por x
    }
    return a.y - b.y; // Ordena por y
  });

  // Concatena o conteúdo dos nós de texto
  const concatenatedText = selectedNodes.map(node => node.characters).join(',');

  // Transforma concatenatedText em um array de números
  globalNumberArray = concatenatedText.split(',').map(Number);

  // Envia o texto concatenado para a interface do usuário
  figma.ui.postMessage({
    type: 'selection-status',
    hasSelection: selectedNodes.length > 0,
    allTextNodes: selectedNodes.every(node => node.type === 'TEXT'),
    selectionCount: selectedNodes.length,
    concatenatedText // Certifique-se de que o concatenatedText está incluído
  });
}

// Escuta eventos de alteração de seleção
figma.on('selectionchange', () => {
  updateSelectionStatus();
  generateStringFromSelectedTextNodes();
});

// Atualiza o status da seleção ao iniciar
updateSelectionStatus();
generateStringFromSelectedTextNodes();

let iqrFactor: number;
let scaleFactor: number;
let strengthFactor: number;

// Adiciona um listener para mensagens recebidas da interface do usuário
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
    globalResultArray = compressData(globalNumberArray, iqrFactor, scaleFactor, strengthFactor);
    console.log(globalResultArray);
  }
};

function compressData(
  dataValues: number[],
  iqrFactor: number = 1.5,
  scaleFactor: number = 0.1,
  compressionStrength: number = 1.0
): number[] {
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

  return dataValues.map((value) => parseFloat(compress(value).toFixed(3)));
}