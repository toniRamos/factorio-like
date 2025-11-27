<script>
  import Grid from './lib/Grid.svelte';
  import Landing from './lib/Landing.svelte';
  
  let gridWidth = 20;
  let gridHeight = 20;
  let cellSize = 30;
  let showSettings = false;
  let gameMode = null; // null = landing, 'newgame' or 'creative'

  function handleStart(event) {
    gameMode = event.detail.mode;
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
        <span class="mode-badge">{gameMode === 'creative' ? '⚙️ Creative Mode' : '🎮 New Game'}</span>
      </div>
      <button class="back-button" on:click={backToMenu}>
        ← Back to Menu
      </button>
    </div>
    <p class="subtitle">2D factory building and automation game</p>

  <div class="controls">
    <button on:click={() => showSettings = !showSettings}>
      ⚙️ Configuración
    </button>
  </div>

  {#if showSettings}
    <div class="settings-panel">
      <h3>Configuración de la Cuadrícula</h3>
      <div class="settings-group">
        <label>
          Ancho:
          <input type="number" bind:value={gridWidth} min="5" max="50" />
        </label>
        <label>
          Alto:
          <input type="number" bind:value={gridHeight} min="5" max="50" />
        </label>
        <label>
          Tamaño de celda:
          <input type="number" bind:value={cellSize} min="10" max="50" />
        </label>
      </div>
      <div class="settings-buttons">
        <button on:click={applySettings}>Aplicar</button>
        <button on:click={() => showSettings = false}>Cancelar</button>
      </div>
      <p class="warning">⚠️ Cambiar el tamaño puede reiniciar la cuadrícula</p>
    </div>
  {/if}

  <Grid {gridWidth} {gridHeight} {cellSize} />

  <footer>
    <p>💾 Progress automatically saves to localStorage</p>
  </footer>
</main>
{/if}

<style>
  main {
    max-width: 100%;
    margin: 0 auto;
    padding: 1rem;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 1rem;
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
    color: #888;
    margin-bottom: 2rem;
  }

  .controls {
    margin-bottom: 1rem;
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
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid #444;
  }

  footer p {
    color: #888;
    font-size: 0.9rem;
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
