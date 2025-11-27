import json
import boto3
from collections import defaultdict
from datetime import datetime

cognito = boto3.client('cognito-idp', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('epi-user-analysis')

USER_POOL_ID = 'us-east-1_zrdfN7OKN'

def lambda_handler(event, context):
    try:
        # Listar usuarios de Cognito
        cognito_users = []
        pagination_token = None
        
        while True:
            if pagination_token:
                response = cognito.list_users(
                    UserPoolId=USER_POOL_ID,
                    Limit=60,
                    PaginationToken=pagination_token
                )
            else:
                response = cognito.list_users(
                    UserPoolId=USER_POOL_ID,
                    Limit=60
                )
            
            cognito_users.extend(response.get('Users', []))
            
            pagination_token = response.get('PaginationToken')
            if not pagination_token:
                break
        
        # Obtener estadísticas de análisis por usuario
        analysis_response = table.scan()
        items = analysis_response.get('Items', [])
        
        while 'LastEvaluatedKey' in analysis_response:
            analysis_response = table.scan(ExclusiveStartKey=analysis_response['LastEvaluatedKey'])
            items.extend(analysis_response.get('Items', []))
        
        # Contar análisis por usuario
        user_stats = defaultdict(lambda: {'count': 0, 'lastAnalysis': None})
        
        for item in items:
            user_id = item.get('userId')
            timestamp = item.get('timestamp', 0)
            
            user_stats[user_id]['count'] += 1
            
            if user_stats[user_id]['lastAnalysis'] is None or timestamp > user_stats[user_id]['lastAnalysis']:
                user_stats[user_id]['lastAnalysis'] = timestamp
        
        # Formatear usuarios
        users = []
        for user in cognito_users:
            username = user.get('Username')
            attributes = {attr['Name']: attr['Value'] for attr in user.get('Attributes', [])}
            
            stats = user_stats.get(username, {'count': 0, 'lastAnalysis': None})
            
            # Formatear última fecha de análisis
            last_analysis_str = ''
            if stats['lastAnalysis']:
                try:
                    dt = datetime.fromtimestamp(stats['lastAnalysis'] / 1000)
                    last_analysis_str = dt.strftime('%d/%m/%Y')
                except:
                    last_analysis_str = '-'
            
            users.append({
                'username': username,
                'email': attributes.get('email', ''),
                'name': f"{attributes.get('given_name', '')} {attributes.get('family_name', '')}".strip() or '-',
                'role': attributes.get('custom:role', 'user'),
                'createdAt': user.get('UserCreateDate').isoformat() if user.get('UserCreateDate') else '',
                'analysisCount': stats['count'],
                'lastAnalysis': last_analysis_str
            })
        
        # Ordenar por análisis (más activos primero)
        users.sort(key=lambda x: x['analysisCount'], reverse=True)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({'users': users})
        }
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
