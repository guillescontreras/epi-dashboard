# Documento Técnico de Arquitectura
## EPI-CoironTech - Sistema de Análisis Visual de Seguridad

**Versión:** 2.9.6  
**Fecha:** 16 de Noviembre 2025  
**Autor:** CoironTech Development Team  
**Estado:** Producción

> **📋 Nota:** Este documento describe la arquitectura general del sistema. Para detalles de implementaciones específicas, correcciones de bugs y evolución del proyecto, consultar los **Resúmenes de Jornada** en `/LOGS/Resumen-Jornada-XX.md`

---

## 1. Resumen Ejecutivo

EPI-CoironTech es una aplicación web progresiva (PWA) desarrollada para el análisis automatizado de cumplimiento de Equipos de Protección Personal (EPP) mediante inteligencia artificial. La solución combina tecnologías de visión por computadora, procesamiento en la nube y análisis con IA generativa para proporcionar evaluaciones precisas y reportes profesionales sobre seguridad laboral.

### 1.1 Propósito del Sistema

- Detección automatizada de EPP en imágenes y videos
- Evaluación de cumplimiento de normas de seguridad (OSHA, ISO 45001)
- Generación de reportes profesionales con análisis de IA
- Gestión de historial de análisis por usuario
- Dashboard de métricas y estadísticas

### 1.2 Características Principales

- ✅ Análisis de imágenes y videos en tiempo real
- ✅ Detección de múltiples tipos de EPP (casco, guantes, chaleco, gafas, etc.)
- ✅ Resúmenes generados con IA (Amazon Bedrock - Claude 3 Haiku)
- ✅ Exportación de informes en PDF
- ✅ Autenticación y perfiles de usuario
- ✅ Historial de análisis persistente
- ✅ Asistente guiado paso a paso (único modo de análisis)
- ✅ Análisis por lotes (batch processing)
- ✅ Panel de administración completo
- ✅ Sistema de roles (admin/user)
- ✅ Estadísticas globales con gráficos

---

## 2. Arquitectura General del Sistema

### 2.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAPA DE PRESENTACIÓN                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         React PWA (TypeScript + Tailwind CSS)             │  │
│  │  - Componentes modulares                                  │  │
│  │  - AWS Amplify UI                                         │  │
│  │  - TensorFlow.js (detección local)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│                    AWS Amplify Hosting                           │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE AUTENTICACIÓN                       │
│                                                                   │
│                      AWS Cognito User Pool                       │
│                  (us-east-1_zrdfN7OKN)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                         CAPA DE API                              │
│                                                                   │
│              AWS API Gateway (n0f5jga1wc)                       │
│  Endpoints:                                                      │
│  - POST /user-profile                                           │
│  - DELETE /delete                                               │
│  - POST /contact                                                │
│  - POST /feedback                                               │
│  - POST /bedrock-summary                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PROCESAMIENTO                       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Lambda      │  │   Lambda      │  │   Lambda      │         │
│  │ user-profile  │  │delete-analysis│  │   contact     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Lambda      │  │   Lambda      │                            │
│  │   feedback    │  │bedrock-summary│                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐       │
│  │        Lambda EPI Detection (Node.js)                │       │
│  │        - Amazon Rekognition Integration              │       │
│  │        - S3 Image Processing                         │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE SERVICIOS AWS                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Amazon      │  │   Amazon      │  │   Amazon      │         │
│  │ Rekognition   │  │   Bedrock     │  │     SES       │         │
│  │  (PPE API)    │  │(Claude Haiku) │  │   (Email)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PERSISTENCIA                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  DynamoDB     │  │  DynamoDB     │  │  DynamoDB     │         │
│  │ UserProfiles  │  │epi-user-      │  │ContactMessages│         │
│  │               │  │  analysis     │  │               │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────────────────────────┐        │
│  │  DynamoDB     │  │         Amazon S3                 │        │
│  │ UserFeedback  │  │  rekognition-gcontreras           │        │
│  │               │  │  - /input (imágenes originales)   │        │
│  └──────────────┘  │  - /output (imágenes anotadas)    │        │
│                     └──────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Patrón Arquitectónico

**Arquitectura Serverless de 3 Capas:**

1. **Frontend (Presentación):** React SPA con renderizado del lado del cliente
2. **Backend (Lógica):** AWS Lambda con funciones especializadas
3. **Datos (Persistencia):** DynamoDB (NoSQL) + S3 (objetos)

**Ventajas del patrón:**
- Escalabilidad automática
- Pago por uso (cost-effective)
- Alta disponibilidad
- Mantenimiento reducido
- Despliegue continuo simplificado

---

## 3. Componentes Frontend

### 3.1 Stack Tecnológico

```json
{
  "framework": "React 18.3.1",
  "lenguaje": "TypeScript 4.9.5",
  "estilos": "Tailwind CSS 3.4.13",
  "autenticación": "AWS Amplify 6.15.7",
  "ia-local": "TensorFlow.js 4.22.0",
  "generación-pdf": "jsPDF 3.0.3 + html2canvas 1.4.1",
  "notificaciones": "react-toastify 10.0.6",
  "http-client": "axios 1.7.7"
}
```

### 3.2 Estructura del Proyecto

```
epi-dashboard/
├── backend/                   # ⭐ Backend serverless
│   ├── lambdas/
│   │   ├── admin/            # Lambdas de administración
│   │   ├── analysis/         # Lambdas de análisis
│   │   ├── user/             # Lambdas de usuarios
│   │   ├── ai/               # Lambdas de IA
│   │   ├── notifications/    # Lambdas de alertas
│   │   └── utils/            # Lambdas de utilidades
│   ├── api-gateway/          # Configuraciones API Gateway
│   └── README.md             # Documentación backend
├── src/
│   ├── App.tsx               # Componente raíz
│   ├── aws-config.js         # Configuración Amplify/Cognito
│   ├── version.ts            # Control de versiones
│   ├── components/
│   │   ├── AuthWrapper.tsx
│   │   ├── ModernHeader.tsx
│   │   ├── UserMenu.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── GuidedAnalysisWizard.tsx
│   │   ├── DragDropUpload.tsx
│   │   ├── VideoProcessor.tsx
│   │   ├── RealtimeDetection.tsx
│   │   ├── ImageComparison.tsx
│   │   ├── ResultsVisualization.tsx
│   │   ├── AISummary.tsx
│   │   ├── UserProfileModal.tsx
│   │   ├── ContactModal.tsx
│   │   ├── FeedbackModal.tsx
│   │   ├── FAQ.tsx
│   │   ├── TermsAndConditions.tsx
│   │   └── WelcomeModal.tsx
│   └── utils/
│       └── pdfGenerator.ts
├── public/
├── LOGS/                      # Resúmenes de jornada
└── package.json
```

### 3.3 Flujo de Análisis de Imágenes

```
1. Usuario carga imagen/video
   ↓
2. Validación de formato y tamaño
   ↓
3. Selección de EPPs a detectar (modo guiado)
   ↓
4. Carga a S3 (bucket: rekognition-gcontreras/input)
   ↓
5. Invocación de Lambda EPI Detection
   ↓
6. Amazon Rekognition procesa imagen
   ↓
7. Respuesta con detecciones (JSON)
   ↓
8. Filtrado y evaluación en frontend
   ↓
9. Invocación de Lambda Bedrock Summary (IA)
   ↓
10. Renderizado de resultados + tabla EPP
    ↓
11. Guardado en DynamoDB (epi-user-analysis)
    ↓
12. Generación de PDF (opcional)
```

### 3.4 Componentes Clave

#### App.tsx (Orquestador Principal)
- Gestión de estado global (useState hooks)
- Lógica de análisis y evaluación
- Integración con servicios AWS
- Coordinación de flujos de trabajo

#### GuidedAnalysisWizard.tsx
- Asistente paso a paso (wizard pattern)
- Selección de EPPs requeridos
- Validación de inputs
- Progreso visual

#### ImageComparison.tsx
- Visualización lado a lado
- Tabla de detecciones por persona
- Métricas de cumplimiento
- Badges de EPPs detectados

#### AISummary.tsx
- Integración con Amazon Bedrock
- Renderizado de resumen generado por Claude
- Manejo de estados de carga

---

## 4. Componentes Backend

### 4.1 Funciones Lambda

#### 4.1.1 Lambda: EPI Detection (Node.js)

**Propósito:** Procesamiento de imágenes con Amazon Rekognition

**Runtime:** Node.js 18.x  
**Memoria:** 512 MB  
**Timeout:** 30 segundos

**Dependencias:**
```json
{
  "@aws-sdk/client-rekognition": "^3.913.0",
  "@aws-sdk/client-s3": "^3.913.0",
  "@aws-sdk/s3-request-presigner": "^3.913.0",
  "sharp": "^0.33.5"
}
```

**Funcionalidades:**
- Detección de EPP (DetectProtectiveEquipmentCommand)
- Detección de rostros (DetectFacesCommand)
- Detección de etiquetas (DetectLabelsCommand)
- Detección de texto (DetectTextCommand)
- Moderación de contenido (DetectModerationLabelsCommand)
- Reconocimiento de celebridades (RecognizeCelebritiesCommand)

**Parámetros de entrada:**
```json
{
  "bucket": "rekognition-gcontreras",
  "filename": "input/imagen.jpg",
  "detection_type": "ppe_detection",
  "min_confidence": 80
}
```

**Respuesta:**
```json
{
  "statusCode": 200,
  "body": {
    "ProtectiveEquipment": [...],
    "Summary": {
      "totalPersons": 3,
      "compliant": 2,
      "minConfidence": 80
    },
    "DetectionType": "ppe_detection",
    "presignedUrl": "https://...",
    "imagePresignedUrl": "https://..."
  }
}
```

**Nota:** A partir de v2.8.24, la Lambda devuelve dos URLs presignadas:
- `presignedUrl`: URL del JSON de resultados en S3 (/web)
- `imagePresignedUrl`: URL de la imagen original en S3 (/input) para uso en PDF

#### 4.1.2 Lambda: Bedrock Summary (Python)

**Propósito:** Generación de resúmenes con IA generativa

**Runtime:** Python 3.11  
**Memoria:** 256 MB  
**Timeout:** 60 segundos

**Modelo:** anthropic.claude-3-haiku-20240307-v1:0

**Entrada:**
```json
{
  "detections": [...],
  "selectedEPPs": ["FACE_COVER", "HEAD_COVER"],
  "totalPersons": 3,
  "compliantPersons": 2
}
```

**Salida:**
```json
{
  "summary": "Análisis de seguridad: Se detectaron 3 personas...",
  "recommendations": ["Reforzar uso de mascarillas", ...]
}
```

#### 4.1.3 Lambda: User Profile

**Propósito:** Gestión de perfiles de usuario

**Operaciones:**
- GET: Obtener perfil
- POST: Crear/actualizar perfil
- Validación de datos geográficos

#### 4.1.4 Lambda: Delete Analysis

**Propósito:** Eliminación de análisis del historial

**Validaciones:**
- Verificación de propiedad (userId)
- Eliminación condicional en DynamoDB

#### 4.1.5 Lambda: Contact Submission

**Propósito:** Procesamiento de mensajes de contacto

**Integraciones:**
- DynamoDB (tabla ContactMessages)
- Amazon SES (envío de emails)

**Tipos de mensaje:**
- Consulta general
- Soporte técnico
- Reporte de bug

#### 4.1.6 Lambda: Feedback Submission

**Propósito:** Recolección de feedback post-análisis

**Almacenamiento:** DynamoDB (tabla UserFeedback)

#### 4.1.7 Lambda: Upload Presigned (Node.js)

**Propósito:** Generación de URLs presignadas para S3

**Runtime:** Node.js 18.x  
**Memoria:** 128 MB  
**Timeout:** 10 segundos  
**API Gateway:** kmekzxexq5 (epi-upload)

**Funcionalidades:**
- Generar URL presignada para SUBIR imagen (PUT)
- Generar URL presignada para LEER imagen (GET)

**Parámetros:**
```
GET /upload?filename=imagen.jpg&operation=put   # Para subir (default)
GET /upload?filename=imagen.jpg&operation=get   # Para leer
```

**Respuesta:**
```json
{
  "url": "https://rekognition-gcontreras.s3.amazonaws.com/input/imagen.jpg?X-Amz-Algorithm=..."
}
```

**Uso:**
- **PUT:** Frontend obtiene URL para subir imagen antes del análisis
- **GET:** Frontend/PDF obtiene URL para leer imagen de análisis antiguos

### 4.2 API Gateway

#### API Gateway: get-user-history-api

**API ID:** n0f5jga1wc  
**Región:** us-east-1  
**Tipo:** REST API

**Endpoints:**

| Método | Ruta | Lambda | Autenticación |
|--------|------|--------|---------------|
| POST | /user-profile | user-profile | Cognito |
| GET | /user-profile | user-profile | Cognito |
| DELETE | /delete | delete-analysis | Cognito |
| POST | /contact | contact-submission | Pública |
| POST | /feedback | feedback-submission | Cognito |
| POST | /bedrock-summary | bedrock-summary | Cognito |

#### API Gateway: epi-upload

**API ID:** kmekzxexq5  
**Región:** us-east-1  
**Tipo:** REST API

**Endpoints:**

| Método | Ruta | Lambda | Autenticación |
|--------|------|--------|---------------|
| GET | /upload | upload-presigned | Pública |

**Configuración CORS:**
```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
}
```

---

## 5. Servicios AWS

### 5.1 Amazon Cognito

**User Pool ID:** us-east-1_zrdfN7OKN  
**Client ID:** 1r4a4vec9qbfsk3vmj7em6pigm

**Configuración:**
- Autenticación con email/password
- Verificación de email obligatoria
- Atributos personalizados: nombre, país, ciudad
- Políticas de contraseña: mínimo 8 caracteres

**Flujo de autenticación:**
1. Registro de usuario
2. Verificación de email
3. Login con credenciales
4. Obtención de tokens JWT
5. Refresh automático de tokens

### 5.2 Amazon Rekognition

**API Utilizada:** DetectProtectiveEquipment

**Tipos de EPP detectados:**
- HEAD_COVER (casco)
- HAND_COVER (guantes)
- FACE_COVER (mascarilla)

**Partes del cuerpo analizadas:**
- FACE
- HEAD
- LEFT_HAND
- RIGHT_HAND

**Configuración:**
```json
{
  "MinConfidence": 80,
  "SummarizationAttributes": {
    "RequiredEquipmentTypes": ["HEAD_COVER", "HAND_COVER", "FACE_COVER"]
  }
}
```

### 5.3 Amazon Bedrock

**Modelo:** Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0)

**Configuración:**
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1000,
  "temperature": 0.7
}
```

**Prompt Engineering:**
- Contexto: Análisis de seguridad laboral
- Formato: Resumen estructurado + recomendaciones
- Tono: Profesional y técnico

### 5.4 Amazon S3

**Bucket:** rekognition-gcontreras  
**Región:** us-east-1

**Estructura:**
```
rekognition-gcontreras/
├── input/          # Imágenes originales cargadas
├── output/         # Imágenes anotadas (futuro)
└── web/            # Resultados JSON
```

**Configuración CORS:**
```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```

**Políticas de ciclo de vida:**
- Transición a S3 Glacier después de 90 días
- Eliminación automática después de 365 días

### 5.5 Amazon DynamoDB

#### Tabla: UserProfiles

**Clave primaria:** userId (String)

**Atributos:**
```json
{
  "userId": "cognito-sub-id",
  "email": "user@example.com",
  "fullName": "Juan Pérez",
  "country": "Argentina",
  "state": "Buenos Aires",
  "city": "CABA",
  "createdAt": "2024-10-15T10:30:00Z",
  "updatedAt": "2024-10-20T14:45:00Z"
}
```

#### Tabla: epi-user-analysis

**Clave primaria:** analysisId (String)  
**GSI:** userId-timestamp-index

**Atributos:**
```json
{
  "analysisId": "uuid-v4",
  "userId": "cognito-sub-id",
  "timestamp": "2024-10-31T16:08:00Z",
  "imageUrl": "s3://bucket/input/image.jpg",
  "detections": {...},
  "selectedEPPs": ["FACE_COVER", "HEAD_COVER"],
  "summary": {
    "totalPersons": 3,
    "compliant": 2,
    "nonCompliant": 1
  },
  "aiSummary": "Texto generado por IA..."
}
```

#### Tabla: ContactMessages

**Clave primaria:** messageId (String)

**Atributos:**
```json
{
  "messageId": "uuid-v4",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "messageType": "technical_support",
  "message": "Tengo un problema con...",
  "timestamp": "2024-10-31T10:00:00Z",
  "status": "pending"
}
```

#### Tabla: UserFeedback

**Clave primaria:** feedbackId (String)

**Atributos:**
```json
{
  "feedbackId": "uuid-v4",
  "userId": "cognito-sub-id",
  "analysisId": "uuid-v4",
  "rating": 5,
  "comment": "Excelente herramienta",
  "timestamp": "2024-10-31T16:10:00Z"
}
```

### 5.6 Amazon SES

**Configuración:**
- Región: us-east-1
- Email verificado: noreply@coirontech.com
- Límite de envío: 200 emails/día (sandbox)

**Plantillas de email:**
- Contacto recibido
- Notificación de análisis completado
- Reporte de bug

---

## 6. Seguridad

### 6.1 Autenticación y Autorización

**Cognito User Pools:**
- Tokens JWT con expiración de 1 hora
- Refresh tokens válidos por 30 días
- MFA opcional (futuro)

**IAM Roles:**
- Lambda execution roles con permisos mínimos
- S3 bucket policies restrictivas
- DynamoDB fine-grained access control

### 6.2 Protección de Datos

**En tránsito:**
- HTTPS/TLS 1.2+ obligatorio
- API Gateway con certificados SSL

**En reposo:**
- DynamoDB encryption at rest (AWS managed keys)
- S3 server-side encryption (SSE-S3)

**PII Handling:**
- Enmascaramiento de datos sensibles en logs
- No almacenamiento de imágenes con rostros identificables (futuro)

### 6.3 Rate Limiting

**API Gateway:**
- 1000 requests/segundo por cuenta
- 5000 requests/segundo burst

**Lambda:**
- Concurrencia reservada: 10 ejecuciones simultáneas
- Throttling automático

---

## 7. Monitoreo y Observabilidad

### 7.1 CloudWatch Logs

**Log Groups:**
- /aws/lambda/epi-detection
- /aws/lambda/bedrock-summary
- /aws/lambda/user-profile
- /aws/lambda/delete-analysis
- /aws/lambda/contact-submission
- /aws/lambda/feedback-submission

**Retención:** 7 días

### 7.2 CloudWatch Metrics

**Métricas personalizadas:**
- Análisis completados por día
- Tasa de cumplimiento promedio
- Errores de detección
- Latencia de procesamiento

### 7.3 X-Ray (Futuro)

- Trazabilidad end-to-end
- Identificación de cuellos de botella
- Análisis de dependencias

---

## 8. Despliegue y CI/CD

### 8.1 AWS Amplify Hosting

**Branch:** main  
**Build Command:** `npm run build`  
**Output Directory:** build/

**Variables de entorno:**
```
REACT_APP_API_ENDPOINT=https://kmekzxexq5.execute-api.us-east-1.amazonaws.com
REACT_APP_USER_POOL_ID=us-east-1_zrdfN7OKN
REACT_APP_USER_POOL_CLIENT_ID=1r4a4vec9qbfsk3vmj7em6pigm
```

**Despliegue automático:**
- Trigger en push a main
- Build automático
- Despliegue a producción
- Rollback automático en caso de error

### 8.2 Lambda Deployment

**Proceso:**
1. Desarrollo local
2. npm run build (TypeScript → JavaScript)
3. Empaquetado con dependencias (zip)
4. Carga manual a Lambda Console
5. Actualización de alias/versión

**Futuro:** AWS SAM o Terraform para IaC

---

## 9. Rendimiento y Escalabilidad

### 9.1 Optimizaciones Frontend

- Code splitting con React.lazy()
- Lazy loading de imágenes
- Compresión de assets (gzip)
- CDN de Amplify para distribución global

### 9.2 Optimizaciones Backend

- Conexiones reutilizables a DynamoDB
- Batch operations cuando es posible
- Caché de resultados frecuentes (futuro)

### 9.3 Escalabilidad

**Lambda:**
- Auto-scaling hasta 1000 instancias concurrentes
- Cold start: ~500ms (Node.js), ~1s (Python)

**DynamoDB:**
- On-demand capacity mode
- Auto-scaling de throughput

**S3:**
- Escalabilidad ilimitada
- 3500 PUT/s, 5500 GET/s por prefijo

---

## 10. Costos Estimados

### 10.1 Desglose Mensual (1000 análisis/mes)

| Servicio | Uso | Costo Mensual |
|----------|-----|---------------|
| Lambda | 1000 invocaciones × 5 funciones | $0.50 |
| Rekognition | 1000 imágenes PPE | $5.00 |
| Bedrock | 1000 invocaciones Claude Haiku | $2.00 |
| DynamoDB | 1000 writes, 5000 reads | $1.50 |
| S3 | 10 GB storage, 1000 uploads | $0.50 |
| Cognito | 1000 MAU | Gratis (< 50k) |
| API Gateway | 1000 requests | $0.01 |
| Amplify Hosting | 1 app | $0.00 (free tier) |
| **TOTAL** | | **~$9.51/mes** |

### 10.2 Proyección de Crecimiento

| Análisis/mes | Costo Estimado |
|--------------|----------------|
| 1,000 | $9.51 |
| 10,000 | $85.00 |
| 100,000 | $750.00 |

---

## 11. Roadmap Técnico

### 11.1 Versión 2.7.0 (Q1 2025)
- ✅ Reactivación de modo avanzado
- ✅ Sincronización mejorada con DynamoDB
- ✅ Validación de guardado exitoso

### 11.2 Versión 3.0.0 (Q2 2025)
- 🔄 Panel de administrador
- 🔄 Dashboard de métricas globales
- 🔄 Gestión de usuarios
- 🔄 Reportes consolidados

### 11.3 Versión 3.1.0 (Q2 2025)
- 🔄 Modo inspección de sitio
- 🔄 Análisis por lotes mejorado
- 🔄 Geolocalización de análisis
- 🔄 Exportación masiva

### 11.4 Versión 4.0.0 (Q3 2025)
- 🔄 Soporte multilingüe (i18n)
- 🔄 MFA obligatorio para admins
- 🔄 PWA offline-first
- 🔄 Notificaciones push

---

## 12. Contacto y Soporte

**Equipo de Desarrollo:** CoironTech  
**Email:** soporte@coirontech.com  
**Sitio Web:** www.coirontech.com  
**Documentación:** [GitHub Repository]

---

---

## 13. Changelog de Arquitectura

### v2.8.24 - v2.8.26 (Noviembre 2024)

**Problema resuelto:** Carga de imágenes en PDF para análisis del historial

**Cambios implementados:**

1. **Lambda rekognition-processor:**
   - Agregado campo `imagePresignedUrl` en respuesta
   - Genera URL presignada de lectura (GET) para imagen original
   - Aplica a todos los tipos de detección (ppe, face, label, text)

2. **Lambda upload-presigned:**
   - Agregado parámetro `operation` (put/get)
   - Soporta generar URLs presignadas de lectura con `operation=get`
   - Mantiene compatibilidad con comportamiento original (PUT)

3. **API Gateway epi-upload (kmekzxexq5):**
   - Corregidos headers CORS en método GET
   - Corregidos headers CORS en método OPTIONS
   - `Access-Control-Allow-Origin: '*'` configurado correctamente

4. **Frontend (pdfGenerator.ts):**
   - Detecta URLs no presignadas (análisis antiguos)
   - Solicita nueva URL presignada vía `/upload?operation=get`
   - Usa patrón `<img>` + canvas para cargar imágenes (AWS best practice)

5. **Frontend (App.tsx):**
   - Usa `imagePresignedUrl` de respuesta de Lambda
   - Fallback a URL construida manualmente para compatibilidad

**Resultado:** PDFs se generan correctamente tanto para análisis nuevos como antiguos, usando URLs presignadas autenticadas que evitan problemas de CORS.

---

---

## 14. Documentación Complementaria

### 14.1 Resúmenes de Jornada

La evolución detallada del proyecto, incluyendo bugs corregidos, features implementadas y lecciones aprendidas, se documenta en resúmenes de jornada ubicados en:

**Ubicación:** `/Rekognition/LOGS/Resumen-Jornada-XX.md`

**Jornadas documentadas:**
- **Jornada 01-04:** Desarrollo inicial y features base
- **Jornada 05 (v2.8.9 → v2.8.18):** Corrección de guardado en historial para todos los tipos de análisis
- **Jornada 06 (v2.8.19 → v2.8.34):** Filtrado de EPPs, sistema de colores, UX de progreso unificado
- **Jornada 08 (v2.14.0+):** Estadísticas tiempo real, reorganización backend, optimización UX móvil

**Contenido de cada resumen:**
- Objetivo de la jornada
- Bugs críticos corregidos
- Features completadas
- Archivos modificados
- Lecciones aprendidas
- Métricas de versiones desplegadas

### 14.2 Otros Documentos Técnicos

- `Analisis-Deteccion-EPP.md` - Análisis técnico de detección de EPP
- `DETECCION-HIBRIDA-GAFAS.md` - Implementación de detección híbrida
- `Bug-Deteccion-Personas-v2.5.3.md` - Análisis de bug específico
- `PLANTILLA-RESUMEN-SESION.md` - Plantilla para nuevos resúmenes

---

**Última actualización:** 27 de Noviembre 2025  
**Versión del documento:** 1.3  
**Estado:** Producción Estable

### v2.14.0+ (Noviembre 2025)

**Reorganización del proyecto:**

1. **Carpeta backend/ creada:**
   - Todas las Lambdas descargadas desde AWS y organizadas por categoría
   - Estructura: admin/, analysis/, user/, ai/, notifications/, utils/
   - Documentación completa en backend/README.md

2. **Lambda epi-admin-stats actualizada:**
   - Soporte para `realtime_epp` en estadísticas
   - Conteo EPP incluye análisis de tiempo real
   - Línea 90: `'ppe': by_type.get('ppe_detection', 0) + by_type.get('realtime_epp', 0)`

3. **AdminPanel.tsx actualizado:**
   - Badge "🎥 LIVE" para análisis de tiempo real
   - Filtros incluyen `realtime_epp` en historial de usuarios
   - Icono 🎬 para diferenciar análisis en tiempo real

4. **RealtimeDetection.tsx optimizado:**
   - Mejora de legibilidad en móviles (text-xs en lugar de text-[10px])
   - Controles táctiles más grandes (w-9 h-5)
   - Balance entre compactación y usabilidad

**Resultado:** Código backend centralizado en el repositorio, estadísticas completas incluyendo tiempo real, mejor UX móvil.
