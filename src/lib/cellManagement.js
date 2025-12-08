// Cell management logic

export function handleCellPlacement(config) {
  const {
    grid,
    x,
    y,
    selectedTool,
    gameMode,
    isContinueMode,
    selectedBeltSpeed,
    factoryInputDirection,
    playerResources,
    FACTORY_COST,
    items
  } = config;

  const currentType = grid[y][x].type;

  // Lógica de borrado
  if (selectedTool === 'empty') {
    return handleCellDeletion({
      grid,
      x,
      y,
      currentType,
      gameMode,
      isContinueMode,
      playerResources,
      FACTORY_COST,
      items
    });
  }

  // Lógica de colocación
  return handleCellCreation({
    grid,
    x,
    y,
    currentType,
    selectedTool,
    gameMode,
    isContinueMode,
    selectedBeltSpeed,
    factoryInputDirection,
    playerResources,
    FACTORY_COST
  });
}

function handleCellDeletion(config) {
  const { grid, x, y, currentType, gameMode, isContinueMode, playerResources, FACTORY_COST, items } = config;
  
  let newPlayerResources = playerResources;
  let newItems = items;
  let changed = false;

  if (gameMode === 'newgame' || isContinueMode) {
    if (currentType === 'conveyor' || currentType === 'factory') {
      if (currentType === 'factory') {
        newPlayerResources += FACTORY_COST;
      }
      grid[y][x].type = 'empty';
      grid[y][x].content = null;
      newItems = items.filter(item => !(item.x === x && item.y === y));
      changed = true;
    }
  } else {
    if (currentType === 'factory') {
      newPlayerResources += FACTORY_COST;
    }
    grid[y][x].type = 'empty';
    grid[y][x].content = null;
    newItems = items.filter(item => !(item.x === x && item.y === y));
    changed = true;
  }

  return { grid, playerResources: newPlayerResources, items: newItems, changed };
}

function handleCellCreation(config) {
  const {
    grid,
    x,
    y,
    currentType,
    selectedTool,
    gameMode,
    isContinueMode,
    selectedBeltSpeed,
    factoryInputDirection,
    playerResources,
    FACTORY_COST
  } = config;

  let newPlayerResources = playerResources;
  let changed = false;

  // No permitir colocar wall/resource en modo juego
  if ((gameMode === 'newgame' || isContinueMode) && (selectedTool === 'wall' || selectedTool === 'resource')) {
    return { grid, playerResources, changed: false };
  }

  // No permitir colocar sobre celda ocupada
  if (currentType !== 'empty') {
    return { grid, playerResources, changed: false };
  }

  // Verificar recursos para fábrica
  if (selectedTool === 'factory' && playerResources < FACTORY_COST) {
    return { grid, playerResources, changed: false };
  }

  // Colocar el elemento
  grid[y][x].type = selectedTool;
  changed = true;

  if (selectedTool === 'conveyor') {
    grid[y][x].speed = selectedBeltSpeed;
  }

  if (selectedTool === 'factory') {
    grid[y][x].inputDirection = factoryInputDirection;
    grid[y][x].storedResources = 0;
    newPlayerResources -= FACTORY_COST;
  }

  return { grid, playerResources: newPlayerResources, changed };
}

export function isToolAvailable(tool, gameMode, isContinueMode) {
  if (gameMode === 'creative' && !isContinueMode) {
    return true;
  }
  return tool === 'conveyor' || tool === 'factory' || tool === 'empty';
}

export function getCellColor(cell) {
  switch (cell.type) {
    case 'wall':
      return '#555555';
    case 'resource':
      return '#2d4a2d';
    case 'factory':
      return '#1e3a5f';
    case 'conveyor':
      const speedColors = {
        1: '#3d2817',
        2: '#3d3317',
        3: '#3d3d17',
        4: '#173d22',
        5: '#17333d'
      };
      return speedColors[cell.speed || 1] || '#3d2817';
    default:
      return '#1a1a1a';
  }
}

export function getCellIcon(cell) {
  switch (cell.type) {
    case 'factory':
      return '🏭';
    default:
      return '';
  }
}

export function getBeltBorderColor(speed) {
  const colors = {
    1: '#FF9800',
    2: '#FFC107',
    3: '#FFEB3B',
    4: '#00E676',
    5: '#00BCD4'
  };
  return colors[speed] || colors[1];
}

export function getBeltOrientation(grid, x, y) {
  if (!grid[y] || !grid[y][x] || grid[y][x].type !== 'conveyor') return 'horizontal';
  
  const hasLeftBelt = grid[y] && grid[y][x - 1] && grid[y][x - 1].type === 'conveyor';
  const hasRightBelt = grid[y] && grid[y][x + 1] && grid[y][x + 1].type === 'conveyor';
  const hasUpBelt = grid[y - 1] && grid[y - 1][x] && grid[y - 1][x].type === 'conveyor';
  const hasDownBelt = grid[y + 1] && grid[y + 1][x] && grid[y + 1][x].type === 'conveyor';
  
  const hasLeftResource = grid[y] && grid[y][x - 1] && (grid[y][x - 1].type === 'resource' || grid[y][x - 1].type === 'factory');
  const hasRightResource = grid[y] && grid[y][x + 1] && (grid[y][x + 1].type === 'resource' || grid[y][x + 1].type === 'factory');
  const hasUpResource = grid[y - 1] && grid[y - 1][x] && (grid[y - 1][x].type === 'resource' || grid[y - 1][x].type === 'factory');
  const hasDownResource = grid[y + 1] && grid[y + 1][x] && (grid[y + 1][x].type === 'resource' || grid[y + 1][x].type === 'factory');
  
  const hasLeft = hasLeftBelt || hasLeftResource;
  const hasRight = hasRightBelt || hasRightResource;
  const hasUp = hasUpBelt || hasUpResource;
  const hasDown = hasDownBelt || hasDownResource;
  
  const horizontalCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0);
  const verticalCount = (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
  
  // Si solo hay conexiones horizontales o verticales (línea recta)
  if (verticalCount > horizontalCount) {
    return 'vertical';
  }
  if (horizontalCount > 0) {
    return 'horizontal';
  }
  if (verticalCount > 0) {
    return 'vertical';
  }
  
  return 'horizontal';
}

