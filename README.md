# EPI Dashboard - Sistema de Detección de Equipos de Protección Personal

**Versión:** 2.9.5  
**Última actualización:** 16 de noviembre de 2025  
**Desarrollado por:** CoironTech

## 📋 Descripción

EPI Dashboard es una aplicación web profesional para la detección y análisis de Equipos de Protección Personal (EPP) utilizando inteligencia artificial de AWS. El sistema permite analizar imágenes, videos y detección en tiempo real para verificar el cumplimiento de normas de seguridad laboral.

## ✨ Funcionalidades Principales

### Análisis de EPP
- Detección de 10 elementos de protección: casco, chaleco, guantes, botas, gafas, mascarilla, protección auditiva, arnés, rodilleras, respirador
- Análisis de imágenes, videos y detección en tiempo real con webcam
- Bounding boxes visuales con niveles de confianza
- Resúmenes inteligentes generados con Amazon Bedrock (Claude 3 Haiku)
- Exportación de informes profesionales en PDF

### Análisis Adicionales
- Detección de rostros con análisis de emociones y características
- Detección de texto en imágenes (OCR)
- Detección de objetos y etiquetas generales

### Sistema de Usuarios
- Autenticación segura con AWS Cognito
- Perfiles de usuario con datos del inspector
- Historial personal de análisis con paginación
- Sistema de roles: Admin y Usuario

### Panel de Administración (v2.9+)
- Estadísticas globales con gráficos de actividad (30 días)
- Gestión de usuarios: reset de contraseñas, cambio de roles
- Visualización de historial completo de cualquier usuario
- Acceso a informes detallados con comparación de imágenes

## 🏗️ Arquitectura AWS

### Servicios Utilizados
- **Amazon Rekognition**: Detección de EPP, rostros, texto y objetos
- **Amazon Bedrock**: Generación de resúmenes inteligentes (Claude 3 Haiku)
- **Amazon Cognito**: Autenticación y gestión de usuarios
- **Amazon S3**: Almacenamiento de imágenes analizadas
- **Amazon DynamoDB**: Persistencia de análisis y perfiles
- **AWS Lambda**: Procesamiento serverless (8 funciones)
- **Amazon API Gateway**: Endpoints REST (3 APIs)
- **AWS Amplify**: Hosting y despliegue continuo

### API Gateways
1. **n0f5jga1wc** - API principal de análisis
2. **22ieg9wnd8** - API de perfiles de usuario
3. **zwjh3jgrsi** - API de administración (epi-admin-api)

### Funciones Lambda
1. `epi-rekognition-lambda` - Detección de EPP
2. `epi-face-detection-lambda` - Análisis de rostros
3. `epi-text-detection-lambda` - OCR de texto
4. `epi-label-detection-lambda` - Detección de objetos
5. `count-analysis-lambda` - Contador de análisis (DynamoDB Scan)
6. `epi-admin-stats-lambda` - Estadísticas globales
7. `epi-admin-users-lambda` - Listado de usuarios
8. `epi-admin-actions-lambda` - Acciones administrativas

### Tablas DynamoDB
- `epi-user-analysis` - Historial de análisis por usuario
- `UserProfiles` - Perfiles de inspectores

### Cognito User Pools
- `epi-dashboard-users` (us-east-1_zrdfN7OKN) - Pool principal
- Atributo personalizado: `custom:role` (admin/user)

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 16+ y npm
- Cuenta de AWS con servicios configurados
- Credenciales de AWS configuradas localmente

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd epi-dashboard

# Instalar dependencias
npm install

# Configurar variables de entorno
# Editar src/aws-config.ts con tus credenciales AWS
```

### Configuración AWS

Editar `src/aws-config.ts`:

```typescript
export const awsConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_zrdfN7OKN',
  userPoolClientId: '3aqhvhqvvvvvvvvvvvvvvvvvvv',
  apiGatewayUrl: 'https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod',
  // ... más configuraciones
};
```

### Scripts Disponibles

```bash
# Desarrollo local
npm start
# Abre http://localhost:3000

# Build de producción
npm run build
# Genera carpeta build/ optimizada

# Tests
npm test

# Análisis de bundle
npm run analyze
```

## 📁 Estructura del Proyecto

```
epi-dashboard/
├── src/
│   ├── components/
│   │   ├── AdminPanel.tsx          # Panel de administración
│   │   ├── ImageComparison.tsx     # Comparador de imágenes
│   │   ├── ModernHeader.tsx        # Header con navegación
│   │   ├── UserMenu.tsx            # Menú de usuario
│   │   └── ...
│   ├── utils/
│   │   ├── pdfGenerator.ts         # Generación de PDFs
│   │   └── ...
│   ├── aws-config.ts               # Configuración AWS
│   ├── version.ts                  # Versión de la app
│   └── App.tsx                     # Componente principal
├── LOGS/
│   ├── Resumen-Jornada-01.md       # Documentación de desarrollo
│   ├── Resumen-Jornada-02.md
│   └── ...
├── ARQUITECTURA-TECNICA-EPI-COIRONTECH.md
├── CHANGELOG.md
└── README.md
```

## 📊 Métricas del Proyecto

- **Usuarios registrados**: 22
- **Usuarios activos**: 15
- **Análisis totales**: 97 (75 EPP, 10 rostros, 8 objetos, 4 texto)
- **Versiones**: 2.0.0 → 2.9.5
- **Jornadas de desarrollo**: 7
- **Funciones Lambda**: 8
- **APIs Gateway**: 3

## 📖 Documentación Adicional

- **[ARQUITECTURA-TECNICA-EPI-COIRONTECH.md](./ARQUITECTURA-TECNICA-EPI-COIRONTECH.md)** - Arquitectura completa del sistema
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios y versiones
- **[LOGS/](./LOGS/)** - Resúmenes detallados de cada jornada de desarrollo
  - Resumen-Jornada-01.md a Resumen-Jornada-07.md
  - Análisis técnicos y resolución de problemas

## 🔒 Seguridad

- Autenticación multi-factor disponible en Cognito
- Tokens JWT con expiración automática
- Roles y permisos granulares (admin/user)
- Políticas IAM restrictivas en Lambda
- CORS configurado correctamente en API Gateway
- Datos sensibles nunca expuestos en frontend

## 🚀 Despliegue

### AWS Amplify (Automático)

```bash
# Push a main activa despliegue automático
git push origin main
```

### Manual

```bash
npm run build
# Subir carpeta build/ a S3 o hosting
```

## 🛠️ Tecnologías

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Gráficos**: Recharts
- **PDF**: jsPDF
- **Geolocalización**: country-state-city
- **AWS SDK**: @aws-sdk/client-*
- **Autenticación**: AWS Amplify Auth

## 📝 Notas de Desarrollo

- Lazy loading implementado para optimizar rendimiento
- Paginación en historial (10 items por página)
- DynamoDB Scan optimizado para contadores (~100ms)
- Separación de User Pools para evitar conflictos de configuración
- Conversión de Decimal a float para serialización JSON
- CORS configurado en OPTIONS + headers de Lambda

## 📞 Contacto

**CoironTech**  
Email: info@coirontech.com  
Web: www.coirontech.com

---

**Desarrollado con ❤️ por CoironTech usando AWS**
