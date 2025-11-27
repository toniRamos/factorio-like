<script>
  import { onMount, onDestroy } from 'svelte';
  import { saveGridState, loadGridState, createEmptyGrid } from './gridUtils.js';
  import { findResourceNodes, generateResourceFromNode, moveItems, countItemsAtPosition } from './beltSystem.js';
  import { generateProceduralMap } from './mapGenerator.js';

  export let gridWidth = 100;
  export let gridHeight = 100;
  export let cellSize = 20;
  export let gameMode = 'creative'; // 'newgame' or 'creative'

  let grid = [];
  let selectedTool = 'conveyor'; // Herramienta seleccionada por defecto
  let items = []; // Items moviéndose por las cintas
  let gameLoop;
  let isRunning = false;
  let tickRate = 200; // ms entre cada tick
  let resourceGenerationRate = 2000; // ms entre generación de recursos
  let lastResourceGeneration = 0;

  // Inicializar la cuadrícula
  onMount(() => {
    if (gameMode === 'newgame') {
      // Generar mapa procedural para New Game
      grid = generateProceduralMap(gridWidth, gridHeight);
      saveGrid();
    } else {
      // Modo Creative: intentar cargar o crear vacío
      const savedGrid = loadGridState();
      
      if (savedGrid && savedGrid.width === gridWidth && savedGrid.height === gridHeight) {
        grid = savedGrid.cells;
      } else {
        grid = createEmptyGrid(gridWidth, gridHeight);
        saveGrid();
      }
    }

    // Iniciar el game loop
    startGameLoop();
  });

  onDestroy(() => {
    stopGameLoop();
  });

  // Guardar la cuadrícula
  function saveGrid() {
    saveGridState({
      width: gridWidth,
      height: gridHeight,
      cells: grid
    });
  }

  // Iniciar el game loop
  function startGameLoop() {
    if (gameLoop) return;
    isRunning = true;
    
    gameLoop = setInterval(() => {
      if (!isRunning) return;
      
      // Generar recursos desde nodos
      const now = Date.now();
      if (now - lastResourceGeneration >= resourceGenerationRate) {
        generateResources();
        lastResourceGeneration = now;
      }
      
      // Mover items por las cintas
      items = moveItems(grid, items, 0.15);
    }, tickRate);
  }

  // Detener el game loop
  function stopGameLoop() {
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }
    isRunning = false;
  }

  // Alternar pausa
  function togglePause() {
    if (isRunning) {
      stopGameLoop();
    } else {
      startGameLoop();
    }
  }

  // Generar recursos desde los nodos
  function generateResources() {
    const resourceNodes = findResourceNodes(grid);
    
    for (const node of resourceNodes) {
      const newItem = generateResourceFromNode(grid, node.x, node.y, items);
      if (newItem) {
        items = [...items, newItem];
      }
    }
  }

  // Manejar clic en una celda
  function handleCellClick(x, y) {
    if (grid[y] && grid[y][x]) {
      const currentType = grid[y][x].type;
      
      if (selectedTool === 'empty') {
        // En New Game, solo se pueden borrar Belt y Factory
        if (gameMode === 'newgame') {
          if (currentType === 'conveyor' || currentType === 'factory') {
            grid[y][x].type = 'empty';
            grid[y][x].content = null;
          }
          // Si es wall o resource, no hacer nada
        } else {
          // Creative mode: borrar cualquier cosa
          grid[y][x].type = 'empty';
          grid[y][x].content = null;
        }
      } else {
        // Colocar el elemento seleccionado
        // En New Game, no se pueden colocar wall ni resource
        if (gameMode === 'newgame' && (selectedTool === 'wall' || selectedTool === 'resource')) {
          return; // No hacer nada
        }
        
        grid[y][x].type = selectedTool;
      }
      grid = [...grid]; // Forzar reactividad
      saveGrid();
    }
  }

  // Verificar si una herramienta está disponible en el modo actual
  function isToolAvailable(tool) {
    if (gameMode === 'creative') {
      return true; // Todas las herramientas disponibles
    }
    
    // En New Game, solo Belt, Factory y Erase están disponibles
    return tool === 'conveyor' || tool === 'factory' || tool === 'empty';
  }

  // Obtener el color de la celda según su tipo
  function getCellColor(cell) {
    switch (cell.type) {
      case 'wall':
        return '#555555';
      case 'resource':
        return '#4CAF50';
      case 'factory':
        return '#2196F3';
      case 'conveyor':
        return '#FF9800';
      default:
        return '#1a1a1a';
    }
  }

  // Verificar si una cinta está llena
  function isBeltFull(x, y) {
    return countItemsAtPosition(items, x, y) >= 3;
  }

  // Contar items almacenados en una fábrica
  function getStoredCount(x, y) {
    return items.filter(item => item.x === x && item.y === y && item.stored).length;
  }

  // Limpiar toda la cuadrícula
  function clearGrid() {
    if (confirm('Are you sure you want to clear the entire grid?')) {
      grid = createEmptyGrid(gridWidth, gridHeight);
      items = [];
      saveGrid();
    }
  }

  // Calcular la posición visual del item basado en su progreso y dirección
  function getItemPosition(item, index, totalInCell) {
    // Si está almacenado en una fábrica, posición fija
    if (item.stored) {
      // Distribuir items almacenados en una grid pequeña
      const positions = [
        { x: -6, y: -6 },
        { x: 6, y: -6 },
        { x: -6, y: 6 },
        { x: 6, y: 6 },
        { x: 0, y: 0 }
      ];
      const pos = positions[index % positions.length];
      return { offsetX: pos.x, offsetY: pos.y };
    }

    const direction = {
      dx: item.x - item.prevX,
      dy: item.y - item.prevY
    };

    // Calcular offset basado en la dirección del movimiento
    let offsetX = 0;
    let offsetY = 0;

    // Para cintas: dividir la celda en 3 posiciones fijas
    // Posición 0 (inicio): -33% de la celda
    // Posición 1 (medio): 0% de la celda  
    // Posición 2 (final): +33% de la celda
    const positions = [-0.33, 0, 0.33];
    const progressPositions = [0.25, 0.5, 0.75]; // A qué progreso aparece cada item
    
    // Determinar en qué "slot" está este item basado en su progreso
    let slot = 0;
    if (item.progress >= 0.66) slot = 2;
    else if (item.progress >= 0.33) slot = 1;
    else slot = 0;

    // Calcular la posición base según el slot
    const basePosition = positions[slot];
    
    // Calcular el progreso dentro del slot (0-1)
    const slotProgress = (item.progress % 0.34) / 0.34;
    
    if (direction.dx !== 0) {
      // Movimiento horizontal
      const direction_multiplier = direction.dx > 0 ? 1 : -1;
      // Interpolar entre posiciones
      const nextSlot = Math.min(slot + 1, 2);
      const currentPos = positions[slot];
      const nextPos = positions[nextSlot];
      const interpolated = currentPos + (nextPos - currentPos) * slotProgress;
      offsetX = interpolated * cellSize * direction_multiplier;
      offsetY = 0;
    } else if (direction.dy !== 0) {
      // Movimiento vertical
      const direction_multiplier = direction.dy > 0 ? 1 : -1;
      const nextSlot = Math.min(slot + 1, 2);
      const currentPos = positions[slot];
      const nextPos = positions[nextSlot];
      const interpolated = currentPos + (nextPos - currentPos) * slotProgress;
      offsetY = interpolated * cellSize * direction_multiplier;
      offsetX = 0;
    }

    return { offsetX, offsetY };
  }
</script>

<!-- Floating Toolbar -->
<div class="floating-toolbar">
  <div class="toolbar-section">
    <h4>🔧 Tools</h4>
    <div class="tools">
      <button 
        class:active={selectedTool === 'empty'} 
        class:disabled={!isToolAvailable('empty')}
        on:click={() => isToolAvailable('empty') && (selectedTool = 'empty')}
        title="Erase"
      >
        🗑️
      </button>
      {#if isToolAvailable('wall')}
        <button 
          class:active={selectedTool === 'wall'} 
          on:click={() => selectedTool = 'wall'}
          title="Wall"
        >
          🧱
        </button>
      {/if}
      {#if isToolAvailable('resource')}
        <button 
          class:active={selectedTool === 'resource'} 
          on:click={() => selectedTool = 'resource'}
          title="Resource"
        >
          💎
        </button>
      {/if}
      <button 
        class:active={selectedTool === 'factory'} 
        class:disabled={!isToolAvailable('factory')}
        on:click={() => isToolAvailable('factory') && (selectedTool = 'factory')}
        title="Factory"
      >
        🏭
      </button>
      <button 
        class:active={selectedTool === 'conveyor'} 
        class:disabled={!isToolAvailable('conveyor')}
        on:click={() => isToolAvailable('conveyor') && (selectedTool = 'conveyor')}
        title="Belt"
      >
        ➡️
      </button>
    </div>
  </div>
  
  <div class="toolbar-section">
    <h4>⚙️ Controls</h4>
    <div class="controls">
      <button on:click={togglePause}>
        {isRunning ? '⏸' : '▶️'}
      </button>
      <button class="clear-btn" on:click={clearGrid} title="Clear All">🗑️</button>
    </div>
  </div>
  
  <div class="toolbar-section stats">
    <span>📦 {items.length}</span>
  </div>
</div>

<div class="grid-container">

  <div 
    class="grid" 
    style="
      grid-template-columns: repeat({gridWidth}, {cellSize}px);
      grid-template-rows: repeat({gridHeight}, {cellSize}px);
    "
  >
    {#each grid as row, y}
      {#each row as cell, x}
        <div
          class="cell"
          class:belt-full={cell.type === 'conveyor' && isBeltFull(x, y)}
          style="
            background-color: {getCellColor(cell)};
            width: {cellSize}px;
            height: {cellSize}px;
          "
          on:click={() => handleCellClick(x, y)}
          on:keydown={(e) => e.key === 'Enter' && handleCellClick(x, y)}
          role="button"
          tabindex="0"
        >
          {#if cell.type === 'factory' && getStoredCount(x, y) > 0}
            <div class="factory-count">{getStoredCount(x, y)}</div>
          {/if}
          {#each items.filter(item => item.x === x && item.y === y) as item, index (item.id)}
            {@const cellItems = items.filter(i => i.x === x && i.y === y)}
            {@const pos = getItemPosition(item, index, cellItems.length)}
            <div 
              class="item"
              class:stored={item.stored}
              class:blocked={item.blocked}
              style="
                left: calc(50% + {pos.offsetX}px);
                top: calc(50% + {pos.offsetY}px);
              "
            />
          {/each}
        </div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .floating-toolbar {
    position: fixed;
    left: 20px;
    top: 120px;
    background: rgba(26, 26, 26, 0.95);
    border: 2px solid #444;
    border-radius: 12px;
    padding: 1rem;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 80px;
  }

  .toolbar-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .toolbar-section h4 {
    margin: 0;
    font-size: 0.9rem;
    color: #888;
    text-align: center;
  }

  .grid-container {
    width: 100%;
    height: 100vh;
    overflow: auto;
    padding: 120px 1rem 60px 140px;
  }

  .tools {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .tools button {
    width: 50px;
    height: 50px;
    padding: 0;
    background-color: #333;
    color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tools button:hover {
    border-color: #646cff;
    transform: scale(1.05);
  }

  .tools button.active {
    border-color: #646cff;
    background-color: #1a1a2e;
    box-shadow: 0 0 10px rgba(100, 108, 255, 0.5);
  }

  .tools button.disabled {
    background-color: #1a1a1a;
    color: #555;
    cursor: not-allowed;
    opacity: 0.5;
  }

  .tools button.disabled:hover {
    border-color: transparent;
    transform: none;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .controls button {
    width: 50px;
    height: 50px;
    padding: 0;
    background-color: #333;
    color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .controls button:hover {
    border-color: #646cff;
    transform: scale(1.05);
  }

  .clear-btn {
    background-color: #d32f2f !important;
  }

  .clear-btn:hover {
    background-color: #b71c1c !important;
  }

  .stats {
    font-size: 1rem;
    color: #FFD700;
    font-weight: bold;
    text-align: center;
  }

  .grid {
    display: grid;
    gap: 1px;
    background-color: #333;
    border: 2px solid #555;
    padding: 1px;
  }

  .cell {
    border: 1px solid #444;
    cursor: pointer;
    transition: opacity 0.1s;
    position: relative;
    overflow: visible;
  }

  .cell:hover {
    opacity: 0.8;
  }

  .belt-full {
    border: 2px solid #f44336 !important;
    box-shadow: inset 0 0 5px rgba(244, 67, 54, 0.5);
  }

  .factory-count {
    position: absolute;
    top: 2px;
    right: 2px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: bold;
    pointer-events: none;
    z-index: 5;
  }

  .item {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: #FFD700;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px rgba(255, 215, 0, 0.9);
    border: 1px solid #FFA500;
    pointer-events: none;
    z-index: 10;
    transition: left 0.15s linear, top 0.15s linear;
  }

  .item.blocked {
    background-color: #FF5722;
    border-color: #D84315;
    box-shadow: 0 0 6px rgba(255, 87, 34, 0.9);
    transition: none;
    animation: pulse-blocked 1s ease-in-out infinite;
  }

  @keyframes pulse-blocked {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
    }
  }

  .item.stored {
    background-color: #4CAF50;
    box-shadow: 0 0 4px rgba(76, 175, 80, 0.8);
    border-color: #2E7D32;
    transition: none;
  }

  @media (max-width: 768px) {
    .grid-container {
      padding: 0.5rem;
    }

    .tools {
      font-size: 0.9rem;
    }
  }
</style>
