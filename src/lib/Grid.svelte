<script>
  import { onMount, onDestroy } from 'svelte';
  import { saveGridState, loadGridState, createEmptyGrid } from './gridUtils.js';
  import { findResourceNodes, generateResourceFromNode, moveItems, countItemsAtPosition } from './beltSystem.js';

  export let gridWidth = 20;
  export let gridHeight = 20;
  export let cellSize = 30;

  let grid = [];
  let selectedTool = 'wall'; // Herramienta seleccionada
  let items = []; // Items moviéndose por las cintas
  let gameLoop;
  let isRunning = false;
  let tickRate = 200; // ms entre cada tick
  let resourceGenerationRate = 2000; // ms entre generación de recursos
  let lastResourceGeneration = 0;

  // Inicializar la cuadrícula
  onMount(() => {
    const savedGrid = loadGridState();
    
    if (savedGrid && savedGrid.width === gridWidth && savedGrid.height === gridHeight) {
      grid = savedGrid.cells;
    } else {
      grid = createEmptyGrid(gridWidth, gridHeight);
      saveGrid();
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
      if (selectedTool === 'empty') {
        grid[y][x].type = 'empty';
        grid[y][x].content = null;
      } else {
        grid[y][x].type = selectedTool;
      }
      grid = [...grid]; // Forzar reactividad
      saveGrid();
    }
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
    if (confirm('¿Estás seguro de que quieres limpiar toda la cuadrícula?')) {
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

<div class="grid-container">
  <div class="toolbar">
    <h3>Herramientas:</h3>
    <div class="tools">
      <button 
        class:active={selectedTool === 'empty'} 
        on:click={() => selectedTool = 'empty'}
      >
        Borrar
      </button>
      <button 
        class:active={selectedTool === 'wall'} 
        on:click={() => selectedTool = 'wall'}
      >
        Muro
      </button>
      <button 
        class:active={selectedTool === 'resource'} 
        on:click={() => selectedTool = 'resource'}
      >
        Recurso
      </button>
      <button 
        class:active={selectedTool === 'factory'} 
        on:click={() => selectedTool = 'factory'}
      >
        Fábrica
      </button>
      <button 
        class:active={selectedTool === 'conveyor'} 
        on:click={() => selectedTool = 'conveyor'}
      >
        Cinta
      </button>
    </div>
    <div class="controls">
      <button on:click={togglePause}>
        {isRunning ? '⏸ Pausar' : '▶️ Reanudar'}
      </button>
      <button class="clear-btn" on:click={clearGrid}>Limpiar Todo</button>
    </div>
    <div class="stats">
      <span>Items en tránsito: {items.length}</span>
    </div>
  </div>

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
  .grid-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 1rem;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .toolbar h3 {
    margin: 0;
  }

  .tools {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tools button {
    padding: 0.5rem 1rem;
    background-color: #333;
    color: white;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tools button:hover {
    border-color: #646cff;
  }

  .tools button.active {
    border-color: #646cff;
    background-color: #1a1a2e;
  }

  .clear-btn {
    background-color: #d32f2f;
    color: white;
  }

  .clear-btn:hover {
    background-color: #b71c1c;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .stats {
    font-size: 0.9rem;
    color: #888;
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
