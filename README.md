# 🏭 Factorio-like Game

A 2D web-based game inspired by Factorio, built with Svelte and Vite. Features a complete resource production and transportation system with conveyor belts, automatic item generation, and intelligent flow management.

## 🚀 Features

### Grid & Building System
- ✅ **Parametrizable Grid**: Default 20x20, configurable from 5x5 up to 50x50
- ✅ **Multiple Building Tools**: Walls, resource nodes, factories, and conveyor belts
- ✅ **Click-to-Place System**: Intuitive building interface
- ✅ **Auto-Save**: Automatic persistence to localStorage
- ✅ **Adjustable Cell Size**: 10-50px for optimal visibility
- ✅ **GitHub Pages Ready**: Configured for static deployment

### Resource & Transportation System
- ✅ **Resource Nodes**: Automatically generate resources every 2 seconds when connected to belts
- ✅ **Conveyor Belts**: Realistic item transportation with directional flow
- ✅ **Belt Capacity**: Maximum 3 items per belt cell with visual stacking
- ✅ **Smart Flow Control**: Items stop when destination is full or unreachable
- ✅ **Automatic Balancing**: Belt junctions use round-robin to distribute items evenly between outputs
- ✅ **Dead-End Handling**: Items stack up to 3 when belts have no outlet

### Visual Feedback System
- ✅ **Moving Items**: 🟡 Golden dots flowing smoothly through belts
- ✅ **Blocked Items**: 🔴 Red-orange pulsing dots when stuck or at capacity
- ✅ **Stored Items**: 🟢 Green dots in factory storage
- ✅ **Full Belt Indicator**: Red border highlights when belt reaches 3-item capacity
- ✅ **Factory Counter**: Numeric display of stored item count
- ✅ **Directional Movement**: Items move correctly horizontal/vertical based on belt direction
- ✅ **Position-Based Stacking**: Multiple items visible in same cell at different positions

### Simulation & Game Loop
- ✅ **Real-Time Simulation**: 200ms tick rate for smooth gameplay
- ✅ **Pause/Resume Controls**: Full simulation control
- ✅ **Item Tracking**: Live counter of items in transit
- ✅ **Smart Pathfinding**: Items remember previous position and prefer straight paths
- ✅ **No-Backtrack Logic**: Items never return to where they came from

## 🎮 Available Building Types

### Erase Tool
- Remove any building from the grid
- Clears space for redesigning your factory

### Wall (Gray)
- Decorative/blocking element
- Currently no collision (future feature)

### Resource Node (Green)
- **Auto-Generation**: Creates items every 2 seconds
- **Smart Output**: Only generates when adjacent belt has space
- **Capacity Aware**: Stops production when connected belts are full

### Factory (Blue)
- **Item Storage**: Accepts and stores unlimited items
- **Visual Counter**: Shows stored item count in top-right
- **End Point**: Items turn green when stored

### Conveyor Belt (Orange)
- **Item Transport**: Moves items at consistent speed
- **3-Item Capacity**: Holds maximum 3 items per cell
- **Visual Distribution**: Items spread across cell (10%, 50%, 90% positions)
- **Junction Balancing**: Automatically alternates between multiple outputs
- **Blockage System**: Items stop and turn red when unable to proceed

## 🎯 How to Play

### Basic Setup
1. **Place a Resource Node** (green) - This will generate items
2. **Connect Conveyor Belts** (orange) - Create a path from the resource
3. **Add a Factory** (blue) - Place at the end to collect items
4. **Watch It Run**: Resources automatically flow from node → belt → factory

### Advanced Techniques

#### Creating Storage Buffers
- Place a belt with no outlet to create a 3-item buffer
- Items will stack and wait (shown in red)

#### Building Splitters
- Connect one belt to multiple outputs
- Items automatically alternate between paths (Item 1 → Left, Item 2 → Right, etc.)

#### Flow Control
- Use the Pause button to stop simulation
- Clear All to reset the entire grid
- Monitor "Items in transit" counter

## 🛠️ Development

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Server will start at `http://localhost:5173/factorio-like/`

### Build for Production
```bash
npm run build
```
Output will be in the `dist/` folder

### Preview Production Build
```bash
npm run preview
```

## 📦 Deploying to GitHub Pages

### Option 1: Automatic Deployment (Recommended)

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys on push to `main`.

**Setup:**
1. Go to repository Settings → Pages
2. Source: Select "GitHub Actions"
3. Push to `main` branch
4. Workflow will build and deploy automatically

### Option 2: Manual Deployment

1. Ensure `base` in `vite.config.js` matches your repo name
2. Run `npm run build`
3. Deploy `dist/` folder to `gh-pages` branch

## 💾 Save System

### Automatic Saving
- Grid state saves to localStorage on every change
- No manual save required
- Persists between browser sessions

### What Gets Saved
- Grid dimensions (width × height)
- All placed buildings and their positions
- Building types (wall, resource, factory, belt)

### What Doesn't Get Saved (Yet)
- Items in transit on belts
- Items stored in factories
- Simulation state (paused/running)

## 📁 Project Structure

```
factorio-like/
├── src/
│   ├── lib/
│   │   ├── Grid.svelte          # Main grid component with simulation
│   │   ├── gridUtils.js         # Grid creation & localStorage helpers
│   │   └── beltSystem.js        # Item movement & belt logic
│   ├── App.svelte               # Root component with settings
│   ├── app.css                  # Global styles
│   └── main.js                  # Entry point
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions deployment
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration (GitHub Pages base)
├── svelte.config.js            # Svelte preprocessor config
└── package.json                # Dependencies & scripts
```

## 🔧 Technical Details

### Belt System Architecture

#### Item Flow
- Each item tracks: position (x, y), previous position, progress (0-1), blocked state
- Progress advances 0.15 per tick (200ms intervals)
- Items transition between cells when progress >= 1.0

#### Capacity Management
- `MAX_ITEMS_PER_BELT = 3`
- `canAcceptItem()` checks destination capacity before allowing movement
- Items block at 90% progress when next cell is full

#### Balancing Algorithm
- `outputTracker` object stores last-used output index per cell position
- Round-robin selection: `(lastIndex + 1) % availableOutputs.length`
- Prioritizes straight paths but alternates with side paths when both exist

#### Visual Positioning
- Items at progress 0.0-0.33 → position 1 (-33% of cell)
- Items at progress 0.34-0.66 → position 2 (center)
- Items at progress 0.67-1.0 → position 3 (+33% of cell)

## 🎨 Visual States

| State | Color | Animation | Meaning |
|-------|-------|-----------|---------|
| Moving | 🟡 Gold (#FFD700) | Smooth transition | Item flowing normally |
| Blocked | 🔴 Red-Orange (#FF5722) | Pulsing (1s) | Cannot advance (full/dead-end) |
| Stored | 🟢 Green (#4CAF50) | Static | Safely in factory storage |

## 🚧 Future Enhancements

### Planned Features
- [ ] Save/restore items in transit
- [ ] Multiple resource types (iron, copper, etc.)
- [ ] Item processing/crafting in factories
- [ ] Power system for buildings
- [ ] Inserters for loading/unloading
- [ ] Underground belts
- [ ] Belt splitters as dedicated buildings
- [ ] Production statistics
- [ ] Minimap view
- [ ] Export/import save files

## 📄 License

MIT
