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

// Atualiza o status da seleção ao iniciar
updateSelectionStatus();