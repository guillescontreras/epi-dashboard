const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    const httpMethod = event.httpMethod || 'POST';
    
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,DELETE,OPTIONS'
    };
    
    // Manejar OPTIONS para CORS
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        const { userId, subscription } = JSON.parse(event.body || '{}');
        
        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'userId es requerido' })
            };
        }
        
        if (httpMethod === 'POST') {
            // Guardar suscripción push
            if (!subscription) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'subscription es requerida' })
                };
            }
            
            await dynamodb.send(new PutCommand({
                TableName: 'epi-push-subscriptions',
                Item: {
                    userId,
                    subscription,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Suscripción guardada exitosamente' })
            };
            
        } else if (httpMethod === 'DELETE') {
            // Eliminar suscripción push
            await dynamodb.send(new DeleteCommand({
                TableName: 'epi-push-subscriptions',
                Key: { userId }
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Suscripción eliminada exitosamente' })
            };
        }
        
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método no permitido' })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error interno del servidor' })
        };
    }
};