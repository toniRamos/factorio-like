// Factory related logic

export function updateFactoryResources(grid, itemsByFactoryBefore, itemsByFactoryAfter) {
  let resourcesGained = 0;
  
  for (const key in itemsByFactoryAfter) {
    const [x, y] = key.split(',').map(Number);
    const before = itemsByFactoryBefore[key] || 0;
    const after = itemsByFactoryAfter[key];
    
    if (after > before && grid[y] && grid[y][x] && grid[y][x].type === 'factory') {
      const gain = after - before;
      grid[y][x].storedResources = (grid[y][x].storedResources || 0) + gain;
      resourcesGained += gain;
    }
  }
  
  return resourcesGained;
}

export function handleFactoryClick(grid, x, y) {
  const directions = ['up', 'right', 'down', 'left'];
  const currentDir = grid[y][x].inputDirection || 'up';
  const currentIndex = directions.indexOf(currentDir);
  const nextIndex = (currentIndex + 1) % directions.length;
  grid[y][x].inputDirection = directions[nextIndex];
  return grid;
}

export function rotateFactoryDirection(currentDirection) {
  const directions = ['up', 'right', 'down', 'left'];
  const currentIndex = directions.indexOf(currentDirection);
  const nextIndex = (currentIndex + 1) % directions.length;
  return directions[nextIndex];
}

export function createFactory(inputDirection) {
  return {
    inputDirection,
    storedResources: 0
  };
}
