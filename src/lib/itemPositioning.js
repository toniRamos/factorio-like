// Item positioning logic

export function getItemPosition(item, index, cellSize) {
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
  
  if (direction.dx !== 0) {
    const direction_multiplier = direction.dx > 0 ? 1 : -1;
    offsetX = cellProgress * cellSize * direction_multiplier;
    offsetY = 0;
  } else if (direction.dy !== 0) {
    const direction_multiplier = direction.dy > 0 ? 1 : -1;
    offsetY = cellProgress * cellSize * direction_multiplier;
    offsetX = 0;
  }

  return { offsetX, offsetY };
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
