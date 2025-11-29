// Game loop logic

export function createGameLoop(config) {
  const {
    tickRate,
    onTick,
    onStop
  } = config;

  let gameLoop = null;
  let isRunning = false;

  function start() {
    if (gameLoop) return;
    isRunning = true;
    
    gameLoop = setInterval(() => {
      if (!isRunning) return;
      onTick();
    }, tickRate);
  }

  function stop() {
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }
    isRunning = false;
    if (onStop) onStop();
  }

  function toggle() {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }

  function getIsRunning() {
    return isRunning;
  }

  return {
    start,
    stop,
    toggle,
    isRunning: getIsRunning
  };
}

export function updatePerformanceMetrics(metrics) {
  const { lastFrameTime, frameCount, avgTickTime, tickStart, tickEnd } = metrics;
  
  const now = Date.now();
  let newFps = metrics.fps;
  let newFrameCount = frameCount + 1;
  let newAvgTickTime = avgTickTime;

  // Calcular FPS
  if (now - lastFrameTime >= 1000) {
    newFps = newFrameCount;
    newFrameCount = 0;
  }

  // Calcular tiempo promedio de tick
  if (tickStart !== undefined && tickEnd !== undefined) {
    newAvgTickTime = (avgTickTime * 0.9) + ((tickEnd - tickStart) * 0.1);
  }

  return {
    fps: newFps,
    frameCount: newFrameCount,
    avgTickTime: newAvgTickTime,
    lastFrameTime: now - lastFrameTime >= 1000 ? now : lastFrameTime
  };
}
