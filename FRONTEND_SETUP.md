# 🎨 FRONTEND_SETUP.md - Guía de Despliegue del Frontend

## 📋 Resumen

Esta guía te permitirá configurar y ejecutar el **Frontend del IoT Fleet Management System** en tu entorno local. El frontend está desarrollado en Angular 19 con TailwindCSS 4.1 y PrimeNG 19.1.

---

## 🎯 Requisitos del Sistema

### Software Requerido

#### **Frontend (Angular)**
- **Node.js 18.x** o superior
- **npm 9.x** o superior
- **Angular CLI 19.x**

#### **Herramientas Adicionales**
- **Git** para control de versiones
- **VS Code** (recomendado) con extensiones de Angular

### Verificación de Requisitos

```bash
# Verificar Node.js
node --version
# Debe mostrar: v18.x.x o superior

# Verificar npm
npm --version
# Debe mostrar: 9.x.x o superior

# Verificar Angular CLI
ng version
# Debe mostrar: Angular CLI: 19.x.x
```

---

## 📥 Instalación de Dependencias

### 1. **Instalar Node.js**

#### Windows
```powershell
# Descargar desde: https://nodejs.org/
# O usar winget
winget install OpenJS.NodeJS
```

#### macOS
```bash
# Usar Homebrew
brew install node
```

#### Linux (Ubuntu/Debian)
```bash
# Usar NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. **Instalar Angular CLI**

```bash
# Instalar Angular CLI globalmente
npm install -g @angular/cli@19

# Verificar instalación
ng version
```

### 3. **Instalar Extensiones de VS Code (Recomendado)**

```json
// .vscode/extensions.json
{
  "recommendations": [
    "angular.ng-template",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 📁 Clonación del Repositorio

```bash
# Clonar el repositorio del frontend
git clone https://github.com/tu-usuario/iot-fleet-frontend.git
cd iot-fleet-frontend

# Verificar estructura
ls -la
# Debe mostrar: src/, package.json, angular.json, FRONTEND_DESIGN.md, FRONTEND_SETUP.md
```

---

## ⚙️ Configuración del Frontend

### 1. **Restaurar Dependencias**

```bash
# Instalar dependencias
npm install

# Verificar instalación
ng version
```

### 2. **Configurar Variables de Entorno**

Crear archivo `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7162/api',
  wsUrl: 'https://localhost:7162/RealTime',
  mapApiKey: 'tu-api-key-de-mapas', // Opcional
  version: '1.0.0'
};
```

Crear archivo `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.iotfleet.com/api',
  wsUrl: 'https://api.iotfleet.com/RealTime',
  mapApiKey: 'tu-api-key-de-mapas-prod',
  version: '1.0.0'
};
```

### 3. **Configurar Proxy para Desarrollo**

Crear archivo `proxy.conf.json`:

```json
{
  "/api/*": {
    "target": "https://localhost:7162",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/RealTime": {
    "target": "https://localhost:7162",
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "logLevel": "debug"
  }
}
```

### 4. **Configurar TailwindCSS 4.1**

Crear archivo `src/styles.css`:

```css
@import "tailwindcss";

@theme {
  --font-display: "Inter", "sans-serif";
  --color-primary-50: oklch(0.98 0.02 264);
  --color-primary-100: oklch(0.95 0.05 264);
  --color-primary-500: oklch(0.6 0.2 264);
  --color-primary-900: oklch(0.2 0.1 264);
  --breakpoint-3xl: 1920px;
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
}

/* Estilos globales */
body {
  font-family: var(--font-display);
}

/* Estilos de PrimeNG */
.p-card {
  @apply shadow-lg rounded-lg border border-gray-200;
}

.p-button {
  @apply rounded-md font-medium transition-all duration-200;
}

.p-button-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white;
}
```

### 5. **Configurar PrimeNG**

En `src/app/app.config.ts`:

```typescript
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: 'Aura',
        options: {
          prefix: 'p',
          darkModeSelector: '.dark-mode',
          cssLayer: false
        }
      }
    })
  ]
};
```

---

## 🚀 Ejecutar Frontend

### 1. **Modo Desarrollo**

```bash
# Ejecutar en modo desarrollo
ng serve --proxy-config proxy.conf.json

# O ejecutar con configuración específica
ng serve --configuration development --proxy-config proxy.conf.json
```

### 2. **Modo Producción**

```bash
# Compilar para producción
ng build --configuration production

# Servir archivos estáticos
npx http-server dist/iot-fleet-frontend -p 4200
```

### 3. **Verificar Frontend**

```bash
# El frontend debe estar ejecutándose en:
# http://localhost:4200

# Abrir en navegador y verificar:
# - Login funciona
# - Dashboard carga correctamente
# - Datos se muestran en tiempo real
```

---

## 🧪 Ejecutar Tests

### Frontend Tests

```bash
# Ejecutar tests unitarios
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests específicos
npm test -- --testNamePattern="LoginComponent"
```

### Scripts de Testing

```json
// package.json
{
  "scripts": {
    "test": "jest --coverage --coverageReporters=text --coverageReporters=text-summary --verbose",
    "test:no-coverage": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --coverageReporters=text --coverageReporters=text-summary --verbose",
    "test:coverage:html": "jest --coverage --coverageReporters=html --coverageReporters=text-summary",
    "test:ci": "jest --ci --coverage --watchAll=false --coverageReporters=text-summary --coverageReporters=lcov"
  }
}
```

---

## 🚀 Scripts de Automatización

### 1. **Script de Inicio (Windows)**

Crear archivo `start-frontend.ps1`:

```powershell
# start-frontend.ps1 - Script para iniciar el Frontend IoT Fleet
Write-Host "🎨 Iniciando IoT Fleet Frontend..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró 'package.json'" -ForegroundColor Red
    Write-Host "💡 Asegúrate de ejecutar este script desde el directorio del repositorio frontend" -ForegroundColor Yellow
    exit 1
}

# Verificar que Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js versión: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "💡 Instala Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar que npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm versión: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar que Angular CLI está instalado
try {
    $ngVersion = ng version --json | ConvertFrom-Json
    Write-Host "✅ Angular CLI versión: $($ngVersion.'@angular/cli')" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Angular CLI no está instalado globalmente" -ForegroundColor Yellow
    Write-Host "💡 Instalando Angular CLI..." -ForegroundColor Yellow
    npm install -g @angular/cli@19
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar Angular CLI" -ForegroundColor Red
        exit 1
    }
}

# Verificar que las dependencias están instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
}

# Verificar que el archivo de proxy existe
if (-not (Test-Path "proxy.conf.json")) {
    Write-Host "⚠️  No se encontró 'proxy.conf.json'" -ForegroundColor Yellow
    Write-Host "💡 Creando archivo de proxy..." -ForegroundColor Yellow
    
    $proxyConfig = @"
{
  "/api/*": {
    "target": "https://localhost:7162",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/RealTime": {
    "target": "https://localhost:7162",
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "logLevel": "debug"
  }
}
"@
    
    $proxyConfig | Out-File -FilePath "proxy.conf.json" -Encoding UTF8
    Write-Host "✅ Archivo proxy.conf.json creado" -ForegroundColor Green
}

# Verificar que el archivo de environment existe
if (-not (Test-Path "src/environments/environment.ts")) {
    Write-Host "⚠️  No se encontró 'src/environments/environment.ts'" -ForegroundColor Yellow
    Write-Host "💡 Creando archivo de environment..." -ForegroundColor Yellow
    
    # Crear directorio si no existe
    if (-not (Test-Path "src/environments")) {
        New-Item -ItemType Directory -Path "src/environments" -Force
    }
    
    $environmentConfig = @"
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7162/api',
  wsUrl: 'https://localhost:7162/RealTime',
  mapApiKey: 'tu-api-key-de-mapas', // Opcional
  version: '1.0.0'
};
"@
    
    $environmentConfig | Out-File -FilePath "src/environments/environment.ts" -Encoding UTF8
    Write-Host "✅ Archivo environment.ts creado" -ForegroundColor Green
}

# Verificar que el backend está ejecutándose
Write-Host "🔧 Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://localhost:7162/health" -SkipCertificateCheck -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend está ejecutándose" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend no está ejecutándose o no es accesible" -ForegroundColor Yellow
    Write-Host "💡 Asegúrate de que el backend esté ejecutándose en https://localhost:7162" -ForegroundColor Cyan
    Write-Host "💡 Ejecuta: .\start-backend.ps1" -ForegroundColor Cyan
}

# Iniciar el frontend
Write-Host "🚀 Iniciando frontend..." -ForegroundColor Green
Write-Host "🌐 URL: http://localhost:4200" -ForegroundColor Cyan
Write-Host "💡 Para detener, presiona Ctrl+C" -ForegroundColor Yellow
Write-Host ""

ng serve --proxy-config proxy.conf.json
```

### 2. **Script de Inicio (Linux/macOS)**

Crear archivo `start-frontend.sh`:

```bash
#!/bin/bash
# start-frontend.sh - Script para iniciar el Frontend IoT Fleet

echo "🎨 Iniciando IoT Fleet Frontend..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró 'package.json'"
    echo "💡 Asegúrate de ejecutar este script desde el directorio del repositorio frontend"
    exit 1
fi

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado o no está en el PATH"
    echo "💡 Instala Node.js desde: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js versión: $(node --version)"

# Verificar que npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    exit 1
fi

echo "✅ npm versión: $(npm --version)"

# Verificar que Angular CLI está instalado
if ! command -v ng &> /dev/null; then
    echo "⚠️  Angular CLI no está instalado globalmente"
    echo "💡 Instalando Angular CLI..."
    npm install -g @angular/cli@19
    
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar Angular CLI"
        exit 1
    fi
fi

echo "✅ Angular CLI versión: $(ng version --json | jq -r '.["@angular/cli"]')"

# Verificar que las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar dependencias"
        exit 1
    fi
else
    echo "✅ Dependencias ya instaladas"
fi

# Verificar que el archivo de proxy existe
if [ ! -f "proxy.conf.json" ]; then
    echo "⚠️  No se encontró 'proxy.conf.json'"
    echo "💡 Creando archivo de proxy..."
    
    cat > proxy.conf.json << EOF
{
  "/api/*": {
    "target": "https://localhost:7162",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/RealTime": {
    "target": "https://localhost:7162",
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "logLevel": "debug"
  }
}
EOF
    
    echo "✅ Archivo proxy.conf.json creado"
fi

# Verificar que el archivo de environment existe
if [ ! -f "src/environments/environment.ts" ]; then
    echo "⚠️  No se encontró 'src/environments/environment.ts'"
    echo "💡 Creando archivo de environment..."
    
    # Crear directorio si no existe
    mkdir -p src/environments
    
    cat > src/environments/environment.ts << EOF
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7162/api',
  wsUrl: 'https://localhost:7162/RealTime',
  mapApiKey: 'tu-api-key-de-mapas', // Opcional
  version: '1.0.0'
};
EOF
    
    echo "✅ Archivo environment.ts creado"
fi

# Verificar que el backend está ejecutándose
echo "🔧 Verificando backend..."
if curl -k -s https://localhost:7162/health > /dev/null; then
    echo "✅ Backend está ejecutándose"
else
    echo "⚠️  Backend no está ejecutándose o no es accesible"
    echo "💡 Asegúrate de que el backend esté ejecutándose en https://localhost:7162"
    echo "💡 Ejecuta: ./start-backend.sh"
fi

# Iniciar el frontend
echo "🚀 Iniciando frontend..."
echo "🌐 URL: http://localhost:4200"
echo "💡 Para detener, presiona Ctrl+C"
echo ""

ng serve --proxy-config proxy.conf.json
```

```bash
# Hacer ejecutable
chmod +x start-frontend.sh
```

---

## 🔍 Verificación del Sistema

### 1. **Checklist de Verificación**

#### Frontend
- [ ] ✅ Node.js 18+ instalado
- [ ] ✅ Angular CLI 19 instalado
- [ ] ✅ Dependencias instaladas
- [ ] ✅ Frontend ejecutándose en http://localhost:4200
- [ ] ✅ Login funciona
- [ ] ✅ Dashboard carga datos
- [ ] ✅ Comunicación en tiempo real funciona

#### Tests
- [ ] ✅ Tests del frontend pasan
- [ ] ✅ Cobertura de código > 80%

### 2. **Comandos de Verificación**

```bash
# Verificar frontend
curl http://localhost:4200

# Verificar tests
npm test

# Verificar build
ng build --configuration production
```

---

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. **Error: "Node.js no encontrado"**

```bash
# Verificar instalación de Node.js
node --version

# Si no está instalado, instalarlo
# Windows: https://nodejs.org/
# macOS: brew install node
# Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

#### 2. **Error: "Angular CLI no encontrado"**

```bash
# Instalar Angular CLI globalmente
npm install -g @angular/cli@19

# Verificar instalación
ng version
```

#### 3. **Error: "Puerto 4200 en uso"**

```bash
# Verificar puertos en uso
netstat -tulpn | grep :4200

# Matar procesos si es necesario
sudo kill -9 $(lsof -t -i:4200)

# O usar otro puerto
ng serve --port 4201
```

#### 4. **Error: "CORS" en el frontend**

```bash
# Verificar que el proxy está configurado
cat proxy.conf.json

# Verificar que se está usando el proxy
ng serve --proxy-config proxy.conf.json
```

#### 5. **Error: "Dependencias no encontradas"**

```bash
# Limpiar cache de npm
npm cache clean --force

# Eliminar node_modules y package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar dependencias
npm install
```

### Logs y Debugging

#### Frontend Logs
```bash
# Ver logs de Angular
ng serve --verbose

# Logs del navegador
# F12 -> Console tab
```

#### Debugging en VS Code
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:4200",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

---

## 📚 Recursos Adicionales

### Documentación
- [Angular 19 Documentation](https://angular.io/docs)
- [TailwindCSS 4.1 Documentation](https://tailwindcss.com/)
- [PrimeNG Documentation](https://primeng.org/)
- [Chart.js Documentation](https://www.chartjs.org/)

### Herramientas de Desarrollo
- [Angular DevTools](https://angular.io/guide/devtools) - Browser extension
- [VS Code Angular Extension](https://marketplace.visualstudio.com/items?itemName=angular.ng-template)
- [Prettier](https://prettier.io/) - Code formatter

### Comunidad
- [Stack Overflow](https://stackoverflow.com/questions/tagged/angular)
- [GitHub Issues](https://github.com/tu-usuario/iot-fleet-frontend/issues)
- [Angular Discord](https://discord.gg/angular)

---

## 🎉 ¡Listo para Desarrollar!

Una vez completados todos los pasos, deberías tener:

- ✅ **Frontend** ejecutándose en http://localhost:4200
- ✅ **Dependencias** instaladas correctamente
- ✅ **Tests** ejecutándose correctamente
- ✅ **Documentación** completa disponible

### Próximos Pasos

1. **Probar el frontend** en: http://localhost:4200
2. **Revisar los tests** para entender la funcionalidad
3. **Leer FRONTEND_DESIGN.md** para entender la arquitectura
4. **Contribuir al proyecto** siguiendo las mejores prácticas

### Credenciales de Prueba

- **Usuario Admin**: `admin` / `12345`
- **Usuario Regular**: `user` / `12345`

---

*Guía creada: Enero 2024*  
*Versión: 1.0*  
*Para soporte: [Crear un issue](https://github.com/tu-usuario/iot-fleet-frontend/issues)*
