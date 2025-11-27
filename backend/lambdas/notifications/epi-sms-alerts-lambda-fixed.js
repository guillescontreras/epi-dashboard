const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const snsClient = new SNSClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    const httpMethod = event.httpMethod || 'POST';
    
    // Manejar OPTIONS para CORS
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
            },
            body: ''
        };
    }
    
    // Manejar PUT para guardar configuración
    if (httpMethod === 'PUT') {
        return await saveAlertConfig(event);
    }
    
    // Manejar POST para enviar alerta
    try {
        const { userId, missingEPPs, timestamp, supervisorPhone } = JSON.parse(event.body || '{}');
        
        if (!userId || !missingEPPs || missingEPPs.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
                },
                body: JSON.stringify({ error: 'userId y missingEPPs son requeridos' })
            };
        }

        // Obtener configuración de alertas del usuario
        const configResult = await dynamodb.send(new GetCommand({
            TableName: 'epi-alert-config',
            Key: { userId }
        }));

        if (!configResult.Item || !configResult.Item.enabled) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
                },
                body: JSON.stringify({ message: 'Alertas deshabilitadas para este usuario' })
            };
        }

        const config = configResult.Item;
        const { phoneNumber, enabledEPPs, cooldownMinutes = 5, lastAlertTime } = config;

        // Verificar cooldown
        if (lastAlertTime) {
            const timeSinceLastAlert = (Date.now() - lastAlertTime) / (1000 * 60);
            if (timeSinceLastAlert < cooldownMinutes) {
                return {
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
                    },
                    body: JSON.stringify({ 
                        message: `Cooldown activo. ${Math.ceil(cooldownMinutes - timeSinceLastAlert)} min restantes` 
                    })
                };
            }
        }

        // Filtrar EPPs que están habilitados para alertas
        const criticalMissing = missingEPPs.filter(epp => enabledEPPs.includes(epp));
        
        if (criticalMissing.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
                },
                body: JSON.stringify({ message: 'No hay EPPs críticos faltantes' })
            };
        }

        // Mapear nombres EPP
        const eppNames = {
            'HEAD_COVER': 'Casco',
            'HAND_COVER': 'Guantes', 
            'FACE_COVER': 'Mascarilla',
            'EYE_COVER': 'Gafas',
            'FOOT_COVER': 'Calzado',
            'EAR_COVER': 'Orejeras'
        };

        const missingNames = criticalMissing.map(epp => eppNames[epp] || epp).join(', ');
        const timeStr = new Date(timestamp || Date.now()).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour12: false
        });

        // Crear mensaje SMS
        const message = `🚨 ALERTA EPP - CoironTech
❌ ${missingNames} no detectado${criticalMissing.length > 1 ? 's' : ''}
📹 Cámara: Tiempo Real
⏰ ${timeStr}
👤 Usuario: ${userId}`;

        // Enviar SMS
        const publishCommand = new PublishCommand({
            Message: message,
            PhoneNumber: phoneNumber,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional'
                }
            }
        });

        const smsResult = await snsClient.send(publishCommand);
        console.log('SMS enviado:', smsResult.MessageId);
        
        // Enviar SMS a supervisor si está configurado
        if (supervisorPhone && supervisorPhone !== phoneNumber) {
            const supervisorMessage = `🚨 ALERTA EPP - Supervisor
❌ ${missingNames} no detectado${criticalMissing.length > 1 ? 's' : ''}
👤 Trabajador: ${userId}
📹 Cámara: Tiempo Real
⏰ ${timeStr}
🏢 CoironTech`;
            
            const supervisorCommand = new PublishCommand({
                Message: supervisorMessage,
                PhoneNumber: supervisorPhone,
                MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional'
                    }
                }
            });
            
            const supervisorResult = await snsClient.send(supervisorCommand);
            console.log('SMS supervisor enviado:', supervisorResult.MessageId);
        }

        // Actualizar timestamp de última alerta
        await dynamodb.send(new UpdateCommand({
            TableName: 'epi-alert-config',
            Key: { userId },
            UpdateExpression: 'SET lastAlertTime = :timestamp',
            ExpressionAttributeValues: {
                ':timestamp': Date.now()
            }
        }));

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
            },
            body: JSON.stringify({ 
                message: 'Alerta SMS enviada exitosamente',
                messageId: smsResult.MessageId,
                missingEPPs: criticalMissing
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
            },
            body: JSON.stringify({ error: 'Error interno del servidor' })
        };
    }
};

// Función para guardar configuración de alertas
const saveAlertConfig = async (event) => {
    try {
        const { userId, enabled, phoneNumber, enabledEPPs, cooldownMinutes, supervisorPhone, enableSupervisorAlerts } = JSON.parse(event.body || '{}');
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
                },
                body: JSON.stringify({ error: 'userId es requerido' })
            };
        }
        
        const configData = {
            userId,
            enabled: enabled || false,
            phoneNumber: phoneNumber || '',
            enabledEPPs: enabledEPPs || [],
            cooldownMinutes: cooldownMinutes || 5,
            supervisorPhone: supervisorPhone || '',
            enableSupervisorAlerts: enableSupervisorAlerts || false,
            updatedAt: Date.now()
        };
        
        await dynamodb.send(new PutCommand({
            TableName: 'epi-alert-config',
            Item: configData
        }));
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
            },
            body: JSON.stringify({ 
                message: 'Configuración guardada exitosamente',
                config: configData
            })
        };
        
    } catch (error) {
        console.error('Error guardando configuración:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS'
            },
            body: JSON.stringify({ error: 'Error guardando configuración' })
        };
    }
};