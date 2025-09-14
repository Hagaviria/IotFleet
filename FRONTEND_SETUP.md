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


### 1. **Instalar Angular CLI**

```bash
# Instalar Angular CLI globalmente
npm install -g @angular/cli@19

# Verificar instalación
ng version
```

### 2. **Instalar Extensiones de VS Code (Recomendado)**

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

## 🚀 Ejecutar Frontend

### 1. **Modo Desarrollo**

```bash
ng serve 
```

### 2. **Modo Producción**

```bash
# Compilar para producción
ng build --configuration production

# Servir archivos estáticos
npx http-server dist/iot-fleet-frontend -p 4200
```


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







1. **Probar el frontend** en: http://localhost:4200
2. **Revisar los tests** para entender la funcionalidad
3. **Leer FRONTEND_DESIGN.md** para entender la arquitectura
4. **Contribuir al proyecto** siguiendo las mejores prácticas

### Credenciales de Prueba

- **Usuario Admin**: `admin` / `12345`
- **Usuario Regular**: `user` / `12345`

---


