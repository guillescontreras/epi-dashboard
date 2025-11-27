import json
import boto3
import re
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('epi-user-analysis')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def validate_user_id(user_id):
    """Valida formato de userId (UUID de Cognito)"""
    if not user_id or not isinstance(user_id, str):
        return False
    pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    return bool(re.match(pattern, user_id, re.IGNORECASE))

def validate_timestamp(timestamp_str):
    """Valida que timestamp sea un número válido"""
    try:
        ts = int(timestamp_str)
        # Validar rango razonable (entre 2020 y 2050)
        if ts < 1577836800000 or ts > 2524608000000:
            return False
        return True
    except (ValueError, TypeError):
        return False

def lambda_handler(event, context):
    # Log de intento (sin datos sensibles)
    print(f"DELETE request from IP: {event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')}")
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
    }
    
    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # Obtener parámetros
        if event.get('httpMethod') == 'DELETE':
            query_params = event.get('queryStringParameters', {})
            user_id = query_params.get('userId')
            timestamp_str = query_params.get('timestamp')
            
            # Validaciones de seguridad
            if not user_id or not timestamp_str:
                print("Missing required parameters")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'userId y timestamp son requeridos'})
                }
            
            if not validate_user_id(user_id):
                print(f"Invalid userId format: {user_id}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid userId format'})
                }
            
            if not validate_timestamp(timestamp_str):
                print(f"Invalid timestamp: {timestamp_str}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid timestamp'})
                }
            
            # Convertir timestamp a número
            timestamp = int(timestamp_str)
            
            print(f"Deleting analysis for user: {user_id[:8]}... timestamp: {timestamp}")
            
            # Eliminar de DynamoDB
            response = table.delete_item(
                Key={
                    'userId': user_id,
                    'timestamp': timestamp
                }
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Análisis eliminado exitosamente',
                    'userId': user_id,
                    'timestamp': timestamp
                }, default=decimal_default)
            }
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Método no permitido'})
            }
            
    except ValueError as e:
        print(f'Value error: {str(e)}')
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid parameter format'})
        }
    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
