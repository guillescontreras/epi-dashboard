import json
import boto3
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
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }
    
    # Manejar OPTIONS para CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        user_pool_id = 'us-east-1_zrdfN7OKN'  # User Pool de epi-dashboard
        supervisors = []
        
        # Obtener todos los usuarios
        paginator = cognito.get_paginator('list_users')
        
        for page in paginator.paginate(UserPoolId=user_pool_id):
            for user in page['Users']:
                # Buscar el atributo custom:role
                role = 'user'  # Default
                name = ''
                email = ''
                
                for attr in user.get('Attributes', []):
                    if attr['Name'] == 'custom:role':
                        role = attr['Value']
                    elif attr['Name'] == 'name':
                        name = attr['Value']
                    elif attr['Name'] == 'email':
                        email = attr['Value']
                
                # Solo incluir supervisores y admins
                if role in ['supervisor', 'admin']:
                    supervisors.append({
                        'username': user['Username'],
                        'email': email,
                        'name': name,
                        'role': role
                    })
        
        # Ordenar por rol (admin primero) y luego por email
        supervisors.sort(key=lambda x: (x['role'] != 'admin', x['email']))
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'supervisors': supervisors,
                'count': len(supervisors)
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Error interno del servidor'})
        }