import json
import boto3
import re
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('UserProfiles')

# Validaciones de seguridad
def sanitize_string(value, max_length=100):
    """Sanitiza strings para prevenir inyecciones"""
    if not isinstance(value, str):
        return ''
    # Remover caracteres peligrosos
    value = re.sub(r'[<>"\';]', '', value)
    return value[:max_length].strip()

def validate_user_id(user_id):
    """Valida formato de userId (UUID de Cognito)"""
    if not user_id or not isinstance(user_id, str):
        return False
    # UUID format: 8-4-4-4-12 caracteres hexadecimales
    pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    return bool(re.match(pattern, user_id, re.IGNORECASE))

def validate_phone(phone):
    """Valida formato de teléfono"""
    if not phone:
        return True  # Opcional
    # Permitir números, espacios, guiones, paréntesis y +
    pattern = r'^[\d\s\-\(\)\+]{7,20}$'
    return bool(re.match(pattern, phone))

def validate_date(date_str):
    """Valida formato de fecha ISO"""
    if not date_str:
        return True  # Opcional
    try:
        datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return True
    except:
        return False

def lambda_handler(event, context):
    # Log de intento (sin datos sensibles)
    print(f"Request: {event.get('httpMethod')} from IP: {event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')}")
    try:
        # Configurar CORS
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        }
        
        # Manejar preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'OK'})
            }
        
        # GET - Obtener perfil
        if event.get('httpMethod') == 'GET':
            user_id = event.get('queryStringParameters', {}).get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'userId is required'})
                }
            
            response = table.get_item(Key={'userId': user_id})
            
            if 'Item' in response:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'profile': response['Item']})
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'profile': None})
                }
        
        # POST - Guardar/actualizar perfil
        elif event.get('httpMethod') == 'POST':
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            
            user_id = body.get('userId')
            profile_data = body.get('profileData', {})
            
            # Validaciones de seguridad
            if not user_id or not validate_user_id(user_id):
                print(f"Invalid userId format: {user_id}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid userId format'})
                }
            
            # Validar campos requeridos
            first_name = sanitize_string(profile_data.get('firstName', ''), 50)
            last_name = sanitize_string(profile_data.get('lastName', ''), 50)
            
            if not first_name or not last_name:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'firstName and lastName are required'})
                }
            
            # Validar teléfono
            phone = sanitize_string(profile_data.get('phone', ''), 20)
            if phone and not validate_phone(phone):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid phone format'})
                }
            
            # Validar fecha
            birth_date = profile_data.get('birthDate', '')
            if birth_date and not validate_date(birth_date):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid date format'})
                }
            
            # Preparar item con datos sanitizados
            item = {
                'userId': user_id,
                'firstName': first_name,
                'lastName': last_name,
                'birthDate': birth_date,
                'country': sanitize_string(profile_data.get('country', ''), 100),
                'state': sanitize_string(profile_data.get('state', ''), 100),
                'department': sanitize_string(profile_data.get('department', ''), 100),
                'city': sanitize_string(profile_data.get('city', ''), 100),
                'postalCode': sanitize_string(profile_data.get('postalCode', ''), 20),
                'phone': phone,
                'updatedAt': datetime.now().isoformat()
            }
            
            print(f"Saving profile for user: {user_id[:8]}...")
            
            # Guardar en DynamoDB
            table.put_item(Item=item)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True, 'profile': item})
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON format'})
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
