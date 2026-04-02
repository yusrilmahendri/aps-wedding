#!/bin/bash

# Build script for Vercel deployment
echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Building Angular application..."
ng build --configuration production

echo "Build complete!"
