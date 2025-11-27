const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const webpush = require('web-push');

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: 'us-east-1' });
const snsClient = new SNSClient({ region: 'us-east-1' });
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// VAPID keys para push notifications
const VAPID_PRIVATE_KEY = 'Y2FmZWJhYmVkZWFkYmVlZmNhZmViYWJlZGVhZGJlZWY';
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLEw6_MzA3gqVD0vHLrjKSjaDkFxREhfTXfQjlD9RWuHqp1XWRytvQ8';

webpush.setVapidDetails(
    'mailto:noreply@coirontech.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const { supervisorUsername, missingEPPs, timestamp, workerUserId, alertTypes } = JSON.parse(event.body || '{}');
        
        if (!supervisorUsername || !missingEPPs || !alertTypes) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'supervisorUsername, missingEPPs y alertTypes son requeridos' })
            };
        }
        
        // Obtener información real del supervisor desde Cognito
        const supervisorInfo = await getCognitoUserInfo(supervisorUsername);
        if (!supervisorInfo) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Supervisor no encontrado' })
            };
        }
        
        const eppNames = {
            'HEAD_COVER': 'Casco',
            'HAND_COVER': 'Guantes', 
            'FACE_COVER': 'Mascarilla',
            'EYE_COVER': 'Gafas',
            'FOOT_COVER': 'Calzado',
            'EAR_COVER': 'Orejeras'
        };
        
        const missingNames = missingEPPs.map(epp => eppNames[epp] || epp).join(', ');
        const timeStr = new Date(timestamp || Date.now()).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour12: false
        });
        
        const results = [];
        
        // Enviar Push Notification
        if (alertTypes.push) {
            try {
                const pushResult = await sendPushNotification(supervisorUsername, {
                    title: '🚨 Alerta EPP - CoironTech',
                    body: `❌ ${missingNames} no detectado - Trabajador: ${workerUserId}`,
                    data: { missingEPPs, timestamp, workerUserId }
                });
                results.push({ type: 'push', success: true, result: pushResult });
            } catch (error) {
                console.error('Error enviando push:', error);
                results.push({ type: 'push', success: false, error: error.message });
            }
        }
        
        // Enviar Email al supervisor
        if (alertTypes.email && supervisorInfo.email) {
            try {
                console.log(`Enviando email al supervisor: ${supervisorInfo.email}`);
                const emailResult = await sendEmail(supervisorInfo.email, {
                    subject: '🚨 Alerta EPP - CoironTech',
                    body: `
                        <h2>🚨 Alerta de Seguridad EPP</h2>
                        <p><strong>❌ EPPs no detectados:</strong> ${missingNames}</p>
                        <p><strong>👤 Trabajador:</strong> ${workerUserId}</p>
                        <p><strong>👮 Supervisor:</strong> ${supervisorInfo.name || supervisorInfo.email}</p>
                        <p><strong>📹 Ubicación:</strong> Cámara en Tiempo Real</p>
                        <p><strong>⏰ Fecha y Hora:</strong> ${timeStr}</p>
                        <hr>
                        <p><em>Sistema de Detección EPP - CoironTech</em></p>
                    `
                });
                console.log('Email enviado exitosamente:', emailResult.MessageId);
                results.push({ type: 'email', success: true, result: emailResult.MessageId });
            } catch (error) {
                console.error('Error enviando email:', error);
                results.push({ type: 'email', success: false, error: error.message });
            }
        }
        
        // Enviar SMS
        if (alertTypes.sms && supervisorInfo.phoneNumber) {
            try {
                const smsMessage = `🚨 ALERTA EPP - CoironTech
❌ ${missingNames} no detectado
👤 Trabajador: ${workerUserId}
📹 Cámara: Tiempo Real
⏰ ${timeStr}`;
                
                const smsResult = await snsClient.send(new PublishCommand({
                    Message: smsMessage,
                    PhoneNumber: supervisorInfo.phoneNumber,
                    MessageAttributes: {
                        'AWS.SNS.SMS.SMSType': {
                            DataType: 'String',
                            StringValue: 'Transactional'
                        }
                    }
                }));
                results.push({ type: 'sms', success: true, result: smsResult.MessageId });
            } catch (error) {
                console.error('Error enviando SMS:', error);
                results.push({ type: 'sms', success: false, error: error.message });
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Alertas procesadas',
                results,
                supervisor: supervisorInfo.email
            })
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

async function getCognitoUserInfo(username) {
    try {
        const command = new AdminGetUserCommand({
            UserPoolId: 'us-east-1_zrdfN7OKN',
            Username: username
        });
        
        const response = await cognitoClient.send(command);
        
        const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
        const phoneNumber = response.UserAttributes?.find(attr => attr.Name === 'phone_number')?.Value;
        const name = response.UserAttributes?.find(attr => attr.Name === 'name')?.Value || 
                    response.UserAttributes?.find(attr => attr.Name === 'given_name')?.Value;
        
        return {
            username,
            email,
            phoneNumber,
            name: name || email
        };
    } catch (error) {
        console.error('Error obteniendo usuario de Cognito:', error);
        return null;
    }
}

async function sendPushNotification(userId, payload) {
    try {
        // Obtener suscripción push del usuario
        const subscription = await dynamodb.send(new GetCommand({
            TableName: 'epi-push-subscriptions',
            Key: { userId }
        }));
        
        if (!subscription.Item || !subscription.Item.subscription) {
            throw new Error('Usuario no suscrito a push notifications');
        }
        
        // Convertir desde formato DynamoDB a objeto JavaScript
        let pushSubscription;
        if (typeof subscription.Item.subscription === 'string') {
            pushSubscription = JSON.parse(subscription.Item.subscription);
        } else if (subscription.Item.subscription && subscription.Item.subscription.M) {
            // Formato DynamoDB - convertir manualmente
            pushSubscription = {
                endpoint: subscription.Item.subscription.M.endpoint?.S,
                expirationTime: subscription.Item.subscription.M.expirationTime?.NULL ? null : subscription.Item.subscription.M.expirationTime?.N,
                keys: {
                    auth: subscription.Item.subscription.M.keys?.M?.auth?.S,
                    p256dh: subscription.Item.subscription.M.keys?.M?.p256dh?.S
                }
            };
        } else {
            pushSubscription = subscription.Item.subscription;
        }
        
        console.log('Push subscription procesada:', JSON.stringify(pushSubscription, null, 2));
        
        const result = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        
        console.log('Push notification enviada exitosamente');
        return { messageId: 'push-' + Date.now(), statusCode: result.statusCode };
    } catch (error) {
        console.error('Error en sendPushNotification:', error);
        throw error;
    }
}

async function sendEmail(email, { subject, body }) {
    const command = new SendEmailCommand({
        Source: 'ia-agent@coirontech.com', // Remitente verificado
        Destination: { ToAddresses: [email] }, // Destinatario (supervisor)
        Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: body } }
        },
        ReplyToAddresses: ['ia-agent@coirontech.com']
    });
    
    return await sesClient.send(command);
}