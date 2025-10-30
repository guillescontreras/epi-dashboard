#!/bin/bash

# Obtener número de commits
COMMIT_COUNT=$(git rev-list --count HEAD)

# Calcular versión: 1.0.X donde X es el número de commits
VERSION="1.0.$COMMIT_COUNT"

# Actualizar package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json && rm package.json.bak

# Crear archivo de versión para la app
echo "export const APP_VERSION = '$VERSION';" > src/version.ts

echo "✅ Versión actualizada a: $VERSION"
