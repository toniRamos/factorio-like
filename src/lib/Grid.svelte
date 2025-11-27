<script>
  import { onMount, onDestroy } from 'svelte';
  import { saveGridState, loadGridState, createEmptyGrid } from './gridUtils.js';
  import { findResourceNodes, generateResourceFromNode, moveItems, countItemsAtPosition } from './beltSystem.js';
  import { generateProceduralMap } from './mapGenerator.js';

  export let gridWidth = 50;
  export let gridHeight = 50;
  export let cellSize = 15;
  export let targetFPS = 60; // FPS objetivo configurado por el usuario
  export let gameMode = 'creative'; // 'newgame' or 'creative'
  export let isContinueMode = false; // Track if continuing saved game

  let grid = [];
  let selectedTool = 'conveyor'; // Herramienta seleccionada por defecto
  let selectedBeltSpeed = 1; // Velocidad de cinta seleccionada (1-5)
  let items = []; // Items moviéndose por las cintas
  let gameLoop;
  let isRunning = false;
  let tickRate = 16; // ms entre cada tick (calculado desde targetFPS)
  let baseSpeed = 0.02; // Velocidad base (calculada desde targetFPS)
  let resourceGenerationRate = 2000; // ms entre generación de recursos
  let lastResourceGeneration = 0;
  let tickCount = 0; // Contador de ticks
  let cachedStats = { inTransit: 0, stored: 0, total: 0 }; // Cache de estadísticas
  
  // Variables de rendimiento
  let fps = 0;
  let lastFrameTime = Date.now();
  let frameCount = 0;
  let avgTickTime = 0;
  let showDebug = false;

  // Calcular tickRate y baseSpeed basado en targetFPS
  $: {
    tickRate = Math.floor(1000 / targetFPS);
    baseSpeed = targetFPS === 60 ? 0.02 : targetFPS === 30 ? 0.04 : targetFPS === 20 ? 0.06 : 0.05;
  }

  // Inicializar la cuadrícula
  onMount(() => {
    if (gameMode === 'newgame') {
      // Generar mapa procedural para New Game
      grid = generateProceduralMap(gridWidth, gridHeight);
      items = [];
      saveGrid();
    } else {
      // Modo Creative: intentar cargar o crear vacío
      const savedGrid = loadGridState();
      
      if (savedGrid && savedGrid.width === gridWidth && savedGrid.height === gridHeight) {
        grid = savedGrid.cells;
        // Cargar items en tránsito si existen
        if (savedGrid.items && Array.isArray(savedGrid.items)) {
          items = savedGrid.items;
        }
      } else {
        grid = createEmptyGrid(gridWidth, gridHeight);
        items = [];
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
      cells: grid,
      items: items // Guardar items en tránsito
    });
  }

  // Iniciar el game loop
  function startGameLoop() {
    if (gameLoop) return;
    isRunning = true;
    
    gameLoop = setInterval(() => {
      if (!isRunning) return;
      
      const tickStart = performance.now();
      tickCount++;
      
      // Generar recursos desde nodos
      const now = Date.now();
      if (now - lastResourceGeneration >= resourceGenerationRate) {
        generateResources();
        lastResourceGeneration = now;
      }
      
      // Mover items por las cintas
      items = moveItems(grid, items, baseSpeed);
      
      // Actualizar cache de estadísticas
      updateStatsCache();
      
      // Guardar estado solo cada 10 ticks (cada 2 segundos) para reducir operaciones de localStorage
      if (tickCount % 10 === 0) {
        saveGrid();
      }
      
      // Calcular tiempo de tick
      const tickEnd = performance.now();
      avgTickTime = (avgTickTime * 0.9) + ((tickEnd - tickStart) * 0.1);
      
      // Calcular FPS
      frameCount++;
      if (now - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
      }
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
        // En New Game y Continue, solo se pueden borrar Belt y Factory
        if (gameMode === 'newgame' || isContinueMode) {
          if (currentType === 'conveyor' || currentType === 'factory') {
            grid[y][x].type = 'empty';
            grid[y][x].content = null;
            // Eliminar todos los items en esta posición
            items = items.filter(item => !(item.x === x && item.y === y));
          }
          // Si es wall o resource, no hacer nada
        } else {
          // Creative mode: borrar cualquier cosa
          grid[y][x].type = 'empty';
          grid[y][x].content = null;
          // Eliminar todos los items en esta posición
          items = items.filter(item => !(item.x === x && item.y === y));
        }
      } else {
        // Colocar el elemento seleccionado
        // En New Game y Continue, no se pueden colocar wall ni resource
        if ((gameMode === 'newgame' || isContinueMode) && (selectedTool === 'wall' || selectedTool === 'resource')) {
          return; // No hacer nada
        }
        
        grid[y][x].type = selectedTool;
        
        // Si es cinta, asignar velocidad
        if (selectedTool === 'conveyor') {
          grid[y][x].speed = selectedBeltSpeed;
        }
      }
      grid = [...grid]; // Forzar reactividad
      saveGrid();
    }
  }

  // Verificar si una herramienta está disponible en el modo actual
  function isToolAvailable(tool) {
    if (gameMode === 'creative' && !isContinueMode) {
      return true; // Todas las herramientas disponibles solo en Creative nuevo
    }
    
    // En New Game y Continue, solo Belt, Factory y Erase están disponibles
    return tool === 'conveyor' || tool === 'factory' || tool === 'empty';
  }

  // Obtener el color de la celda según su tipo
  function getCellColor(cell) {
    switch (cell.type) {
      case 'wall':
        return '#555555'; // Gris original
      case 'resource':
        return '#2d4a2d';
      case 'factory':
        return '#1e3a5f';
      case 'conveyor':
        // Colores más sutiles para cintas
        const speedColors = {
          1: '#3d2817', // Marrón oscuro
          2: '#3d3317', // Marrón amarillento oscuro
          3: '#3d3d17', // Amarillo oscuro
          4: '#173d22', // Verde oscuro
          5: '#17333d'  // Cian oscuro
        };
        return speedColors[cell.speed || 1] || '#3d2817';
      default:
        return '#1a1a1a';
    }
  }

  // Obtener el icono de la celda según su tipo
  function getCellIcon(cell) {
    switch (cell.type) {
      case 'wall':
        return ''; // Sin icono para el muro
      case 'resource':
        return '💎';
      case 'factory':
        return '🏭';
      case 'conveyor':
        return ''; // Sin icono para cintas
      default:
        return '';
    }
  }

  // Obtener el color del borde según la velocidad de la cinta
  function getBeltBorderColor(speed) {
    const colors = {
      1: '#FF9800',  // Orange
      2: '#FFC107',  // Gold/Yellow
      3: '#FFEB3B',  // Bright Yellow
      4: '#00E676',  // Green
      5: '#00BCD4'   // Cyan
    };
    return colors[speed] || colors[1];
  }

  // Actualizar cache de estadísticas
  function updateStatsCache() {
    let stored = 0;
    let inTransit = 0;
    for (const item of items) {
      if (item.stored) stored++;
      else inTransit++;
    }
    cachedStats = { inTransit, stored, total: items.length };
  }

  // Verificar si una cinta está llena (usa el mapa de items)
  function isBeltFull(x, y) {
    const key = `${x},${y}`;
    return (itemsByPosition[key]?.length || 0) >= 3;
  }

  // Contar items almacenados en una fábrica (usa el mapa de items)
  function getStoredCount(x, y) {
    const key = `${x},${y}`;
    const cellItems = itemsByPosition[key] || [];
    let count = 0;
    for (const item of cellItems) {
      if (item.stored) count++;
    }
    return count;
  }

  // Calcular total de items almacenados en todas las fábricas (usa cache)
  function getTotalStored() {
    return cachedStats.stored;
  }

  // Calcular items en tránsito (usa cache)
  function getItemsInTransit() {
    return cachedStats.inTransit;
  }

  // Limpiar toda la cuadrícula
  function clearGrid() {
    if (confirm('Are you sure you want to clear the entire grid?')) {
      grid = createEmptyGrid(gridWidth, gridHeight);
      items = [];
      saveGrid();
    }
  }

  // Crear mapa de items por posición para renderizado eficiente
  $: itemsByPosition = items.reduce((map, item) => {
    const key = `${item.x},${item.y}`;
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});

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
  
  {#if selectedTool === 'conveyor'}
    <div class="toolbar-section">
      <h4>⚡ Speed</h4>
      <div class="belt-speeds">
        <button 
          class:active={selectedBeltSpeed === 1}
          on:click={() => selectedBeltSpeed = 1}
          title="Tier 1 - 100% speed"
          style="background-color: #FF9800;"
        >
          1
        </button>
        <button 
          class:active={selectedBeltSpeed === 2}
          on:click={() => selectedBeltSpeed = 2}
          title="Tier 2 - 150% speed"
          style="background-color: #FFC107;"
        >
          2
        </button>
        <button 
          class:active={selectedBeltSpeed === 3}
          on:click={() => selectedBeltSpeed = 3}
          title="Tier 3 - 200% speed"
          style="background-color: #FFEB3B;"
        >
          3
        </button>
        <button 
          class:active={selectedBeltSpeed === 4}
          on:click={() => selectedBeltSpeed = 4}
          title="Tier 4 - 250% speed"
          style="background-color: #00E676;"
        >
          4
        </button>
        <button 
          class:active={selectedBeltSpeed === 5}
          on:click={() => selectedBeltSpeed = 5}
          title="Tier 5 - 300% speed"
          style="background-color: #00BCD4;"
        >
          5
        </button>
      </div>
    </div>
  {/if}
  
  <div class="toolbar-section">
    <h4>⚙️ Controls</h4>
    <div class="controls">
      <button on:click={togglePause}>
        {isRunning ? '⏸' : '▶️'}
      </button>
      <button class="clear-btn" on:click={clearGrid} title="Clear All">🗑️</button>
    </div>
  </div>
  
  <div class="toolbar-section">
    <h4>📊 Stats</h4>
    <div class="stats">
      <div class="stat-item">
        <span class="stat-icon">🛍️</span>
        <span class="stat-value">{getItemsInTransit()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🏭</span>
        <span class="stat-value">{getTotalStored()}</span>
      </div>
      <div class="stat-item total">
        <span class="stat-icon">📦</span>
        <span class="stat-value">{items.length}</span>
      </div>
    </div>
  </div>
  
  <div class="toolbar-section">
    <button 
      class="debug-toggle"
      on:click={() => showDebug = !showDebug}
      title="Toggle Performance Monitor"
    >
      {showDebug ? '📊' : '📈'}
    </button>
  </div>
</div>

{#if showDebug}
  <div class="debug-panel">
    <h4>🔍 Performance Monitor</h4>
    <div class="debug-stats">
      <div class="debug-item">
        <span>Target FPS:</span>
        <span>{targetFPS}</span>
      </div>
      <div class="debug-item">
        <span>Actual FPS:</span>
        <span class:warning={fps < targetFPS * 0.75} class:good={fps >= targetFPS * 0.75}>{fps}</span>
      </div>
      <div class="debug-item">
        <span>Tick Time:</span>
        <span class:warning={avgTickTime > tickRate * 0.75} class:good={avgTickTime <= tickRate * 0.75}>{avgTickTime.toFixed(2)}ms</span>
      </div>
      <div class="debug-item">
        <span>Target:</span>
        <span>{tickRate}ms</span>
      </div>
      <div class="debug-item">
        <span>Grid Size:</span>
        <span>{gridWidth}x{gridHeight}</span>
      </div>
      <div class="debug-item">
        <span>Total Cells:</span>
        <span>{gridWidth * gridHeight}</span>
      </div>
      <div class="debug-item">
        <span>Active Items:</span>
        <span>{items.length}</span>
      </div>
    </div>
    <div class="debug-help">
      <p><strong>Diagnostics:</strong></p>
      <ul>
        <li>Actual FPS &lt; Target: System overloaded</li>
        <li>Tick Time &gt; {tickRate}ms: Game logic is slow</li>
        <li>Too many items: Reduce resources/belts</li>
        <li>Large grid: Try smaller size</li>
        <li>Lower Target FPS: Easier on CPU</li>
      </ul>
    </div>
  </div>
{/if}

<div class="grid-container">

  <div 
    class="grid" 
    style="
      grid-template-columns: repeat({gridWidth}, {cellSize}px);
      grid-template-rows: repeat({gridHeight}, {cellSize}px);
      --tick-rate: {tickRate}ms;
    "
  >
    {#each grid as row, y}
      {#each row as cell, x}
        {@const cellKey = `${x},${y}`}
        {@const cellItems = itemsByPosition[cellKey] || []}
        {@const storedCount = cell.type === 'factory' ? (cellItems.filter(i => i.stored).length || 0) : 0}
        <div
          class="cell"
          class:belt-full={cell.type === 'conveyor' && isBeltFull(x, y)}
          style="
            background-color: {getCellColor(cell)};
            width: {cellSize}px;
            height: {cellSize}px;
            border: {cell.type === 'conveyor' ? `3px solid ${getBeltBorderColor(cell.speed || 1)}` : (isBeltFull(x, y) ? '2px solid #f44336' : '1px solid #444')};
          "
          on:click={() => handleCellClick(x, y)}
          on:keydown={(e) => e.key === 'Enter' && handleCellClick(x, y)}
          role="button"
          tabindex="0"
        >
          {#if cell.type !== 'empty'}
            <div class="cell-icon">{getCellIcon(cell)}</div>
          {/if}
          {#if cell.type === 'factory' && storedCount > 0}
            <div class="factory-count">{storedCount}</div>
          {/if}
          {#each cellItems as item, index (item.id)}
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

  .belt-speeds {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .belt-speeds button {
    width: 50px;
    height: 50px;
    padding: 0;
    color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.2rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .belt-speeds button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }

  .belt-speeds button.active {
    border-color: white;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }

  .stat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-item.total {
    background: rgba(255, 215, 0, 0.1);
    border-color: rgba(255, 215, 0, 0.3);
  }

  .stat-icon {
    font-size: 1.2rem;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: bold;
    color: #FFD700;
  }

  .debug-toggle {
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

  .debug-toggle:hover {
    border-color: #646cff;
    transform: scale(1.05);
  }

  .debug-panel {
    position: fixed;
    right: 20px;
    top: 120px;
    background: rgba(26, 26, 26, 0.95);
    border: 2px solid #444;
    border-radius: 12px;
    padding: 1rem;
    z-index: 1000;
    min-width: 250px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
  }

  .debug-panel h4 {
    margin: 0 0 1rem 0;
    color: #646cff;
    font-size: 1rem;
  }

  .debug-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .debug-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .debug-item span:first-child {
    color: #888;
  }

  .debug-item span:last-child {
    font-weight: bold;
    color: #FFD700;
  }

  .debug-item .warning {
    color: #ff9800 !important;
  }

  .debug-item .good {
    color: #4CAF50 !important;
  }

  .debug-help {
    border-top: 1px solid #444;
    padding-top: 0.75rem;
    font-size: 0.85rem;
    color: #888;
  }

  .debug-help p {
    margin: 0 0 0.5rem 0;
    color: #aaa;
  }

  .debug-help ul {
    margin: 0;
    padding-left: 1.25rem;
    list-style-type: disc;
  }

  .debug-help li {
    margin-bottom: 0.25rem;
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

  .cell-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
    pointer-events: none;
    z-index: 1;
    user-select: none;
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
    transition: left var(--tick-rate, 16ms) ease-out, top var(--tick-rate, 16ms) ease-out;
    will-change: left, top;
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
