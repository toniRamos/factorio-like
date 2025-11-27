<script>
  import Grid from './lib/Grid.svelte';
  
  let gridWidth = 20;
  let gridHeight = 20;
  let cellSize = 30;
  let showSettings = false;

  function applySettings() {
    // Asegurar que los valores sean válidos
    gridWidth = Math.max(5, Math.min(50, gridWidth));
    gridHeight = Math.max(5, Math.min(50, gridHeight));
    cellSize = Math.max(10, Math.min(50, cellSize));
    showSettings = false;
  }
</script>

<main>
  <h1>🏭 Factorio-like Game</h1>
  <p class="subtitle">Juego de construcción y automatización en 2D</p>

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
    <p>💾 El progreso se guarda automáticamente en localStorage</p>
  </footer>
</main>

<style>
  main {
    max-width: 100%;
    margin: 0 auto;
    padding: 1rem;
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
  }
</style>
