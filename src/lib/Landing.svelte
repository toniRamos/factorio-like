<script>
  import { createEventDispatcher, onMount } from 'svelte';
  
  const dispatch = createEventDispatcher();
  let hasSavedGame = false;
  
  onMount(() => {
    // Check if there's saved game data
    const saved = localStorage.getItem('factorio-grid-state');
    hasSavedGame = saved !== null;
  });
  
  function continueGame() {
    dispatch('start', { mode: 'creative', continue: true });
  }
  
  function startNewGame() {
    if (hasSavedGame) {
      if (confirm('⚠️ Starting a new game will overwrite your current saved progress. Are you sure you want to continue?')) {
        dispatch('start', { mode: 'newgame' });
      }
    } else {
      dispatch('start', { mode: 'newgame' });
    }
  }
  
  function startCreative() {
    dispatch('start', { mode: 'creative' });
  }
</script>

<div class="landing">
  <div class="container">
    <div class="header">
      <h1>🏭 Factorio-like Game</h1>
      <p class="subtitle">Build, automate, and optimize your factory</p>
    </div>

    <div class="menu">
      {#if hasSavedGame}
        <button class="menu-button continue" on:click={continueGame}>
          <span class="icon">💾</span>
          <span class="text">Continue</span>
          <span class="description">Resume your saved game</span>
        </button>
      {/if}

      <button class="menu-button primary" on:click={startNewGame}>
        <span class="icon">🎮</span>
        <span class="text">New Game</span>
        <span class="description">Start with procedurally generated map</span>
      </button>

      <button class="menu-button secondary" on:click={startCreative}>
        <span class="icon">⚙️</span>
        <span class="text">Creative Mode</span>
        <span class="description">Unlimited resources and no restrictions</span>
      </button>
    </div>

    <div class="features">
      <div class="feature">
        <span class="feature-icon">🔄</span>
        <span>Auto-saving to localStorage</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📦</span>
        <span>Resource nodes & factories</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🚚</span>
        <span>Smart conveyor belts</span>
      </div>
    </div>
  </div>
</div>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 2rem;
  }

  .container {
    max-width: 600px;
    width: 100%;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    font-size: 3rem;
    margin: 0;
    background: linear-gradient(135deg, #646cff 0%, #00d4ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.2rem;
    color: #888;
    margin: 0;
  }

  .menu {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .menu-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    border: 2px solid transparent;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .menu-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .menu-button:hover::before {
    left: 100%;
  }

  .menu-button:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(100, 108, 255, 0.3);
  }

  .menu-button.primary {
    border-color: #646cff;
  }

  .menu-button.primary:hover {
    background: rgba(100, 108, 255, 0.1);
    border-color: #747bff;
  }

  .menu-button.continue {
    border-color: #4CAF50;
  }

  .menu-button.continue:hover {
    background: rgba(76, 175, 80, 0.1);
    border-color: #66BB6A;
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
  }

  .menu-button.secondary {
    border-color: #00d4ff;
  }

  .menu-button.secondary:hover {
    background: rgba(0, 212, 255, 0.1);
    border-color: #33ddff;
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .text {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
  }

  .description {
    font-size: 0.9rem;
    color: #888;
    text-align: center;
  }

  .features {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #888;
    font-size: 0.9rem;
  }

  .feature-icon {
    font-size: 1.2rem;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    .menu-button {
      padding: 1.5rem;
    }

    .text {
      font-size: 1.2rem;
    }

    .features {
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
  }
</style>
