import json
import boto3
import string
import secrets
from decimal import Decimal

# Inicializar clientes AWS
cognito = boto3.client('cognito-idp')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event, default=str)}")
    
    # Headers CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    # Manejar OPTIONS para CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Parsear el body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        username = body.get('username')
        
        if not action or not username:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'action y username son requeridos'})
            }
        
        user_pool_id = 'us-east-1_zrdfN7OKN'  # User Pool de epi-dashboard
        
        if action == 'reset-password':
            # Generar contraseña temporal de 12 caracteres
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
            
            # Establecer contraseña temporal
            cognito.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=username,
                Password=temp_password,
                Permanent=False  # Usuario debe cambiarla en el primer login
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Contraseña reseteada exitosamente',
                    'temporaryPassword': temp_password
                })
            }
            
        elif action == 'change-role':
            role = body.get('role', 'user')
            
            # Validar roles permitidos
            if role not in ['user', 'admin', 'supervisor']:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Rol no válido. Debe ser: user, admin o supervisor'})
                }
            
            # Actualizar atributo custom:role
            cognito.admin_update_user_attributes(
                UserPoolId=user_pool_id,
                Username=username,
                UserAttributes=[
                    {
                        'Name': 'custom:role',
                        'Value': role
                    }
                ]
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': f'Rol actualizado a {role} exitosamente'
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': f'Acción no válida: {action}'})
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Error interno del servidor'})
        }