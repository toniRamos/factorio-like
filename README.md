# Resource Factory

A minimalist, Factorio-inspired factory builder that runs **entirely in
the browser** using **Svelte**.\
No backend, no accounts: just build your factory, **export your save as
JSON**, and import it back whenever you want.

Perfect as a playground for: - Simulation & game loops in the browser -
Grid-based building placement - State management + persistence in
`localStorage` - Svelte components for interactive UIs

------------------------------------------------------------------------

## Features (MVP)

-   🧱 **Grid-based map**
    -   Simple tile grid (terrain + resource nodes)
    -   Place buildings on tiles (e.g. miners, belts, smelters,
        storages)
-   ⚙️ **Basic production chain**
    -   Miners produce raw resources over time
    -   Belts transport items
    -   Smelters consume inputs and produce processed materials
    -   Storage buildings accumulate items
-   ⏱ **Tick-based simulation**
    -   Game loop updates the world every few hundred milliseconds
    -   Resource production, transport and processing happen over time
-   💾 **Local save system**
    -   Automatic persistence in `localStorage`
    -   All game state (map, buildings, resources) is serialised to JSON
-   📤📥 **Export / Import saves**
    -   Export your current run as a downloadable JSON file
    -   Import a JSON save file to restore a factory
    -   Designed to be compatible with GitHub Pages hosting (no backend
        needed)

------------------------------------------------------------------------

## Tech Stack

-   Svelte -- UI + state management
-   Vite -- Dev server & build tooling
-   Vanilla JavaScript / TypeScript -- Game logic & simulation
-   localStorage -- Client-side persistence for saves

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js (LTS recommended)
-   npm / pnpm / yarn

### Installation

``` bash
git clone https://github.com/<your-username>/resource-factory.git
cd resource-factory
npm install
```

### Development

``` bash
npm run dev
```

### Build

``` bash
npm run build
```

### Preview

``` bash
npm run preview
```

------------------------------------------------------------------------

## Deploying to GitHub Pages

Because it's fully static, you can deploy by: 1. Building the project 2.
Publishing the `dist` folder to `gh-pages`

A GitHub Action workflow can automate this.

------------------------------------------------------------------------

## Gameplay Overview (MVP Scope)

### World

-   2D grid (20x20, 30x30...)
-   Tiles: terrain, resources, buildings

### Buildings

-   Miner
-   Belt
-   Smelter
-   Storage

### Simulation Loop

Each tick: - Miners produce - Belts move items - Smelters
consume+produce - Storage updates counts

------------------------------------------------------------------------

## Save System

### Saved Data

-   Map layout
-   Buildings + positions
-   Inventories
-   Tick count
-   Game speed

### Export

-   Generate JSON
-   Download file

### Import

-   Load JSON file
-   Validate and restore state
-   Overwrite localStorage

------------------------------------------------------------------------

## Project Structure (Draft)

    src/
      lib/
        core/
          simulation/
          world/
          buildings/
          inventory/
          save-system/
        ui/
          components/
          pages/
      App.svelte
      main.js

------------------------------------------------------------------------

## Roadmap

### Phase 1 -- MVP

-   Rendering
-   Building placement
-   Tick production
-   LocalStorage
-   Import/export

### Phase 2 -- Depth

-   More resources
-   Better belts
-   Tech tree
-   UI polish

### Phase 3 -- Advanced

-   Power system
-   Complex recipes
-   Analytics
-   Optional tutorial
-   Mobile support

------------------------------------------------------------------------

## Contributing

Fork → branch → pull request.

------------------------------------------------------------------------

## License

TBD (likely MIT).
