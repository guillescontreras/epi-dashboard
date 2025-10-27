# Configuración de Amplify con DynamoDB y Cognito

## Paso 1: Instalar Amplify CLI

```bash
npm install -g @aws-amplify/cli
amplify configure
```

## Paso 2: Inicializar Amplify en el proyecto

```bash
cd /Users/guillermo/Desktop/CoironTech/Coirontech-AWS/Rekognition/epi-dashboard
amplify init
```

Responder:
- Project name: epi-dashboard
- Environment: prod
- Default editor: Visual Studio Code
- App type: javascript
- Framework: react
- Source directory: src
- Distribution directory: build
- Build command: npm run build
- Start command: npm start

## Paso 3: Agregar Autenticación (Cognito)

```bash
amplify add auth
```

Responder:
- Do you want to use the default authentication? **Manual configuration**
- Select authentication/authorization services: **User Sign-Up, Sign-In, connected with AWS IAM**
- Provide a friendly name: **epiDashboardAuth**
- Provide a name for the user pool: **epiDashboardUserPool**
- How do you want users to sign in? **Email**
- Do you want to add User Pool Groups? **Yes**
  - Group name: **Admins**
  - Precedence: **1**
- Do you want to add another User Pool Group? **No**
- Do you want to add an admin queries API? **Yes**

## Paso 4: Agregar Base de Datos (DynamoDB)

```bash
amplify add storage
```

Responder:
- Select from one of the below mentioned services: **NoSQL Database**
- Provide a friendly name: **epiAnalysisDB**
- Provide table name: **AnalysisRecords**
- Add columns:
  1. id (String) - Partition key
  2. timestamp (String) - Sort key
  3. userId (String)
  4. detectionType (String)
  5. confidence (Number)
  6. compliant (Number)
  7. totalPersons (Number)
- Add a sort key? **Yes** → timestamp
- Add global secondary indexes? **Yes**
  - Index name: **userId-timestamp-index**
  - Partition key: userId
  - Sort key: timestamp
- Do you want to add a Lambda Trigger? **No**

## Paso 5: Agregar API para acceso a DynamoDB

```bash
amplify add api
```

Responder:
- Select from one of the below mentioned services: **REST**
- Provide a friendly name: **epiAnalysisAPI**
- Provide a path: **/analysis**
- Choose a Lambda source: **Create a new Lambda function**
- Function name: **epiAnalysisFunction**
- Choose runtime: **NodeJS**
- Choose template: **CRUD function for DynamoDB**
- Use the DynamoDB table configured? **Yes**
- Select the table: **AnalysisRecords**
- Do you want to restrict API access? **Yes**
- Who should have access? **Authenticated and Guest users**
- Authenticated users can: **create, read, update, delete**
- Guest users can: **read**

## Paso 6: Desplegar todo

```bash
amplify push
```

Esto creará:
- User Pool de Cognito
- Tabla DynamoDB
- Lambda functions
- API Gateway
- Roles y permisos IAM

## Paso 7: Instalar dependencias en el proyecto

```bash
npm install aws-amplify @aws-amplify/ui-react
```

## Paso 8: Configurar Amplify en la app

Crear archivo `src/aws-exports.js` (se genera automáticamente con amplify push)

Modificar `src/index.tsx`:

```typescript
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);
```

## Paso 9: Crear componente de Admin

Crear `src/components/AdminPanel.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { API } from 'aws-amplify';

interface AnalysisStats {
  totalAnalysis: number;
  todayAnalysis: number;
  avgCompliance: number;
  topDetectionType: string;
}

const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await API.get('epiAnalysisAPI', '/analysis/stats', {});
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando métricas...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white p-6 rounded-xl">
          <h3 className="text-sm opacity-90">Total Análisis</h3>
          <p className="text-3xl font-bold">{stats?.totalAnalysis || 0}</p>
        </div>
        
        <div className="bg-green-500 text-white p-6 rounded-xl">
          <h3 className="text-sm opacity-90">Hoy</h3>
          <p className="text-3xl font-bold">{stats?.todayAnalysis || 0}</p>
        </div>
        
        <div className="bg-purple-500 text-white p-6 rounded-xl">
          <h3 className="text-sm opacity-90">Cumplimiento Promedio</h3>
          <p className="text-3xl font-bold">{stats?.avgCompliance || 0}%</p>
        </div>
        
        <div className="bg-orange-500 text-white p-6 rounded-xl">
          <h3 className="text-sm opacity-90">Tipo Más Usado</h3>
          <p className="text-xl font-bold">{stats?.topDetectionType || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
```

## Paso 10: Crear Lambda para guardar análisis

Crear `amplify/backend/function/saveAnalysis/src/index.js`:

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const tableName = process.env.STORAGE_ANALYSISRECORDS_NAME;
  
  try {
    const body = JSON.parse(event.body);
    
    const item = {
      id: body.id || Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: body.userId || 'anonymous',
      detectionType: body.detectionType,
      confidence: body.confidence,
      compliant: body.compliant,
      totalPersons: body.totalPersons,
      results: JSON.stringify(body.results)
    };
    
    await dynamodb.put({
      TableName: tableName,
      Item: item
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ success: true, id: item.id })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

## Paso 11: Integrar guardado en App.tsx

```typescript
import { API } from 'aws-amplify';

// Después de setResults(analysisResult):
const saveAnalysis = async (result: any) => {
  try {
    await API.post('epiAnalysisAPI', '/analysis', {
      body: {
        detectionType: result.DetectionType,
        confidence: minConfidence,
        compliant: result.Summary?.compliant || 0,
        totalPersons: result.Summary?.totalPersons || 0,
        results: result
      }
    });
  } catch (error) {
    console.error('Error saving analysis:', error);
  }
};

// Llamar después de setResults
saveAnalysis(analysisResult);
```

## Paso 12: Proteger ruta de admin

```typescript
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Envolver AdminPanel
export default withAuthenticator(AdminPanel, {
  loginMechanisms: ['email']
});
```

## Comandos útiles

```bash
# Ver estado de Amplify
amplify status

# Actualizar backend
amplify push

# Ver logs de Lambda
amplify function logs epiAnalysisFunction

# Eliminar recursos
amplify delete

# Agregar usuario admin manualmente
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <USER_POOL_ID> \
  --username <EMAIL> \
  --group-name Admins
```

## Costos estimados

- Cognito: Gratis hasta 50,000 MAU
- DynamoDB: $0.25 por GB/mes + $1.25 por millón de escrituras
- Lambda: $0.20 por millón de invocaciones
- API Gateway: $3.50 por millón de llamadas

**Total estimado para 10,000 análisis/mes: ~$5-10/mes**
