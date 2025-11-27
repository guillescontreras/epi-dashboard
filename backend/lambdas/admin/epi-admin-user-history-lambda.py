import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('epi-user-analysis')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters', {})
        user_id = params.get('userId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing userId parameter'})
            }
        
        # Paginación
        limit = int(params.get('limit', 10))
        last_key = params.get('lastKey')
        
        query_params = {
            'KeyConditionExpression': Key('userId').eq(user_id),
            'ScanIndexForward': False,
            'Limit': limit
        }
        
        if last_key:
            query_params['ExclusiveStartKey'] = json.loads(last_key)
        
        # Query historial del usuario
        response = table.query(**query_params)
        
        items = response.get('Items', [])
        
        # Extraer analysisData
        history = []
        for item in items:
            if 'analysisData' in item:
                history.append(item['analysisData'])
            else:
                history.append(item)
        
        result = {'history': history, 'count': len(history)}
        
        # Incluir lastKey si hay más resultados
        if 'LastEvaluatedKey' in response:
            result['lastKey'] = json.dumps(response['LastEvaluatedKey'], default=decimal_default)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(result, default=decimal_default)
        }
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
