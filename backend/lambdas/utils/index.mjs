import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-east-1" });

export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event));
  
  const filename = event.queryStringParameters?.filename;
  const operation = event.queryStringParameters?.operation || 'put';
  
  if (!filename || typeof filename !== 'string' || filename.trim() === '') {
    console.log('Invalid or missing filename:', filename);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Filename is required and must be a valid string' }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": event.headers.origin || "https://epi.coirontech.com",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
  }

  try {
    let command;
    let key = filename.trim();
    
    // Si no tiene prefijo, agregar input/
    if (!key.startsWith('input/')) {
      key = `input/${key}`;
    }
    
    if (operation === 'get') {
      // Generar URL presignada para LEER
      command = new GetObjectCommand({
        Bucket: "rekognition-gcontreras",
        Key: key,
      });
    } else {
      // Generar URL presignada para SUBIR (comportamiento original)
      command = new PutObjectCommand({
        Bucket: "rekognition-gcontreras",
        Key: key,
        ContentType: "image/jpeg",
      });
    }
    
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    console.log(`Generated presigned URL (${operation}) for:`, key, 'URL:', url);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url: url }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": event.headers.origin || "https://epi.coirontech.com",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": event.headers.origin || "https://epi.coirontech.com",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
  }
};
