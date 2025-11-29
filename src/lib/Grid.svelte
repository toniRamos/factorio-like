<script>
  import { onMount, onDestroy } from 'svelte';
  import { saveGridState, loadGridState, createEmptyGrid } from './gridUtils.js';
  import { findResourceNodes, generateResourceFromNode, findFactoriesWithBelts, generateItemFromFactory, moveItems } from './beltSystem.js';
  import { generateProceduralMap } from './mapGenerator.js';
  import { createGameLoop, updatePerformanceMetrics } from './gameLoop.js';
  import { updateFactoryResources, rotateFactoryDirection } from './factoryLogic.js';
  import { handleCellPlacement, isToolAvailable as checkToolAvailability, getCellColor, getCellIcon, getBeltBorderColor, getBeltOrientation } from './cellManagement.js';
  import { getItemPosition as calculateItemPosition, createItemsByPositionMap, isBeltFull as checkBeltFull, updateStatsCache } from './itemPositioning.js';
  import { createViewportController } from './viewportControl.js';
  import './Grid.css';

  export let gridWidth = 50;
  export let gridHeight = 50;
  export let cellSize = 15;
  export let targetFPS = 60; // FPS objetivo configurado por el usuario
  export let gameMode = 'creative'; // 'newgame' or 'creative'
  export let isContinueMode = false; // Track if continuing saved game

  let grid = [];
  let selectedTool = 'conveyor'; // Herramienta seleccionada por defecto
  let selectedBeltSpeed = 1; // Velocidad de cinta seleccionada (1-5)
  let factoryInputDirection = 'up'; // Dirección de entrada para nuevas fábricas
  let playerResources = 10; // Recursos del jugador para construir
  const FACTORY_COST = 10; // Costo de construir una fábrica
  let items = []; // Items moviéndose por las cintas
  let gameLoop;
  let isRunning = false;
  let tickRate = 16; // ms entre cada tick (calculado desde targetFPS)
  let baseSpeed = 0.02; // Velocidad base (calculada desde targetFPS)
  let resourceGenerationRate = 2000; // ms entre generación de recursos
  let lastResourceGeneration = 0;
  let lastFactoryGeneration = 0;
  let tickCount = 0; // Contador de ticks
  let cachedStats = { inTransit: 0, stored: 0, total: 0 }; // Cache de estadísticas
  
  // Variables de rendimiento
  let fps = 0;
  let lastFrameTime = Date.now();
  let frameCount = 0;
  let avgTickTime = 0;
  let showDebug = false;

  // Variables para zoom y pan
  const viewport = createViewportController();
  $: viewportState = viewport.getState();
  $: scale = viewportState.scale;
  $: panX = viewportState.panX;
  $: panY = viewportState.panY;
  $: isDragging = viewportState.isDragging;

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

    // Añadir listener de teclado
    window.addEventListener('keydown', handleKeyPress);

    // Iniciar el game loop
    startGameLoop();
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyPress);
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
    
    gameLoop = createGameLoop({
      tickRate,
      onTick: () => {
        const tickStart = performance.now();
        tickCount++;
        
        const now = Date.now();
        if (now - lastResourceGeneration >= resourceGenerationRate) {
          generateResources();
          lastResourceGeneration = now;
        }
        
        if (now - lastFactoryGeneration >= resourceGenerationRate) {
          generateFromFactories();
          lastFactoryGeneration = now;
        }
        
        const itemsByFactoryBefore = {};
        items.forEach(item => {
          if (item.stored) {
            const key = `${item.x},${item.y}`;
            itemsByFactoryBefore[key] = (itemsByFactoryBefore[key] || 0) + 1;
          }
        });
        
        items = moveItems(grid, items, baseSpeed);
        
        const itemsByFactoryAfter = {};
        items.forEach(item => {
          if (item.stored) {
            const key = `${item.x},${item.y}`;
            itemsByFactoryAfter[key] = (itemsByFactoryAfter[key] || 0) + 1;
          }
        });
        
        playerResources += updateFactoryResources(grid, itemsByFactoryBefore, itemsByFactoryAfter);
        cachedStats = updateStatsCache(items);
        
        if (tickCount % 10 === 0) {
          saveGrid();
        }
        
        const tickEnd = performance.now();
        const metrics = updatePerformanceMetrics({
          fps, frameCount, avgTickTime, lastFrameTime, tickStart, tickEnd
        });
        fps = metrics.fps;
        frameCount = metrics.frameCount;
        avgTickTime = metrics.avgTickTime;
        lastFrameTime = metrics.lastFrameTime;
      }
    });
    
    gameLoop.start();
    isRunning = true;
  }

  // Detener el game loop
  function stopGameLoop() {
    if (gameLoop) {
      gameLoop.stop();
      gameLoop = null;
    }
    isRunning = false;
  }

  // Alternar pausa
  function togglePause() {
    if (gameLoop) {
      gameLoop.toggle();
      isRunning = gameLoop.isRunning();
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

  // Generar items desde fábricas hacia cintas
  function generateFromFactories() {
    const factories = findFactoriesWithBelts(grid);
    
    for (const factory of factories) {
      // Solo generar si la fábrica tiene items almacenados
      const storedItems = items.filter(item => item.x === factory.x && item.y === factory.y && item.stored);
      if (storedItems.length > 0) {
        const newItem = generateItemFromFactory(grid, factory.x, factory.y, items);
        if (newItem) {
          // Remover un item almacenado de la fábrica
          const itemToRemove = storedItems[0];
          items = items.filter(item => item.id !== itemToRemove.id);
          // Añadir el nuevo item en la cinta
          items = [...items, newItem];
        }
      }
    }
  }

  // Rotar la dirección de entrada de fábrica antes de colocar
  function handleRotateFactory() {
    factoryInputDirection = rotateFactoryDirection(factoryInputDirection);
  }

  // Manejar clic derecho para rotar fábricas ya colocadas
  function handleRightClick(event, x, y) {
    event.preventDefault();
    if (grid[y] && grid[y][x] && grid[y][x].type === 'factory') {
      // Rotar la dirección de entrada: up -> right -> down -> left -> up
      const directions = ['up', 'right', 'down', 'left'];
      const currentDir = grid[y][x].inputDirection || 'up';
      const currentIndex = directions.indexOf(currentDir);
      const nextIndex = (currentIndex + 1) % directions.length;
      grid[y][x].inputDirection = directions[nextIndex];
      grid = [...grid];
      saveGrid();
    }
  }

  // Manejar teclas
  function handleKeyPress(event) {
    if (event.key === 'r' || event.key === 'R') {
      if (selectedTool === 'factory') {
        handleRotateFactory();
      }
    }
  }

  // Manejar clic en una celda
  function handleCellClick(x, y) {
    if (!grid[y] || !grid[y][x]) return;
    
    const currentType = grid[y][x].type;
    
    // Si se hace clic en una fábrica con la herramienta de fábrica, rotarla
    if (selectedTool === 'factory' && currentType === 'factory') {
      const directions = ['up', 'right', 'down', 'left'];
      const currentDir = grid[y][x].inputDirection || 'up';
      const currentIndex = directions.indexOf(currentDir);
      const nextIndex = (currentIndex + 1) % directions.length;
      grid[y][x].inputDirection = directions[nextIndex];
      grid = [...grid];
      saveGrid();
      return;
    }
    
    // Usar el módulo de cell management
    const result = handleCellPlacement({
      grid, x, y, selectedTool, gameMode, isContinueMode,
      selectedBeltSpeed, factoryInputDirection, playerResources,
      FACTORY_COST, items
    });
    
    if (result.changed) {
      grid = [...result.grid];
      playerResources = result.playerResources;
      if (result.items) items = result.items;
      saveGrid();
    }
  }

  // Verificar si una herramienta está disponible en el modo actual
  function isToolAvailable(tool) {
    return checkToolAvailability(tool, gameMode, isContinueMode);
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
  $: itemsByPosition = createItemsByPositionMap(items);

  // Calcular posición del item
  function getItemPosition(item, index, totalInCell) {
    return calculateItemPosition(item, index, cellSize);
  }

  // Verificar si una cinta está llena
  function isBeltFull(x, y) {
    return checkBeltFull(itemsByPosition, x, y);
  }

  // Funciones de zoom y pan
  function handleWheel(event) {
    const newScale = viewport.handleWheel(event);
    viewportState = viewport.getState();
  }

  function handleMouseDown(event) {
    viewport.handleMouseDown(event);
    viewportState = viewport.getState();
  }

  function handleMouseMove(event) {
    const newState = viewport.handleMouseMove(event, gridWidth, gridHeight, cellSize);
    viewport.setState(newState);
    viewportState = viewport.getState();
  }

  function handleMouseUp() {
    viewport.handleMouseUp();
    viewportState = viewport.getState();
  }

  function resetView() {
    viewport.reset();
    viewportState = viewport.getState();
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
        title="Factory - Press R to rotate"
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
      {#if gameMode === 'creative' && !isContinueMode}
        <button class="clear-btn" on:click={clearGrid} title="Clear All">🗑️</button>
      {/if}
      <button on:click={resetView} title="Reset Zoom/Pan">🔍</button>
    </div>
  </div>
  
  <div class="toolbar-section">
    <h4>💰 Resources</h4>
    <div class="stats">
      <div class="stat-item resource-count" class:insufficient={playerResources < FACTORY_COST && selectedTool === 'factory'}>
        <span class="stat-icon">💎</span>
        <span class="stat-value">{playerResources}</span>
      </div>
      {#if selectedTool === 'factory'}
        <div class="factory-cost">
          <small>Factory: {FACTORY_COST} 💎</small>
        </div>
      {/if}
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
      <div class="debug-item">
        <span>Zoom:</span>
        <span>{(scale * 100).toFixed(0)}%</span>
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

<div class="grid-container"
  on:wheel={handleWheel}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
  style="cursor: {isDragging ? 'grabbing' : 'grab'};"
>

  <div 
    class="grid" 
    style="
      grid-template-columns: repeat({gridWidth}, {cellSize}px);
      grid-template-rows: repeat({gridHeight}, {cellSize}px);
      --tick-rate: {tickRate}ms;
      transform: translate(-50%, -50%) translate({panX}px, {panY}px) scale({scale});
      transform-origin: center center;
    "
  >
    {#each grid as row, y}
      {#each row as cell, x}
        {@const cellKey = `${x},${y}`}
        {@const cellItems = itemsByPosition[cellKey] || []}
        {@const storedCount = playerResources}
        {@const beltOrientation = cell.type === 'conveyor' ? getBeltOrientation(x, y) : ''}
        <div
          class="cell"
          class:empty-tile={cell.type === 'empty'}
          class:wall-tile={cell.type === 'wall'}
          class:metal-tile={cell.type === 'resource'}
          class:belt-tile-1-h={cell.type === 'conveyor' && (cell.speed || 1) === 1 && beltOrientation === 'horizontal'}
          class:belt-tile-1-v={cell.type === 'conveyor' && (cell.speed || 1) === 1 && beltOrientation === 'vertical'}
          class:belt-tile-2-h={cell.type === 'conveyor' && (cell.speed || 1) === 2 && beltOrientation === 'horizontal'}
          class:belt-tile-2-v={cell.type === 'conveyor' && (cell.speed || 1) === 2 && beltOrientation === 'vertical'}
          class:belt-tile-3-h={cell.type === 'conveyor' && (cell.speed || 1) === 3 && beltOrientation === 'horizontal'}
          class:belt-tile-3-v={cell.type === 'conveyor' && (cell.speed || 1) === 3 && beltOrientation === 'vertical'}
          class:belt-tile-4-h={cell.type === 'conveyor' && (cell.speed || 1) === 4 && beltOrientation === 'horizontal'}
          class:belt-tile-4-v={cell.type === 'conveyor' && (cell.speed || 1) === 4 && beltOrientation === 'vertical'}
          class:belt-tile-5-h={cell.type === 'conveyor' && (cell.speed || 1) === 5 && beltOrientation === 'horizontal'}
          class:belt-tile-5-v={cell.type === 'conveyor' && (cell.speed || 1) === 5 && beltOrientation === 'vertical'}
          class:belt-full={cell.type === 'conveyor' && isBeltFull(x, y)}
          data-orientation={cell.type === 'conveyor' ? beltOrientation : ''}
          style="
            background-color: {(cell.type === 'empty' || cell.type === 'wall' || cell.type === 'resource' || cell.type === 'conveyor') ? 'transparent' : getCellColor(cell)};
            width: {cellSize}px;
            height: {cellSize}px;
            border: {cell.type === 'conveyor' ? 'none' : (isBeltFull(x, y) ? '2px solid #f44336' : 'none')};
            box-shadow: {cell.type === 'conveyor' 
              ? (beltOrientation === 'horizontal' 
                ? `inset 0 1px 0 0 ${getBeltBorderColor(cell.speed || 1)}, inset 0 -1px 0 0 ${getBeltBorderColor(cell.speed || 1)}, 0 2px 6px ${getBeltBorderColor(cell.speed || 1)}30, 0 -2px 6px ${getBeltBorderColor(cell.speed || 1)}30`
                : `inset 1px 0 0 0 ${getBeltBorderColor(cell.speed || 1)}, inset -1px 0 0 0 ${getBeltBorderColor(cell.speed || 1)}, 2px 0 6px ${getBeltBorderColor(cell.speed || 1)}30, -2px 0 6px ${getBeltBorderColor(cell.speed || 1)}30`)
              : 'none'};
            border-radius: 0;
          "
          on:click={() => handleCellClick(x, y)}
          on:contextmenu={(e) => handleRightClick(e, x, y)}
          on:keydown={(e) => e.key === 'Enter' && handleCellClick(x, y)}
          role="button"
          tabindex="0"
        >
          {#if cell.type !== 'empty' && cell.type !== 'wall' && cell.type !== 'resource'}
            <div class="cell-icon">{getCellIcon(cell)}</div>
          {/if}
          {#if cell.type === 'factory' && (cell.storedResources || 0) > 0}
            <div class="factory-stored-indicator"></div>
          {/if}
          {#if cell.type === 'factory'}
            {@const inputDir = cell.inputDirection || 'up'}
            <div class="factory-input-indicator factory-input-{inputDir}"></div>
            <div class="factory-output-indicator factory-output-{inputDir}"></div>
          {/if}
          {#each cellItems as item, index (item.id)}
            {@const pos = getItemPosition(item, index, cellItems.length)}
            {#if !item.stored}
              <div 
                class="item"
                class:blocked={item.blocked}
                style="
                  left: calc(50% + {pos.offsetX}px);
                  top: calc(50% + {pos.offsetY}px);
                  background-image: url('/factorio-like/assets/mineral-item-tile.png');
                  background-size: cover;
                  background-position: center;
                "
              />
            {/if}
          {/each}
        </div>
      {/each}
    {/each}
  </div>
</div>
