// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true, width: 1000, height: 320, title: "Sargent" })

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