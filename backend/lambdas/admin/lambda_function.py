import json
import boto3
from collections import defaultdict

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('epi-user-analysis')

def lambda_handler(event, context):
    try:
        # Por ahora sin verificación de rol (MVP)
        # TODO: Agregar Cognito Authorizer en API Gateway
        
        # Escanear toda la tabla
        response = table.scan()
        items = response.get('Items', [])
        
        # Continuar escaneando si hay más items
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        # Calcular estadísticas
        unique_users = set()
        total_analyses = 0
        by_type = defaultdict(int)
        
        for item in items:
            unique_users.add(item.get('userId'))
            
            # Extraer analysisData si existe
            analysis = item.get('analysisData', item)
            # Buscar DetectionType en nivel raíz o dentro de analysisData
            detection_type = item.get('DetectionType') or analysis.get('DetectionType', 'unknown')
            
            total_analyses += 1
            by_type[detection_type] += 1
        
        # Contar usuarios de Cognito (fuente de verdad)
        cognito = boto3.client('cognito-idp', region_name='us-east-1')
        cognito_response = cognito.list_users(
            UserPoolId='us-east-1_zrdfN7OKN',
            Limit=60
        )
        total_cognito_users = len(cognito_response.get('Users', []))
        
        # Continuar paginación si hay más
        while 'PaginationToken' in cognito_response:
            cognito_response = cognito.list_users(
                UserPoolId='us-east-1_zrdfN7OKN',
                Limit=60,
                PaginationToken=cognito_response['PaginationToken']
            )
            total_cognito_users += len(cognito_response.get('Users', []))
        
        # Usuarios activos (con al menos 1 análisis)
        active_users = len(unique_users)
        
        # Análisis por día (últimos 30 días)
        from datetime import datetime, timedelta
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        daily_analyses = {}
        for i in range(30):
            date = (thirty_days_ago + timedelta(days=i)).strftime('%Y-%m-%d')
            daily_analyses[date] = 0
        
        for item in items:
            timestamp = item.get('timestamp', 0)
            if timestamp:
                dt = datetime.fromtimestamp(timestamp / 1000)
                if dt >= thirty_days_ago:
                    date_key = dt.strftime('%Y-%m-%d')
                    if date_key in daily_analyses:
                        daily_analyses[date_key] += 1
        
        # Convertir a lista ordenada
        daily_chart = [{'date': k, 'count': v} for k, v in sorted(daily_analyses.items())]
        
        # Calcular totales estáticos y tiempo real
        static_total = by_type.get('ppe_detection', 0) + by_type.get('face_detection', 0) + by_type.get('label_detection', 0) + by_type.get('text_detection', 0)
        realtime_total = by_type.get('realtime_epp', 0)
        
        stats = {
            'totalUsers': total_cognito_users,
            'activeUsers': active_users,
            'totalAnalyses': total_analyses,
            'staticAnalyses': static_total,
            'realtimeAnalyses': realtime_total,
            'byType': {
                'ppe_static': by_type.get('ppe_detection', 0),
                'ppe_realtime': by_type.get('realtime_epp', 0),
                'face': by_type.get('face_detection', 0),
                'label': by_type.get('label_detection', 0),
                'text': by_type.get('text_detection', 0)
            },
            'dailyAnalyses': daily_chart
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(stats)
        }
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
