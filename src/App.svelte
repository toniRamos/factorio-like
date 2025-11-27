<script>
  import Grid from './lib/Grid.svelte';
  import Landing from './lib/Landing.svelte';
  
  let gridWidth = 50;
  let gridHeight = 50;
  let cellSize = 15;
  let showSettings = false;
  let gameMode = null; // null = landing, 'newgame' or 'creative'
  let isContinueMode = false; // Track if continuing a saved game
  let gridKey = 0; // Para forzar recreación del componente Grid

  function handleStart(event) {
    gameMode = event.detail.mode;
    isContinueMode = event.detail.continue || false;
    gridKey++; // Forzar recreación del Grid con el nuevo modo
  }

  function applySettings() {
    // Asegurar que los valores sean válidos
    gridWidth = Math.max(5, Math.min(50, gridWidth));
    gridHeight = Math.max(5, Math.min(50, gridHeight));
    cellSize = Math.max(10, Math.min(50, cellSize));
    showSettings = false;
  }

  function backToMenu() {
    if (confirm('Are you sure you want to return to the main menu? Unsaved progress will be lost.')) {
      gameMode = null;
    }
  }
</script>

{#if gameMode === null}
  <Landing on:start={handleStart} />
{:else}
  <main>
    <div class="game-header">
      <div class="title-section">
        <h1>🏭 Factorio-like Game</h1>
        <span class="mode-badge">
          {#if isContinueMode}
            💾 Continue
          {:else if gameMode === 'creative'}
            ⚙️ Creative Mode
          {:else}
            🎮 New Game
          {/if}
        </span>
      </div>
      <button class="back-button" on:click={backToMenu}>
        ← Back to Menu
      </button>
    </div>

  {#if gameMode === 'creative' && !isContinueMode}
    <div class="controls">
      <button on:click={() => showSettings = !showSettings}>
        ⚙️ Settings
      </button>
    </div>
  {/if}

  {#if showSettings && gameMode === 'creative' && !isContinueMode}
    <div class="settings-panel">
      <h3>Grid Configuration</h3>
      <div class="settings-group">
        <label>
          Width:
          <input type="number" bind:value={gridWidth} min="5" max="50" />
        </label>
        <label>
          Height:
          <input type="number" bind:value={gridHeight} min="5" max="50" />
        </label>
        <label>
          Cell size:
          <input type="number" bind:value={cellSize} min="10" max="50" />
        </label>
      </div>
      <div class="settings-buttons">
        <button on:click={applySettings}>Apply</button>
        <button on:click={() => showSettings = false}>Cancel</button>
      </div>
      <p class="warning">⚠️ Changing size may reset the grid</p>
    </div>
  {/if}

  <Grid {gridWidth} {gridHeight} {cellSize} {gameMode} {isContinueMode} key={gridKey} />

  <footer>
    <p>💾 Progress automatically saves to localStorage</p>
  </footer>
</main>
{/if}

<style>
  main {
    max-width: 100%;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .game-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 900;
    background: rgba(26, 26, 26, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 2px solid #444;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
    gap: 1rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .mode-badge {
    background: rgba(100, 108, 255, 0.2);
    border: 1px solid #646cff;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.9rem;
    color: #646cff;
    font-weight: 500;
  }

  .back-button {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid #444;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #646cff;
  }

  h1 {
    color: #646cff;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 899;
    color: #888;
    margin: 0;
    padding: 0.5rem 1rem;
    background: rgba(26, 26, 26, 0.8);
    border-radius: 0 0 8px 8px;
    font-size: 0.9rem;
  }

  .controls {
    position: fixed;
    top: 60px;
    right: 20px;
    z-index: 899;
  }

  .settings-panel {
    background-color: #2a2a2a;
    border: 2px solid #444;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .settings-panel h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .settings-group label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .settings-group input {
    width: 100px;
    padding: 0.5rem;
    background-color: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    color: white;
  }

  .settings-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .warning {
    margin-top: 1rem;
    margin-bottom: 0;
    color: #ff9800;
    font-size: 0.9rem;
    text-align: center;
  }

  footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 900;
    background: rgba(26, 26, 26, 0.95);
    backdrop-filter: blur(10px);
    border-top: 2px solid #444;
    padding: 0.5rem 1rem;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
  }

  footer p {
    color: #888;
    font-size: 0.9rem;
    margin: 0;
    text-align: center;
  }

  @media (prefers-color-scheme: light) {
    .settings-panel {
      background-color: #f5f5f5;
      border-color: #ddd;
    }

    .settings-group input {
      background-color: white;
      color: #213547;
    }

    .mode-badge {
      background: rgba(100, 108, 255, 0.1);
    }

    .back-button {
      background: rgba(0, 0, 0, 0.05);
      color: #213547;
    }
  }
</style>
