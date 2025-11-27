# Backend - EPI Dashboard

Este directorio contiene todas las funciones Lambda y configuraciones del backend del sistema EPI-CoironTech.

## Estructura

```
backend/
├── lambdas/
│   ├── admin/              # Lambdas de administración
│   │   ├── epi-admin-stats-lambda-v2-updated.py
│   │   ├── epi-admin-users-lambda-v2.py
│   │   ├── epi-admin-user-history-lambda.py
│   │   └── epi-admin-actions-lambda-updated.py
│   ├── analysis/           # Lambdas de análisis de imágenes
│   │   ├── rekognition-processor (Node.js)
│   │   ├── save-analysis.py
│   │   └── delete-analysis.py
│   ├── user/               # Lambdas de gestión de usuarios
│   │   └── user-profile.py
│   ├── ai/                 # Lambdas de IA generativa
│   │   └── bedrock-summary.py
│   ├── notifications/      # Lambdas de alertas y notificaciones
│   │   ├── epi-get-supervisors-lambda.py
│   │   ├── epi-push-subscription-lambda.js
│   │   ├── index.js (epi-send-push)
│   │   └── epi-sms-alerts-lambda-fixed.js
│   └── utils/              # Lambdas de utilidades
│       └── upload-presigned (Node.js)
└── api-gateway/            # Configuraciones de API Gateway
```

## Lambdas por Categoría

### Admin (Python 3.9)
- **epi-admin-stats**: Estadísticas globales del sistema (incluye realtime_epp)
- **epi-admin-users**: Listado y gestión de usuarios
- **epi-admin-user-history**: Historial de análisis por usuario
- **epi-admin-actions**: Acciones administrativas (reset password, cambio de roles)

### Analysis
- **rekognition-processor** (Node.js 20.x): Procesamiento de imágenes con Amazon Rekognition
- **save-analysis** (Python 3.9): Guardado de análisis en DynamoDB
- **delete-analysis** (Python 3.9): Eliminación de análisis del historial

### User (Python 3.9)
- **user-profile**: Gestión de perfiles de usuario (GET/POST)

### AI (Python 3.9)
- **bedrock-summary**: Generación de resúmenes con Claude 3 Haiku

### Notifications
- **epi-get-supervisors** (Python 3.9): Obtención de supervisores para alertas
- **epi-push-subscription** (Node.js 20.x): Gestión de suscripciones push
- **epi-send-push** (Node.js 20.x): Envío de push notifications con web-push
- **epi-sms-alerts** (Node.js 20.x): Envío de alertas por SMS/Email

### Utils (Node.js 20.x)
- **upload-presigned**: Generación de URLs presignadas para S3

## API Endpoints

### Admin API (zwjh3jgrsi)
- `GET /stats` → epi-admin-stats
- `GET /users` → epi-admin-users
- `GET /user-history` → epi-admin-user-history
- `POST /actions` → epi-admin-actions
- `POST /send-alert` → epi-send-push

### Analysis API (tf52bbq6o6)
- `POST /analyze` → rekognition-processor

### User API (n0f5jga1wc)
- `GET/POST /user-profile` → user-profile
- `DELETE /delete` → delete-analysis
- `POST /bedrock-summary` → bedrock-summary

### Upload API (kmekzxexq5)
- `GET /upload` → upload-presigned

### Save API (fzxam9mfn1)
- `POST /` → save-analysis

### Push API (rnhvvqxqe7)
- `POST /subscribe` → epi-push-subscription
- `POST /unsubscribe` → epi-push-subscription

## Despliegue

Para actualizar una Lambda:

```bash
cd backend/lambdas/<categoria>
zip -r function.zip .
aws lambda update-function-code \
  --function-name <nombre-lambda> \
  --zip-file fileb://function.zip \
  --region us-east-1
```

## Notas

- Todas las Lambdas descargadas desde AWS el 27/11/2024
- Versión actualizada de epi-admin-stats incluye soporte para realtime_epp
- Las Lambdas Node.js incluyen node_modules completos
- Las Lambdas Python requieren layers para dependencias externas

## Recursos AWS

- **DynamoDB Tables**: epi-user-analysis, UserProfiles, epi-push-subscriptions
- **S3 Bucket**: rekognition-gcontreras
- **Cognito User Pool**: us-east-1_zrdfN7OKN
- **Rekognition**: DetectProtectiveEquipment API
- **Bedrock**: Claude 3 Haiku model
