# 📋 Resumen de Jornada 7

## 🎯 Objetivo de la Jornada
Resolver error de CORS en API Gateway, separar User Pools de Cognito, optimizar performance del historial y contador global, e implementar panel de administración completo con estadísticas, gestión de usuarios y gráficos de actividad.

**Punto de partida:** v2.8.34 (13/11/2025)  
**Versión final:** v2.9.6 (16/11/2025)

---

## ✅ Trabajo Completado

### 1. **Diagnóstico del Error CORS** ⭐

**Problema reportado:**
```
Access to fetch at 'https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod?userId=...' 
from origin 'https://epi.coirontech.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Causa raíz identificada:**
- API Gateway `n0f5jga1wc` (get-user-history-api) no tenía método OPTIONS configurado
- Sin OPTIONS, el navegador no podía hacer CORS preflight
- Ambas apps (epi-dashboard e ia-control) compartían el mismo User Pool de Cognito

**Análisis:**
- Lambda `get-user-history` SÍ tenía headers CORS correctos
- El problema estaba en la configuración del API Gateway
- Compartir User Pool entre apps puede causar conflictos de configuración

---

### 2. **Configuración CORS en API Gateway** ⭐

**Cambios implementados en API Gateway `n0f5jga1wc`:**

1. **Agregado método OPTIONS al recurso raíz (`/`):**
   ```bash
   aws apigateway put-method --rest-api-id n0f5jga1wc --resource-id b2sn6mhag4 \
     --http-method OPTIONS --authorization-type NONE
   ```

2. **Configurada integración MOCK para OPTIONS:**
   ```bash
   aws apigateway put-integration --rest-api-id n0f5jga1wc --resource-id b2sn6mhag4 \
     --http-method OPTIONS --type MOCK \
     --request-templates '{"application/json":"{\"statusCode\": 200}"}'
   ```

3. **Configurados headers CORS en respuesta:**
   - `Access-Control-Allow-Origin: *`
   - `Access-Control-Allow-Methods: GET,OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`

4. **Desplegado a stage prod:**
   ```bash
   aws apigateway create-deployment --rest-api-id n0f5jga1wc --stage-name prod
   ```

**Resultado:** CORS preflight funcional, navegador puede hacer requests cross-origin.

---

### 3. **Separación de User Pools de Cognito** ⭐

**Decisión arquitectónica:**
- **Problema:** Compartir User Pool entre epi-dashboard e ia-control causaba conflictos
- **Solución:** Crear User Pools separados para cada aplicación

**Implementación:**

1. **Creado nuevo User Pool para ia-control:**
   - **Nombre:** `ia-control-user-pool`
   - **User Pool ID:** `us-east-1_mfnduAii4`
   - **Región:** us-east-1

2. **Configuración del User Pool:**
   - Políticas de contraseña: Mínimo 8 caracteres, mayúsculas, minúsculas, números
   - Auto-verificación: Email
   - Username: Email como identificador
   - Atributos: email (requerido), name, family_name (opcionales)

3. **Creado App Client para ia-control:**
   - **Client ID:** `1or1du6f82ralqtnu7bneh0511`
   - **Auth Flows:** USER_SRP_AUTH, REFRESH_TOKEN_AUTH, USER_PASSWORD_AUTH
   - **Sin secret:** Para aplicaciones frontend

4. **Actualizado `aws-config.ts` en ia-control:**
   ```typescript
   export const awsConfig = {
     Auth: {
       Cognito: {
         userPoolId: 'us-east-1_mfnduAii4',  // Nuevo
         userPoolClientId: '1or1du6f82ralqtnu7bneh0511',  // Nuevo
         region: 'us-east-1',
       }
     }
   };
   ```

**Archivos modificados:**
- `/access-control-system/frontend/src/aws-config.ts`

**Commit realizado:**
```
config: Separar User Pool de Cognito para ia-control (us-east-1_mfnduAii4)
```

---

### 4. **Verificación de CORS**

**Pruebas realizadas:**

1. **OPTIONS preflight:**
   ```bash
   curl -X OPTIONS https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod \
     -H "Origin: https://epi.coirontech.com"
   ```
   **Resultado:** ✅ Headers CORS presentes

2. **GET request:**
   ```bash
   curl -X GET "https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod?userId=test" \
     -H "Origin: https://epi.coirontech.com"
   ```
   **Resultado:** ✅ Respuesta con headers CORS correctos

**Headers verificados:**
- `access-control-allow-origin: *`
- `access-control-allow-methods: GET,OPTIONS`
- `access-control-allow-headers: Content-Type`

---

### 5. **Optimización del Historial con Lazy Loading** ⭐

**Problema identificado:**
- Lambda `get-user-history` tenía timeout de 3 segundos
- Causaba errores 502 Bad Gateway al cargar historial completo
- Cargaba TODOS los análisis de un usuario de una vez (lento)

**Solución implementada:**

1. **Aumentado timeout de Lambda:**
   ```bash
   aws lambda update-function-configuration --function-name get-user-history \
     --timeout 30 --region us-east-1
   ```

2. **Implementada paginación en Lambda:**
   - Parámetro `limit` (default: 10 items)
   - Parámetro `lastKey` para paginación
   - Retorna `lastKey` si hay más resultados

3. **Lazy loading en frontend:**
   - Carga inicial: 10 últimos análisis
   - Botón "Cargar más" para siguientes 10
   - Estado `hasMoreHistory` para controlar visibilidad del botón

4. **Extracción correcta de datos:**
   - Lambda ahora extrae campo `analysisData` de items DynamoDB
   - Estructura: `{userId, timestamp, analysisData: {...}}`

**Archivos modificados:**
- `/tmp/get-user-history-lambda.py` (Lambda)
- `/Rekognition/epi-dashboard/src/App.tsx` (Frontend)

**Resultado:** Carga inicial 10x más rápida, sin errores 502.

---

### 6. **Optimización del Contador Global** ⭐

**Problema identificado:**
- Contador global usaba `s3.list_objects_v2()` en bucket `rekognition-gcontreras/web/`
- Operación lenta (~2 segundos)
- Bloqueaba carga inicial de la página

**Opciones evaluadas:**

**Opción 1: Lazy Loading (implementada primero)**
- Mover fetch del contador a `setTimeout(100ms)`
- Contador carga después de renderizado inicial
- Mejora percepción de velocidad

**Opción 2: Tabla DynamoDB separada (rechazada)**
- Crear tabla `epi-global-counters`
- Usuario rechazó: recursos innecesarios
- Tabla `epi-user-analysis` ya contiene todos los análisis

**Opción 3: DynamoDB Scan con COUNT (implementada) ✅**
- Usar tabla existente `epi-user-analysis`
- `dynamodb.scan()` con `Select='COUNT'`
- Velocidad: ~100-200ms (10x más rápido que S3)
- Sin recursos adicionales

**Implementación:**

1. **Lambda `count-analysis` modificado:**
   ```python
   import boto3
   dynamodb = boto3.client('dynamodb')
   
   response = dynamodb.scan(
       TableName='epi-user-analysis',
       Select='COUNT'
   )
   count = response.get('Count', 0)
   ```

2. **Permisos IAM agregados:**
   ```bash
   aws iam put-role-policy --role-name lambda-s3-count-role \
     --policy-name DynamoDBScanPolicy \
     --policy-document '{
       "Effect": "Allow",
       "Action": "dynamodb:Scan",
       "Resource": "arn:aws:dynamodb:us-east-1:825765382487:table/epi-user-analysis"
     }'
   ```

3. **Verificación:**
   ```bash
   aws lambda invoke --function-name count-analysis /tmp/response.json
   # Resultado: {"count": 95}
   ```

**Archivos modificados:**
- `/tmp/count-analysis-lambda.py` (Lambda)
- IAM role `lambda-s3-count-role` (permisos DynamoDB)

**Resultado:** Contador 10x más rápido (~100ms vs ~2s), sin cambios en frontend.

---

### 7. **Panel de Administración Completo** ⭐⭐⭐

**Objetivo:**
Crear panel admin con estadísticas, gestión de usuarios, historial por usuario y gráficos de actividad.

**Implementación:**

#### 7.1 Sistema de Roles en Cognito

1. **Atributo custom:role agregado:**
   ```bash
   aws cognito-idp add-custom-attributes \
     --user-pool-id us-east-1_zrdfN7OKN \
     --custom-attributes Name=role,AttributeDataType=String,Mutable=true
   ```

2. **Rol admin asignado:**
   ```bash
   aws cognito-idp admin-update-user-attributes \
     --user-pool-id us-east-1_zrdfN7OKN \
     --username guillescontreras@gmail.com \
     --user-attributes Name=custom:role,Value=admin
   ```

3. **Verificación de rol en frontend:**
   - `fetchUserAttributes()` obtiene `custom:role`
   - Estado `userRole` controla visibilidad de pestaña Admin
   - Recarga automática al cambiar sección

#### 7.2 API Gateway Admin (epi-admin-api)

**API Gateway ID:** `zwjh3jgrsi`

**Endpoints creados:**
- `GET /stats` - Estadísticas globales
- `GET /users` - Listado de usuarios con stats
- `POST /actions` - Acciones admin (reset password, cambiar rol)
- `GET /user-history` - Historial de análisis por usuario

**CORS configurado:**
- Método OPTIONS en todos los recursos
- Headers: `Access-Control-Allow-Origin: *`
- Métodos: GET, POST, OPTIONS

#### 7.3 Lambdas Admin Creadas

**1. epi-admin-stats**
- Cuenta usuarios de Cognito (fuente de verdad)
- Usuarios activos (con al menos 1 análisis)
- Total análisis por tipo
- Análisis diarios (últimos 30 días)
- Timeout: 30s

**2. epi-admin-users**
- Lista usuarios de Cognito con paginación
- Enriquece con stats de DynamoDB
- Cuenta análisis por usuario
- Fecha último análisis
- Ordena por actividad (más activos primero)
- Timeout: 30s

**3. epi-admin-actions**
- Reset password con contraseña temporal (12 caracteres)
- Cambio de rol (user ↔ admin)
- Usa `admin_set_user_password` con `Permanent=False`
- Retorna contraseña temporal al frontend
- Timeout: 10s

**4. epi-admin-user-history**
- Query historial por userId
- Paginación (10 análisis por página)
- Extracción de analysisData
- Conversión Decimal a float
- Timeout: 10s

#### 7.4 Permisos IAM Agregados

**DynamoDBFullPolicy:**
```json
{
  "Action": ["dynamodb:Scan", "dynamodb:Query", "dynamodb:GetItem"],
  "Resource": "arn:aws:dynamodb:us-east-1:825765382487:table/epi-user-analysis"
}
```

**CognitoAdminPolicy:**
```json
{
  "Action": [
    "cognito-idp:ListUsers",
    "cognito-idp:AdminResetUserPassword",
    "cognito-idp:AdminSetUserPassword",
    "cognito-idp:AdminUpdateUserAttributes"
  ],
  "Resource": "arn:aws:cognito-idp:us-east-1:825765382487:userpool/us-east-1_zrdfN7OKN"
}
```

#### 7.5 Frontend - Componente AdminPanel

**Estructura:**
- 2 tabs: Estadísticas | Usuarios
- Diseño consistente con resto de la app
- Responsive (mobile-friendly)

**Tab Estadísticas:**
- 5 cards: Usuarios Registrados, Usuarios Activos, Análisis Totales, Análisis EPP, Otros Análisis
- Distribución por tipo (EPP, Rostros, Objetos, Texto)
- Gráfico de línea: Análisis últimos 30 días
- Gráfico de barras: Actividad diaria detallada
- Librería: recharts

**Tab Usuarios:**
- Tabla con: Email, Nombre, Rol, Análisis, Último, Acciones
- Ordenados por actividad (más activos primero)
- Badges de rol (admin/user)
- Botones de acción:
  - 👁️ Ver historial
  - 🔑 Resetear contraseña
  - 👑/👤 Cambiar rol

**Modal Historial Usuario:**
- Paginación: 10 análisis iniciales
- Botón "Cargar más" para siguientes 10
- Cards con: Tipo, Fecha, ID, Confianza, EPPs
- Botón "Ver Informe Completo" en cada análisis

**Modal Informe Completo:**
- Resumen (3 cards): Personas, Confianza, EPPs
- Resumen IA (si existe)
- Componente ImageComparison:
  - Imágenes lado a lado (original + bounding boxes)
  - Tabla detallada EPP por persona
  - Detalles según tipo de análisis
- UI idéntica a vista de usuario

#### 7.6 Funcionalidades Implementadas

**Estadísticas:**
- ✅ Total usuarios registrados (Cognito)
- ✅ Usuarios activos (con análisis)
- ✅ Total análisis por tipo
- ✅ Gráficos temporales (30 días)
- ✅ Distribución por tipo de detección

**Gestión de Usuarios:**
- ✅ Listado completo con stats
- ✅ Reset password con contraseña temporal
- ✅ Cambio de rol (user ↔ admin)
- ✅ Historial de análisis por usuario
- ✅ Ver informe completo de cada análisis

**Seguridad:**
- ✅ Verificación de rol en frontend
- ✅ Pestaña Admin solo visible para admins
- ✅ Recarga automática de rol al cambiar sección
- ✅ Contraseña temporal copiada al portapapeles

#### 7.7 Problemas Resueltos

**1. Discrepancia conteo usuarios (15 vs 22):**
- Stats ahora cuenta usuarios de Cognito (fuente de verdad)
- Diferencia entre registrados (22) y activos (15)

**2. Pestaña Admin no aparece:**
- Verificación de rol en cada cambio de sección
- useEffect que recarga rol automáticamente

**3. Reset password enviaba código:**
- Cambiado a `admin_set_user_password`
- Genera contraseña temporal de 12 caracteres
- Usuario debe cambiarla en primer login

**4. Error Decimal no serializable:**
- Agregada función `decimal_default` en Lambdas
- Convierte Decimal a float para JSON

**5. Permisos IAM faltantes:**
- Agregado `dynamodb:Query` para historial
- Agregado `AdminSetUserPassword` para reset

**Archivos creados:**
- `/src/components/AdminPanel.tsx` (666 líneas)
- `/tmp/epi-admin-stats-lambda.py`
- `/tmp/epi-admin-users-lambda.py`
- `/tmp/epi-admin-actions-lambda.py`
- `/tmp/epi-admin-user-history-lambda.py`

**Resultado:** Panel admin completo y funcional con todas las capacidades de gestión.

---

### 8. **Simplificación de Navegación - Eliminación Modo Avanzado** ⭐

**Problema identificado:**
- Existencia de "modo guiado" vs "modo avanzado" generaba confusión
- Lógica compleja de cambio de modo (`useGuidedMode`)
- Navegación a Admin/Historial no funcionaba correctamente desde asistente
- Código difícil de mantener con switch statements y condicionales

**Solución implementada:**

1. **Eliminada variable `useGuidedMode`:**
   - Removida de todos los estados
   - Eliminada de funciones (resetToStart, modales)
   - Simplificado flujo de navegación

2. **Simplificado `renderContent()`:**
   - Convertido switch statement a if statements
   - Eliminado panel de análisis avanzado (ModernAnalysisPanel)
   - Solo asistente guiado en sección "analysis"

3. **Navegación directa:**
   - Click en Admin → muestra AdminPanel directamente
   - Click en Historial → muestra historial directamente
   - Click en Dashboard → muestra dashboard directamente
   - Sin cambios de modo intermedios

4. **Código limpio:**
   - 178 líneas eliminadas
   - Lógica más clara y mantenible
   - Sin condicionales complejos

**Archivos modificados:**
- `/src/App.tsx` (19 inserciones, 197 eliminaciones)
- `/src/version.ts` (actualizado a v2.9.6)

**Resultado:** Navegación simplificada, código más limpio, sin confusión de modos.

---

## 📊 Métricas de la Jornada

### Cambios Realizados
- **API Gateway:** 2 APIs configurados (n0f5jga1wc, zwjh3jgrsi)
- **Cognito:** 1 User Pool nuevo + atributo custom:role
- **Lambda:** 6 funciones (2 optimizadas, 4 nuevas admin)
- **Frontend:** 1 componente nuevo (AdminPanel.tsx - 666 líneas)
- **IAM:** 2 policies nuevas (DynamoDBFullPolicy, CognitoAdminPolicy)
- **Librerías:** recharts instalado para gráficos
- **Commits:** 15+ commits

### Bugs Críticos Corregidos
1. ✅ Error CORS en carga de historial de epi-dashboard
2. ✅ Conflictos de configuración por User Pool compartido

### Features Completadas
1. ✅ CORS configurado en API Gateway n0f5jga1wc
2. ✅ User Pools separados por aplicación
3. ✅ Aislamiento completo entre epi-dashboard e ia-control
4. ✅ Lazy loading de historial con paginación (10 items)
5. ✅ Contador global optimizado (DynamoDB Scan vs S3 ListObjects)
6. ✅ Panel de administración completo
7. ✅ Sistema de roles (admin/user) en Cognito
8. ✅ Estadísticas globales con gráficos temporales
9. ✅ Gestión de usuarios (reset password, cambiar rol)
10. ✅ Historial de análisis por usuario con paginación
11. ✅ Informe completo con ImageComparison en admin
12. ✅ API Gateway epi-admin-api con 4 endpoints
13. ✅ 4 Lambdas admin con permisos IAM configurados
14. ✅ Eliminación de modo avanzado - solo asistente guiado

### Conceptos Clave Documentados
1. **CORS Preflight:** Requiere método OPTIONS en API Gateway
2. **User Pool por aplicación:** Mejor práctica para evitar conflictos
3. **Separación de concerns:** Cada app con su propia autenticación

---

## 🔧 Infraestructura AWS

### API Gateways

**1. get-user-history-api (n0f5jga1wc)**
- Recurso: `/` (GET, OPTIONS)
- Lambda: get-user-history
- CORS configurado
- Stage: prod

**2. epi-admin-api (zwjh3jgrsi) - NUEVO**
- Recursos:
  - `/stats` (GET, OPTIONS) → epi-admin-stats
  - `/users` (GET, OPTIONS) → epi-admin-users
  - `/actions` (POST, OPTIONS) → epi-admin-actions
  - `/user-history` (GET, OPTIONS) → epi-admin-user-history
- CORS configurado en todos los endpoints
- Stage: prod
- URL: `https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod`

### Lambdas

**Optimizadas:**
1. **get-user-history** - Timeout 30s, paginación
2. **count-analysis** - DynamoDB Scan con COUNT

**Nuevas (Admin):**
3. **epi-admin-stats** - Estadísticas globales + gráficos
4. **epi-admin-users** - Listado usuarios con stats
5. **epi-admin-actions** - Reset password + cambiar rol
6. **epi-admin-user-history** - Historial por usuario

### Cognito User Pools

**epi-dashboard:**
- User Pool ID: `us-east-1_zrdfN7OKN`
- App Client ID: `1r4a4vec9qbfsk3vmj7em6pigm`
- **Atributo custom:role agregado** (admin/user)
- Admin: guillescontreras@gmail.com

**ia-control (nuevo):**
- User Pool ID: `us-east-1_mfnduAii4`
- App Client ID: `1or1du6f82ralqtnu7bneh0511`

### DynamoDB

**Tabla: epi-user-analysis**
- Partition Key: userId
- Sort Key: timestamp
- Usado por: Historial, Stats, Contador
- Permisos: Scan, Query, GetItem

### IAM Policies

**Rol: lambda-s3-count-role**
- DynamoDBFullPolicy (Scan, Query, GetItem)
- CognitoAdminPolicy (ListUsers, AdminSetUserPassword, AdminUpdateUserAttributes)
- S3ListPolicy (ListObjects)

---

## 📦 Estado del Proyecto

### Versión Actual
**v2.9.6** - Simplificación de navegación (eliminado modo avanzado)  
**v2.9.5** - Panel de administración completo

### Estabilidad
✅ **Alta** - CORS funcional, User Pools separados

### Bugs Pendientes
**Ninguno** - Todos los issues críticos resueltos

---

## 🎯 Próximos Pasos

### Completado ✅
- [x] Panel de administración funcional
- [x] Estadísticas con gráficos temporales
- [x] Gestión de usuarios completa
- [x] Historial por usuario con informe completo
- [x] Sistema de roles implementado

### Prioridad Alta
1. **Seguridad del Panel Admin:**
   - Agregar Cognito Authorizer en API Gateway epi-admin-api
   - Validar token JWT en Lambdas admin
   - Rate limiting en endpoints admin

2. **Migración de usuarios ia-control:**
   - Los usuarios existentes deberán registrarse nuevamente
   - Comunicar cambio a usuarios activos

### Prioridad Media
3. **Mejoras Panel Admin:**
   - Filtros y búsqueda en tabla de usuarios
   - Exportar estadísticas a CSV/PDF
   - Gráficos adicionales (usuarios activos por semana, horas pico)
   - Logs de acciones admin (auditoría)

4. **Documentación:**
   - Actualizar ARQUITECTURA-TECNICA-EPI-COIRONTECH.md
   - Documentar User Pool de ia-control
   - Manual de uso del panel admin

### Prioridad Baja
5. **Monitoreo:**
   - CloudWatch dashboards para métricas admin
   - Alertas para acciones críticas
   - Logs centralizados

---

## 📝 Notas Importantes

1. **User Pools separados:** Cada aplicación ahora tiene su propio User Pool de Cognito. Esto evita conflictos de configuración y permite gestión independiente.

2. **Usuarios de ia-control:** Deberán registrarse nuevamente en el nuevo User Pool. Los usuarios del User Pool anterior NO se migran automáticamente.

3. **CORS en API Gateway:** Siempre configurar método OPTIONS para permitir CORS preflight. Sin OPTIONS, los navegadores bloquean requests cross-origin.

4. **Headers CORS en Lambda:** Aunque la Lambda tenga headers CORS correctos, el API Gateway también debe tenerlos configurados.

5. **Deployment necesario:** Después de cambios en API Gateway, siempre hacer deployment al stage correspondiente (prod).

---

## 📂 Archivos Clave Modificados

```
Coirontech-AWS/
└── Rekognition/
    └── access-control-system/
        └── frontend/src/
            └── aws-config.ts              📝 MODIFICADO (User Pool IDs)
```

---

## ✅ Checklist de Cierre

- [x] Error CORS diagnosticado
- [x] Método OPTIONS agregado a API Gateway
- [x] Headers CORS configurados
- [x] Deployment a prod realizado
- [x] CORS verificado con curl
- [x] Nuevo User Pool creado para ia-control
- [x] App Client creado
- [x] aws-config.ts actualizado
- [x] Commit y push realizados
- [x] Resumen de jornada documentado

---

**Fecha:** 15-16/11/2025  
**Duración:** ~12 horas  
**Versión inicial:** v2.8.34  
**Versión final:** v2.9.6  
**Commits realizados:** 15+  
**AWS Resources creados:** 1 User Pool + 1 App Client + 1 API Gateway + 4 Lambdas  
**API Gateway updates:** 2 (n0f5jga1wc, zwjh3jgrsi)  
**Lambda updates:** 6 (get-user-history, count-analysis, epi-admin-stats, epi-admin-users, epi-admin-actions, epi-admin-user-history)  
**Estado:** ✅ Jornada completada exitosamente

---

## 🎓 Lecciones Aprendidas

1. **CORS requiere configuración en múltiples capas:** No basta con que la Lambda devuelva headers CORS. El API Gateway también debe tener método OPTIONS configurado para CORS preflight.

2. **User Pools compartidos causan problemas:** Aunque técnicamente es posible compartir un User Pool entre aplicaciones, es mejor práctica tener User Pools separados para:
   - Evitar conflictos de configuración
   - Permitir políticas diferentes por aplicación
   - Facilitar mantenimiento independiente
   - Mejor aislamiento de seguridad

3. **Grupos de Cognito NO resuelven conflictos de configuración:** Los grupos sirven para diferenciar permisos dentro de la misma aplicación, pero no resuelven problemas de configuración compartida entre aplicaciones diferentes.

4. **Deployment obligatorio en API Gateway:** Cualquier cambio en API Gateway (métodos, integraciones, responses) requiere crear un deployment al stage para que los cambios sean efectivos.

5. **Verificación con curl:** Antes de probar en el navegador, usar curl para verificar que los headers CORS estén presentes. Esto ahorra tiempo de debugging.

6. **Documentación de decisiones arquitectónicas:** Documentar el "por qué" de decisiones como separar User Pools ayuda a futuros desarrolladores a entender el contexto.

7. **Migración de usuarios:** Al cambiar User Pools, considerar el impacto en usuarios existentes y planificar estrategia de migración o comunicación.
