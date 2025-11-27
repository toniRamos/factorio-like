// Guardar el estado de la cuadrícula en localStorage
export function saveGridState(gridData) {
  try {
    localStorage.setItem('factorio-grid-state', JSON.stringify(gridData));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

// Cargar el estado de la cuadrícula desde localStorage
export function loadGridState() {
  try {
    const saved = localStorage.getItem('factorio-grid-state');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

// Limpiar el estado guardado
export function clearGridState() {
  try {
    localStorage.removeItem('factorio-grid-state');
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

// Crear una cuadrícula vacía
export function createEmptyGrid(width, height) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        type: 'empty', // Tipos: empty, wall, resource, etc.
        content: null
      });
    }
    grid.push(row);
  }
  return grid;
}
