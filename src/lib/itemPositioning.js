// Item positioning logic

export function getItemPosition(item, index, cellSize, grid) {
  // Si está almacenado en una fábrica, posición fija
  if (item.stored) {
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

  let offsetX = 0;
  let offsetY = 0;

  // Movimiento fluido continuo: mapear progress (0-1) a posición en la celda
  const cellProgress = (item.progress - 0.5); // -0.5 a +0.5
  
  // Detectar si estamos en una curva
  const curveInfo = detectCurve(grid, item.x, item.y, item.prevX, item.prevY, direction);
  
  if (curveInfo.isCurve) {
    // En una curva, ajustar la trayectoria visual
    const progress = item.progress; // 0 a 1
    
    // Entrada desde arriba/abajo, salida a izquierda/derecha
    if (curveInfo.type === 'vertical-to-horizontal') {
      if (progress < 0.5) {
        // Primera mitad: movimiento vertical (desde entrada hasta centro)
        const localProgress = progress * 2; // 0 a 1
        // Mapear de -0.5 cellSize a 0
        offsetY = ((localProgress * 0.5) - 0.5) * cellSize * curveInfo.entryDir;
        offsetX = 0;
      } else {
        // Segunda mitad: movimiento horizontal (desde centro hasta salida)
        const localProgress = (progress - 0.5) * 2; // 0 a 1
        // Mapear de 0 a 0.5 cellSize
        offsetX = (localProgress * 0.5) * cellSize * curveInfo.exitDir;
        offsetY = 0;
      }
    }
    // Entrada desde izquierda/derecha, salida arriba/abajo
    else if (curveInfo.type === 'horizontal-to-vertical') {
      if (progress < 0.5) {
        // Primera mitad: movimiento horizontal (desde entrada hasta centro)
        const localProgress = progress * 2; // 0 a 1
        // Mapear de -0.5 cellSize a 0
        offsetX = ((localProgress * 0.5) - 0.5) * cellSize * curveInfo.entryDir;
        offsetY = 0;
      } else {
        // Segunda mitad: movimiento vertical (desde centro hasta salida)
        const localProgress = (progress - 0.5) * 2; // 0 a 1
        // Mapear de 0 a 0.5 cellSize
        offsetY = (localProgress * 0.5) * cellSize * curveInfo.exitDir;
        offsetX = 0;
      }
    }
  } else {
    // Movimiento recto normal
    if (direction.dx !== 0) {
      const direction_multiplier = direction.dx > 0 ? 1 : -1;
      offsetX = cellProgress * cellSize * direction_multiplier;
      offsetY = 0;
    } else if (direction.dy !== 0) {
      const direction_multiplier = direction.dy > 0 ? 1 : -1;
      offsetY = cellProgress * cellSize * direction_multiplier;
      offsetX = 0;
    }
  }

  return { offsetX, offsetY };
}

function detectCurve(grid, x, y, prevX, prevY, direction) {
  if (!grid || !grid[y] || !grid[y][x]) {
    return { isCurve: false };
  }
  
  const cell = grid[y][x];
  if (cell.type !== 'conveyor') {
    return { isCurve: false };
  }
  
  // Verificar conexiones (excluyendo de donde venimos)
  const hasLeft = x > 0 && grid[y] && grid[y][x - 1] && (grid[y][x - 1].type === 'conveyor' || grid[y][x - 1].type === 'resource' || grid[y][x - 1].type === 'factory') && !(prevX === x - 1 && prevY === y);
  const hasRight = grid[y] && grid[y][x + 1] && (grid[y][x + 1].type === 'conveyor' || grid[y][x + 1].type === 'resource' || grid[y][x + 1].type === 'factory') && !(prevX === x + 1 && prevY === y);
  const hasUp = y > 0 && grid[y - 1] && grid[y - 1][x] && (grid[y - 1][x].type === 'conveyor' || grid[y - 1][x].type === 'resource' || grid[y - 1][x].type === 'factory') && !(prevX === x && prevY === y - 1);
  const hasDown = grid[y + 1] && grid[y + 1][x] && (grid[y + 1][x].type === 'conveyor' || grid[y + 1][x].type === 'resource' || grid[y + 1][x].type === 'factory') && !(prevX === x && prevY === y + 1);
  
  const horizontalCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0);
  const verticalCount = (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
  
  // Es una curva si venimos en una dirección y salimos en otra perpendicular
  const comingFromVertical = direction.dy !== 0;
  const comingFromHorizontal = direction.dx !== 0;
  
  if (comingFromVertical && horizontalCount > 0) {
    // Viniendo verticalmente, saliendo horizontalmente
    const entryDir = direction.dy > 0 ? 1 : -1; // 1 = desde arriba, -1 = desde abajo
    const exitDir = hasRight ? 1 : -1; // 1 = hacia derecha, -1 = hacia izquierda
    return { 
      isCurve: true, 
      type: 'vertical-to-horizontal',
      entryDir,
      exitDir
    };
  } else if (comingFromHorizontal && verticalCount > 0) {
    // Viniendo horizontalmente, saliendo verticalmente
    const entryDir = direction.dx > 0 ? 1 : -1; // 1 = desde izquierda, -1 = desde derecha
    const exitDir = hasDown ? 1 : -1; // 1 = hacia abajo, -1 = hacia arriba
    return { 
      isCurve: true, 
      type: 'horizontal-to-vertical',
      entryDir,
      exitDir
    };
  }
  
  return { isCurve: false };
}

export function createItemsByPositionMap(items) {
  return items.reduce((map, item) => {
    const key = `${item.x},${item.y}`;
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

export function isBeltFull(itemsByPosition, x, y) {
  const key = `${x},${y}`;
  return (itemsByPosition[key]?.length || 0) >= 3;
}

export function updateStatsCache(items) {
  let stored = 0;
  let inTransit = 0;
  for (const item of items) {
    if (item.stored) stored++;
    else inTransit++;
  }
  return { inTransit, stored, total: items.length };
}
