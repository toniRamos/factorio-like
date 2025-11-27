// Sistema de recursos que se mueven por las cintas

const MAX_ITEMS_PER_BELT = 3;

// Objeto para rastrear qué salida se usó por última vez en cada posición
const outputTracker = {};

// Función para obtener la clave de posición
function getPositionKey(x, y) {
  return `${x},${y}`;
}

// Encontrar cintas adyacentes a una celda
export function getAdjacentBelts(grid, x, y) {
  const adjacent = [];
  const directions = [
    { dx: 0, dy: -1, dir: 'up' },
    { dx: 1, dy: 0, dir: 'right' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: -1, dy: 0, dir: 'left' }
  ];

  for (const { dx, dy, dir } of directions) {
    const newX = x + dx;
    const newY = y + dy;
    
    if (grid[newY] && grid[newY][newX] && grid[newY][newX].type === 'conveyor') {
      adjacent.push({ x: newX, y: newY, dir });
    }
  }

  return adjacent;
}

// Encontrar la siguiente posición en una cinta
export function getNextBeltPosition(grid, x, y, fromX, fromY) {
  // Direcciones posibles
  const directions = [
    { dx: 0, dy: -1, dir: 'up' },
    { dx: 1, dy: 0, dir: 'right' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: -1, dy: 0, dir: 'left' }
  ];

  const posKey = getPositionKey(x, y);
  const candidates = [];

  // Si tenemos una posición anterior, intentar seguir en la misma dirección primero
  if (fromX !== undefined && fromY !== undefined) {
    const prevDx = x - fromX;
    const prevDy = y - fromY;
    
    // Intentar continuar en la misma dirección
    const continueStraight = directions.find(d => d.dx === prevDx && d.dy === prevDy);
    if (continueStraight) {
      const newX = x + continueStraight.dx;
      const newY = y + continueStraight.dy;
      if (grid[newY] && grid[newY][newX]) {
        const cellType = grid[newY][newX].type;
        if (cellType === 'conveyor' || cellType === 'factory') {
          candidates.push({ x: newX, y: newY, dir: continueStraight.dir, type: cellType, priority: 1 });
        }
      }
    }
  }

  // Buscar otras cintas o fábricas adyacentes (excluyendo la posición de donde venimos)
  for (const { dx, dy, dir } of directions) {
    const newX = x + dx;
    const newY = y + dy;
    
    // No volver atrás
    if (fromX !== undefined && fromY !== undefined && newX === fromX && newY === fromY) {
      continue;
    }

    // Evitar duplicados (ya lo agregamos como continueStraight)
    if (candidates.some(c => c.x === newX && c.y === newY)) {
      continue;
    }
    
    if (grid[newY] && grid[newY][newX]) {
      const cellType = grid[newY][newX].type;
      if (cellType === 'conveyor' || cellType === 'factory') {
        candidates.push({ x: newX, y: newY, dir, type: cellType, priority: 0 });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Si solo hay una opción, usarla
  if (candidates.length === 1) {
    return candidates[0];
  }

  // Si hay múltiples opciones, alternar entre ellas
  // Priorizar dirección recta, pero si hay múltiples salidas, hacer round-robin
  const straightOptions = candidates.filter(c => c.priority === 1);
  const sideOptions = candidates.filter(c => c.priority === 0);

  // Si hay recto y lados, priorizar según el contador
  if (straightOptions.length > 0 && sideOptions.length > 0) {
    // Inicializar contador si no existe
    if (!outputTracker[posKey]) {
      outputTracker[posKey] = 0;
    }
    
    // Alternar: 0 = recto, 1+ = lado
    const useCount = outputTracker[posKey];
    outputTracker[posKey] = (useCount + 1) % (straightOptions.length + sideOptions.length);
    
    if (useCount < straightOptions.length) {
      return straightOptions[useCount % straightOptions.length];
    } else {
      const sideIndex = useCount - straightOptions.length;
      return sideOptions[sideIndex % sideOptions.length];
    }
  }

  // Si solo hay múltiples rectos o múltiples lados
  const options = candidates;
  if (!outputTracker[posKey]) {
    outputTracker[posKey] = 0;
  }
  
  const selected = options[outputTracker[posKey] % options.length];
  outputTracker[posKey] = (outputTracker[posKey] + 1) % options.length;
  
  return selected;
}

// Generar un nuevo recurso desde un nodo de recurso
export function generateResourceFromNode(grid, x, y, items) {
  const adjacentBelts = getAdjacentBelts(grid, x, y);
  
  if (adjacentBelts.length > 0) {
    // Elegir la primera cinta disponible que no esté llena
    for (const targetBelt of adjacentBelts) {
      if (canAcceptItem(grid, items, targetBelt.x, targetBelt.y)) {
        // Crear un nuevo item en la cinta
        const newItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          x: targetBelt.x,
          y: targetBelt.y,
          prevX: x,
          prevY: y,
          progress: 0, // 0-1, progreso en la celda actual
          type: 'resource',
          stored: false,
          blocked: false
        };
        
        return newItem;
      }
    }
  }
  
  return null;
}

// Contar items en una celda específica
export function countItemsAtPosition(items, x, y) {
  return items.filter(item => item.x === x && item.y === y).length;
}

// Verificar si una celda puede recibir más items
export function canAcceptItem(grid, items, x, y) {
  if (!grid[y] || !grid[y][x]) return false;
  
  const cellType = grid[y][x].type;
  
  // Las fábricas siempre pueden aceptar items (se almacenan)
  if (cellType === 'factory') {
    return true;
  }
  
  // Las cintas tienen límite de capacidad
  if (cellType === 'conveyor') {
    return countItemsAtPosition(items, x, y) < MAX_ITEMS_PER_BELT;
  }
  
  return false;
}

// Mover items por las cintas
export function moveItems(grid, items, speed = 0.1) {
  const newItems = [];
  
  for (const item of items) {
    const updatedItem = { ...item };
    
    // Si el item está en una fábrica, se queda ahí (almacenado)
    if (grid[item.y] && grid[item.y][item.x] && grid[item.y][item.x].type === 'factory') {
      // El item permanece en la fábrica sin moverse
      updatedItem.stored = true;
      updatedItem.blocked = false;
      newItems.push(updatedItem);
      continue;
    }
    
    // Intentar encontrar siguiente posición
    const nextPos = getNextBeltPosition(grid, item.x, item.y, item.prevX, item.prevY);
    
    // Si no hay siguiente posición (final de la línea)
    if (!nextPos) {
      // Contar cuántos items hay ya en esta celda
      const itemsInCell = newItems.filter(i => i.x === item.x && i.y === item.y).length;
      
      // Determinar la posición según cuántos items hay
      // Posición 1: 0.9, Posición 2: 0.5, Posición 3: 0.1
      const targetProgress = itemsInCell === 0 ? 0.9 : itemsInCell === 1 ? 0.5 : 0.1;
      
      // Mover hacia la posición objetivo si aún no está ahí
      if (Math.abs(updatedItem.progress - targetProgress) > 0.05) {
        if (updatedItem.progress < targetProgress) {
          updatedItem.progress = Math.min(updatedItem.progress + speed, targetProgress);
        } else {
          updatedItem.progress = Math.max(updatedItem.progress - speed, targetProgress);
        }
      } else {
        updatedItem.progress = targetProgress;
      }
      
      // Bloquear el item en su posición
      updatedItem.blocked = true;
      newItems.push(updatedItem);
      continue;
    }
    
    // Si está cerca del final de la celda (progress > 0.7), verificar si puede avanzar
    if (updatedItem.progress >= 0.7) {
      const canMove = canAcceptItem(grid, newItems, nextPos.x, nextPos.y);
      
      if (!canMove) {
        // Bloqueado, no puede avanzar más en esta celda
        updatedItem.progress = 0.9; // Fijar en posición de bloqueo
        updatedItem.blocked = true;
        newItems.push(updatedItem);
        continue;
      }
    }
    
    // Si estaba bloqueado pero ahora puede moverse
    if (item.blocked) {
      const canMove = canAcceptItem(grid, newItems, nextPos.x, nextPos.y);
      if (!canMove) {
        // Sigue bloqueado
        updatedItem.blocked = true;
        newItems.push(updatedItem);
        continue;
      } else {
        // Ya no está bloqueado
        updatedItem.blocked = false;
      }
    }
    
    // Solo mover si no está bloqueado
    if (!updatedItem.blocked) {
      updatedItem.progress += speed;
    }
    
    // Si el item ha completado su movimiento en la celda actual
    if (updatedItem.progress >= 1) {
      // Si el destino es una fábrica, mover y marcar como almacenado
      if (nextPos.type === 'factory') {
        updatedItem.prevX = item.x;
        updatedItem.prevY = item.y;
        updatedItem.x = nextPos.x;
        updatedItem.y = nextPos.y;
        updatedItem.progress = 1;
        updatedItem.stored = true;
        updatedItem.blocked = false;
        newItems.push(updatedItem);
      } else {
        // Mover a la siguiente celda (cinta)
        updatedItem.prevX = item.x;
        updatedItem.prevY = item.y;
        updatedItem.x = nextPos.x;
        updatedItem.y = nextPos.y;
        updatedItem.progress = 0;
        updatedItem.blocked = false;
        newItems.push(updatedItem);
      }
    } else {
      newItems.push(updatedItem);
    }
  }
  
  return newItems;
}

// Buscar todos los nodos de recursos en el grid
export function findResourceNodes(grid) {
  const nodes = [];
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].type === 'resource') {
        const adjacentBelts = getAdjacentBelts(grid, x, y);
        if (adjacentBelts.length > 0) {
          nodes.push({ x, y });
        }
      }
    }
  }
  
  return nodes;
}
