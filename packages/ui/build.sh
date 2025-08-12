#!/bin/bash
echo "Building @bulldash/ui package..."
cd /Users/developer/code/work/so/bulldash/packages/ui
npm run build
echo "Build completed. Checking dist folder..."
ls -la dist/

