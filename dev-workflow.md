# Qontrol Development Workflow

## 🚀 Quick Development Setup

### Prerequisites
```bash
# Install dependencies for all packages
npm install

# Install tsx globally for faster TypeScript execution
npm install -g tsx
```

### Development Modes

#### 1. Full Development Mode (Recommended)
Runs all packages in watch mode + Express example + UI development server:
```bash
npm run dev
```
This starts:
- Core package TypeScript compilation in watch mode
- Express package TypeScript compilation in watch mode  
- UI package Vite dev server with HMR
- Express example server with auto-restart

#### 2. Package Development Only
Just compile packages in watch mode (no servers):
```bash
npm run dev:packages
```

#### 3. Individual Package Development
```bash
# Core package only
npm run dev:core

# Express package only
npm run dev:express-pkg

# UI package only
npm run dev:ui

# Express example server only
npm run dev:express
```

#### 4. Frontend Only Development
If you have a separate backend running:
```bash
npm run dev:frontend
```

## 🔄 Development Workflow

### Making Changes to Core Package
1. Edit files in `packages/core/src/`
2. TypeScript watch mode automatically recompiles
3. Express example server auto-restarts (if running)
4. Changes are immediately available

### Making Changes to Express Package
1. Edit files in `packages/express/src/`
2. TypeScript watch mode automatically recompiles
3. Express example server auto-restarts
4. UI automatically picks up API changes

### Making Changes to UI Package
1. Edit files in `packages/ui/src/`
2. Vite HMR updates browser instantly
3. Changes visible immediately in browser

### Making Changes to Express Example
1. Edit files in `examples/express/src/`
2. tsx watch mode restarts server automatically
3. New changes available on next request

## 🛠️ Useful Commands

### Build Commands
```bash
npm run build              # Build all packages + frontend
npm run build:packages     # Build packages only
npm run build:watch        # Build packages in watch mode
```

### Development Utilities
```bash
npm run clean             # Clean all dist folders and node_modules
npm run clean:dist        # Clean only dist folders
npm run fresh-install     # Clean everything and reinstall
npm run type-check        # Check TypeScript types
npm run type-check:watch  # Check types in watch mode
```

### Testing
```bash
npm test                  # Run tests
npm run test:watch        # Run tests in watch mode
```

## 📂 Project Structure Flow

```
Root Project
├── packages/core/        → TypeScript watch → dist/
├── packages/express/     → TypeScript watch → dist/
├── packages/ui/          → Vite dev server → localhost:5173
└── apps/backend/         → tsx watch → localhost:3000
```

## 🔧 IDE Setup Recommendations

### VS Code Extensions
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- Auto Import - ES6, TS, JSX, TSX

### VS Code Settings (`.vscode/settings.json`)
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "eslint.workingDirectories": ["packages/*", "examples/*", "apps/*"],
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in respective config files
2. **TypeScript errors**: Run `npm run type-check` to see all errors
3. **Module not found**: Run `npm run fresh-install`
4. **Stale cache**: Delete `node_modules` and `dist` folders, reinstall

### Development Tips

1. **Hot Module Replacement**: UI changes update instantly in browser
2. **Auto-restart**: Backend changes restart server automatically  
3. **Type Safety**: TypeScript compilation catches errors early
4. **Live Reload**: Express example reloads on file changes
5. **Concurrent Development**: Work on multiple packages simultaneously

## 📊 Performance Tips

1. Use `npm run dev:packages` if you don't need UI development
2. Use individual package scripts for focused development
3. Use `npm run type-check:watch` in separate terminal for type checking
4. Keep only necessary packages running to reduce resource usage
