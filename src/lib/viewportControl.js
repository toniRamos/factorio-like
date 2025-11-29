// Viewport control (zoom and pan)

export function createViewportController() {
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastPanX = 0;
  let lastPanY = 0;

  function handleWheel(event, maxScale = 10, minScale = 0.3) {
    event.preventDefault();
    const delta = -event.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    scale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));
    return scale;
  }

  function handleMouseDown(event) {
    if (event.button === 0 || event.button === 1) {
      event.preventDefault();
      isDragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      lastPanX = panX;
      lastPanY = panY;
    }
    return isDragging;
  }

  function handleMouseMove(event, gridWidth, gridHeight, cellSize) {
    if (!isDragging) return { panX, panY };

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    
    const container = event.currentTarget;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaledWidth = (gridWidth * cellSize) * scale;
    const scaledHeight = (gridHeight * cellSize) * scale;
    
    const proposedPanX = lastPanX + deltaX;
    const proposedPanY = lastPanY + deltaY;
    
    let maxPanX, minPanX, maxPanY, minPanY;
    
    if (scaledWidth < containerWidth) {
      maxPanX = 0;
      minPanX = 0;
    } else {
      maxPanX = (scaledWidth - containerWidth) / 2;
      minPanX = -maxPanX;
    }
    
    if (scaledHeight < containerHeight) {
      maxPanY = 0;
      minPanY = 0;
    } else {
      maxPanY = (scaledHeight - containerHeight) / 2;
      minPanY = -maxPanY;
    }
    
    panX = Math.max(minPanX, Math.min(maxPanX, proposedPanX));
    panY = Math.max(minPanY, Math.min(maxPanY, proposedPanY));

    return { panX, panY };
  }

  function handleMouseUp() {
    isDragging = false;
    return isDragging;
  }

  function reset() {
    scale = 1;
    panX = 0;
    panY = 0;
    return { scale, panX, panY };
  }

  function getState() {
    return { scale, panX, panY, isDragging };
  }

  function setState(newState) {
    if (newState.scale !== undefined) scale = newState.scale;
    if (newState.panX !== undefined) panX = newState.panX;
    if (newState.panY !== undefined) panY = newState.panY;
  }

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    reset,
    getState,
    setState
  };
}
