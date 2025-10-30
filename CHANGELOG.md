# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [2.4.0] - 2024-10-31

### Agregado
- Dropdowns en cascada para ubicación geográfica en perfil de usuario
- Selección de país con banderas usando country-state-city
- Dropdown de provincias/estados que se carga según país seleccionado
- Dropdown de ciudades que se carga según provincia seleccionada
- Campos deshabilitados hasta que se complete la selección previa

### Modificado
- UserProfileModal ahora usa dropdowns en lugar de inputs de texto
- Datos geográficos estandarizados sin errores de tipeo
- Mejor UX con cascada automática de opciones

### Dependencias
- Agregada country-state-city@3.2.1

---

## [2.3.3] - 2024-10-31

### Agregado
- Botón para eliminar análisis del historial con confirmación
- Componente ConfirmModal personalizado con diseño de la app
- Lambda function delete-analysis para eliminar de DynamoDB
- API Gateway endpoint DELETE /delete
- Permisos IAM para DeleteItem en epi-user-analysis

### Modificado
- Nombres de PDFs ahora incluyen inspector y timestamp único
- Formato: `Informe-EPP-{Inspector}-{YYYY-MM-DD-HHmm}.pdf`
- Botón PDF solo visible para análisis de tipo EPP
- Modal de confirmación personalizado reemplaza window.confirm

### Corregido
- Confusión al descargar múltiples PDFs con mismo nombre
- Botón PDF aparecía en análisis sin resumen IA
- Error 500 al eliminar análisis (nombre de tabla incorrecto)
- Modal de confirmación nativo del navegador sin estilo de la app

---

## [2.3.2] - 2024-10-30

### Agregado
- Opción "Editar Perfil" en menú de usuario
- Modal reutilizable para crear/editar perfil con datos precargados
- Título dinámico en modal según contexto (Completar/Editar)
- Botón cancelar en modo edición

### Modificado
- UserMenu.tsx: Nueva opción de edición de perfil
- UserProfileModal.tsx: Soporte para datos iniciales
- App.tsx: Integración con menú de usuario

---

## [2.3.1] - 2024-10-30

### Corregido
- Error CORS en API Gateway al guardar perfil de usuario
- Migración de HTTP API a REST API Gateway para soporte CORS completo
- Permisos IAM faltantes para tabla UserProfiles (GetItem, PutItem)
- Import duplicado de axios eliminado

### Técnico
- API Gateway ID: 22ieg9wnd8
- Política IAM: UserProfilesAccess agregada a lambda-dynamodb-role

---

## [2.3.0] - 2024-10-29

### Agregado
- Resúmenes inteligentes con Amazon Bedrock (Claude 3 Haiku)
- Exportación de informes a PDF profesional con jsPDF
- Sistema completo de perfil de usuario
- Tabla DynamoDB UserProfiles
- Lambda function user-profile para CRUD de perfiles
- Nombre del inspector en PDFs generados
- Guardado automático de resúmenes IA en DynamoDB
- Vista estática de análisis históricos
- Acceso completo a informes desde historial

### Modificado
- Migración de Amazon Titan a Claude 3 Haiku para mejor calidad
- Resúmenes IA con porcentajes reales y recomendaciones específicas
- Referencias a normas OSHA/ISO 45001 en informes

### Técnico
- Costo: $0.70 por 1000 análisis (vs $0.40 con Titan)
- Archivo: src/utils/pdfGenerator.ts
- Componente: UserProfileModal.tsx

---

## [2.2.0] - 2024-10-28

### Agregado
- Autenticación con AWS Cognito
- Contador real de análisis desde S3 vía API Gateway + Lambda
- Historial personal de análisis con DynamoDB
- Menú de usuario con cambio de contraseña
- Guardado automático de análisis en DynamoDB
- Tabla AnalysisHistory

### Modificado
- Sistema de autenticación completo
- Persistencia de datos en la nube

---

## [2.1.1] - 2024-10-27

### Corregido
- Flujo del asistente guiado optimizado
- Eliminada duplicación de resultados
- Barra de progreso corregida (no retrocede)
- Modal de bienvenida responsive para móviles

### Mejorado
- Emergente verde permanece hasta acción del usuario
- Botones "Nuevo Análisis" e "Inicio" reinician correctamente
- Función resetToStart centralizada

---

## [2.1.0] - 2024-10-26

### Agregado
- Procesamiento de video con detección frame-by-frame
- Detección en tiempo real con webcam
- Captura de fotos desde cámara
- Selector de cámara frontal/trasera
- Modal de bienvenida interactivo
- Asistente guiado (wizard) para análisis
- Componentes: VideoProcessor, GuidedAnalysisWizard, RealtimeDetection

### Mejorado
- Controles de cámara optimizados para móviles
- Detección de personas únicas en video
- Modal para ver capturas en tamaño completo

---

## [2.0.0] - 2024-10-25

### Agregado
- Rediseño completo de UI con branding CoironTech
- Logo CoironTech en header, footer y modales
- Paleta de colores corporativa
- Footer con información de contacto

### Modificado
- Header completamente rediseñado
- Optimización responsive para móviles
- Nueva identidad visual

### BREAKING CHANGES
- Cambio completo de diseño visual
- Nueva estructura de componentes de UI

---

## [1.1.0] - 2024-10-20

### Agregado
- Detección de rostros con AWS Rekognition
- Detección de texto en imágenes
- Detección de objetos (labels)
- Selector de tipo de análisis
- Soporte para múltiples tipos de detección

---

## [1.0.0] - 2024-10-15

### Agregado
- Detección básica de EPP con AWS Rekognition
- Subida de imágenes a S3
- Visualización de bounding boxes
- Análisis de confianza
- Exportación CSV básica
- Configuración de elementos EPP requeridos
- Modo estricto de cumplimiento

### Técnico
- Integración con AWS Rekognition
- Lambda para procesamiento de imágenes
- API Gateway para endpoints
- Bucket S3 para almacenamiento

---

## Tipos de cambios

- `Agregado` para funcionalidades nuevas
- `Modificado` para cambios en funcionalidades existentes
- `Obsoleto` para funcionalidades que serán eliminadas
- `Eliminado` para funcionalidades eliminadas
- `Corregido` para corrección de bugs
- `Seguridad` para vulnerabilidades corregidas

---

## Enlaces

- [Repositorio](https://github.com/guillescontreras/epi-dashboard)
- [Documentación](./README.md)
- [Análisis de Versionado](./LOGS/Analisis-Versionado.md)
