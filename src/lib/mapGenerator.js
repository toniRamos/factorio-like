// Generación procedural de mapas

export function generateProceduralMap(width, height) {
  const grid = [];
  
  // Crear grid base vacío
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        type: 'empty',
        content: null
      });
    }
    grid.push(row);
  }
  
  // Generar muros en los bordes
  for (let x = 0; x < width; x++) {
    grid[0][x].type = 'wall';
    grid[height - 1][x].type = 'wall';
  }
  for (let y = 0; y < height; y++) {
    grid[y][0].type = 'wall';
    grid[y][width - 1].type = 'wall';
  }
  
  // Generar algunos muros internos (obstáculos)
  const numWallClusters = Math.floor((width * height) / 200);
  for (let i = 0; i < numWallClusters; i++) {
    const centerX = Math.floor(Math.random() * (width - 4)) + 2;
    const centerY = Math.floor(Math.random() * (height - 4)) + 2;
    const clusterSize = Math.floor(Math.random() * 3) + 2;
    
    for (let dx = -clusterSize; dx <= clusterSize; dx++) {
      for (let dy = -clusterSize; dy <= clusterSize; dy++) {
        const nx = centerX + dx;
        const ny = centerY + dy;
        
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
          if (Math.random() < 0.6) {
            grid[ny][nx].type = 'wall';
          }
        }
      }
    }
  }
  
  // Generar nodos de recursos en posiciones accesibles
  const numResourceNodes = Math.floor((width * height) / 100);
  let resourcesPlaced = 0;
  let attempts = 0;
  const maxAttempts = numResourceNodes * 10;
  
  while (resourcesPlaced < numResourceNodes && attempts < maxAttempts) {
    attempts++;
    const x = Math.floor(Math.random() * (width - 4)) + 2;
    const y = Math.floor(Math.random() * (height - 4)) + 2;
    
    // Verificar que la celda esté vacía
    if (grid[y][x].type !== 'empty') continue;
    
    // Verificar que haya espacio libre alrededor (al menos una celda vacía para acceso)
    let hasAccess = false;
    const neighbors = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];
    
    for (const { dx, dy } of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid[ny] && grid[ny][nx] && grid[ny][nx].type === 'empty') {
        hasAccess = true;
        break;
      }
    }
    
    if (hasAccess) {
      // 50% mineral, 50% plata
      const resourceType = Math.random() < 0.5 ? 'mineral' : 'silver';
      grid[y][x].type = 'resource';
      grid[y][x].resourceType = resourceType;
      resourcesPlaced++;
    }
  }
  
  return grid;
}
