import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { RekognitionClient, DetectFacesCommand, DetectProtectiveEquipmentCommand, DetectLabelsCommand, DetectTextCommand, DetectModerationLabelsCommand, RecognizeCelebritiesCommand } from "@aws-sdk/client-rekognition";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: 'us-east-1' });
const rekognition = new RekognitionClient({ region: 'us-east-1' });

export const handler = async (event) => {
  console.log('Evento recibido:', JSON.stringify(event));

  let bucket = 'rekognition-gcontreras';
  let filename = '';
  let detectionType = 'ppe_detection';
  let minConfidence = 80;

  // Determinar el tipo de evento
  if (event.httpMethod === 'POST') {
    // Evento de API Gateway
    const body = JSON.parse(event.body);
    bucket = body.bucket || bucket;
    filename = body.filename;
    detectionType = body.detection_type || detectionType;
    minConfidence = body.min_confidence || minConfidence;
    console.log('Evento personalizado:', `Procesando: ${filename} con tipo: ${detectionType} min_confidence: ${minConfidence}`);
  } else if (event.Records && event.Records[0].s3) {
    // Evento de S3
    filename = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    console.log('Trigger S3:', `Procesando: ${filename}`);
  } else {
    // Invocación directa
    bucket = event.bucket || bucket;
    filename = event.filename;
    detectionType = event.detection_type || detectionType;
    minConfidence = event.min_confidence || minConfidence;
    console.log('Invocación directa:', `Procesando: ${filename} con tipo: ${detectionType} min_confidence: ${minConfidence}`);
  }

  console.log('Ejecutando detección:', detectionType);

  // IMPORTANTE: Usar MinConfidence fijo de 50 para Rekognition
  // El umbral del usuario (minConfidence) solo se usa en frontend para determinar estado
  const rekognitionMinConfidence = 50;
  
  let params = {
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: filename,
      },
    },
    MinConfidence: rekognitionMinConfidence,
  };

  let detectionResult;
  try {
    switch (detectionType) {
      case 'face_detection':
        const faceParams = {
          ...params,
          Attributes: ['ALL']
        };
        detectionResult = await rekognition.send(new DetectFacesCommand(faceParams));
        console.log('Rostros detectados:', JSON.stringify(detectionResult.FaceDetails));
        
        const faceResultData = {
          Faces: detectionResult.FaceDetails,
          Summary: {
            totalFaces: detectionResult.FaceDetails.length,
            minConfidence: minConfidence,
          },
          DetectionType: 'face_detection',
        };
        
        // Guardar resultado en S3 y generar presigned URL
        const faceBaseName = filename.split('/').pop().split('.')[0];
        const faceJsonKey = `web/${faceBaseName}_${Date.now()}.json`;
        
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: faceJsonKey,
          Body: JSON.stringify(faceResultData),
          ContentType: 'application/json',
        }));
        
        const facePresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: faceJsonKey,
        }), { expiresIn: 3600 });
        
        const faceImagePresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: filename,
        }), { expiresIn: 3600 });
        
        console.log('Presigned URL generada:', facePresignedUrl);
        console.log('Image Presigned URL generada:', faceImagePresignedUrl);
        
        return {
          ...faceResultData,
          presignedUrl: facePresignedUrl,
          imagePresignedUrl: faceImagePresignedUrl,
        };
      case 'ppe_detection':
        params = {
          ...params,
          SummarizationAttributes: {
            MinConfidence: rekognitionMinConfidence,
            RequiredEquipmentTypes: ['HEAD_COVER', 'HAND_COVER', 'FACE_COVER'],
          },
        };
        detectionResult = await rekognition.send(new DetectProtectiveEquipmentCommand(params));
        console.log('PPE detectado:', JSON.stringify(detectionResult.Persons));
        
        // Detección híbrida: Usar Labels para calzado/orejeras y Faces para gafas
        const labelsResult = await rekognition.send(new DetectLabelsCommand({
          Image: params.Image,
          MinConfidence: rekognitionMinConfidence,
          MaxLabels: 50
        }));
        console.log('Labels detectados:', JSON.stringify(labelsResult.Labels));
        
        // Detectar rostros con atributos (para gafas)
        const facesResult = await rekognition.send(new DetectFacesCommand({
          Image: params.Image,
          Attributes: ['ALL']
        }));
        console.log('Rostros detectados:', JSON.stringify(facesResult.FaceDetails));
        
        // Mapeo de labels a EPPs faltantes (sin EYE_COVER, se usa DetectFaces)
        const labelMapping = {
          FOOT_COVER: ['Footwear', 'Shoe', 'Shoes', 'Boot', 'Boots', 'Safety Boots'],
          EAR_COVER: ['Headphones', 'Earmuffs', 'Ear Protection', 'Hearing Protection']
        };
        
        // Función para verificar si un BoundingBox está dentro de otro
        const isInsideBox = (innerBox, outerBox) => {
          const innerCenterX = innerBox.Left + innerBox.Width / 2;
          const innerCenterY = innerBox.Top + innerBox.Height / 2;
          
          return innerCenterX >= outerBox.Left && 
                 innerCenterX <= outerBox.Left + outerBox.Width &&
                 innerCenterY >= outerBox.Top && 
                 innerCenterY <= outerBox.Top + outerBox.Height;
        };
        
        // Enriquecer personas con EPPs detectados por labels y faces
        console.log('[HYBRID] Iniciando enriquecimiento híbrido');
        console.log('[HYBRID] Personas:', detectionResult.Persons?.length || 0);
        console.log('[HYBRID] Labels:', labelsResult.Labels?.length || 0);
        console.log('[HYBRID] Rostros:', facesResult.FaceDetails?.length || 0);
        
        if (detectionResult.Persons) {
          // Primero: Agregar gafas desde DetectFaces
          if (facesResult.FaceDetails && facesResult.FaceDetails.length > 0) {
            console.log('[HYBRID] Procesando gafas desde DetectFaces');
            
            facesResult.FaceDetails.forEach((face, faceIdx) => {
              if (face.Eyeglasses && face.Eyeglasses.Value && face.BoundingBox) {
                console.log(`[HYBRID] Rostro ${faceIdx}: Gafas detectadas (${face.Eyeglasses.Confidence}%)`);
                
                // Calcular centro del rostro
                const faceCenterX = face.BoundingBox.Left + face.BoundingBox.Width / 2;
                const faceCenterY = face.BoundingBox.Top + face.BoundingBox.Height / 2;
                
                // Buscar la persona MÁS CERCANA al rostro
                let closestPerson = null;
                let minDistance = Infinity;
                
                detectionResult.Persons.forEach(person => {
                  if (person.BoundingBox) {
                    const personCenterX = person.BoundingBox.Left + person.BoundingBox.Width / 2;
                    const personCenterY = person.BoundingBox.Top + person.BoundingBox.Height / 2;
                    
                    const distance = Math.sqrt(
                      Math.pow(faceCenterX - personCenterX, 2) + 
                      Math.pow(faceCenterY - personCenterY, 2)
                    );
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPerson = person;
                    }
                  }
                });
                
                if (closestPerson) {
                  const personIdx = detectionResult.Persons.indexOf(closestPerson);
                  console.log(`[HYBRID] Rostro ${faceIdx} más cercano a Persona ${personIdx} (distancia: ${minDistance.toFixed(4)})`);
                  
                  if (!closestPerson.BodyParts) closestPerson.BodyParts = [];
                  
                  let facePart = closestPerson.BodyParts.find(bp => bp.Name === 'FACE');
                  if (!facePart) {
                    facePart = {
                      Name: 'FACE',
                      Confidence: face.Confidence || 90,
                      EquipmentDetections: []
                    };
                    closestPerson.BodyParts.push(facePart);
                  }
                  
                  // Agregar gafas
                  facePart.EquipmentDetections.push({
                    Type: 'EYE_COVER',
                    Confidence: face.Eyeglasses.Confidence,
                    CoversBodyPart: { Confidence: face.Eyeglasses.Confidence, Value: true },
                    BoundingBox: face.BoundingBox,
                    DetectionMethod: 'FACE_DETECTION'
                  });
                  
                  console.log(`[HYBRID] Gafas agregadas a Persona ${personIdx}`);
                } else {
                  console.log(`[HYBRID] Rostro ${faceIdx} no tiene persona cercana`);
                }
              } else {
                console.log(`[HYBRID] Rostro ${faceIdx}: Sin gafas`);
              }
            });
          }
          
          // Segundo: Agregar calzado y orejeras desde Labels
          if (labelsResult.Labels) {
            detectionResult.Persons.forEach((person, idx) => {
              console.log(`[HYBRID] Persona ${idx}`);
              if (!person.BodyParts) person.BodyParts = [];
              
              Object.entries(labelMapping).forEach(([eppType, labelNames]) => {
                console.log(`[HYBRID] Buscando ${eppType}`);
                
                // Buscar TODOS los labels que coincidan
                const matchedLabels = labelsResult.Labels.filter(label => 
                  labelNames.some(name => label.Name.toLowerCase() === name.toLowerCase())
                );
                
                // Elegir el que tenga instancias
                const matchedLabel = matchedLabels.find(label => 
                  label.Instances && label.Instances.length > 0
                );
                
                if (matchedLabel) {
                  console.log(`[HYBRID] Encontrado: ${matchedLabel.Name} con ${matchedLabel.Instances.length} instancias`);
                  
                  // Buscar instances que estén dentro de esta persona
                  const instancesInPerson = matchedLabel.Instances.filter(instance => 
                    instance.BoundingBox && person.BoundingBox && 
                    isInsideBox(instance.BoundingBox, person.BoundingBox)
                  );
                  
                  if (instancesInPerson.length > 0) {
                    console.log(`[HYBRID] ${instancesInPerson.length} instance(s) dentro de Persona ${idx}`);
                    
                    const bodyPartName = eppType === 'FOOT_COVER' ? 'LEFT_FOOT' : 'HEAD';
                    
                    let bodyPart = person.BodyParts.find(bp => bp.Name === bodyPartName);
                    
                    if (!bodyPart) {
                      console.log(`[HYBRID] Creando ${bodyPartName}`);
                      bodyPart = {
                        Name: bodyPartName,
                        Confidence: 90,
                        EquipmentDetections: []
                      };
                      person.BodyParts.push(bodyPart);
                    }
                    
                    console.log(`[HYBRID] Agregando ${eppType}`);
                    bodyPart.EquipmentDetections.push({
                      Type: eppType,
                      Confidence: instancesInPerson[0].Confidence,
                      CoversBodyPart: { Confidence: instancesInPerson[0].Confidence, Value: true },
                      BoundingBox: instancesInPerson[0].BoundingBox,
                      DetectionMethod: 'LABEL_DETECTION'
                    });
                  } else {
                    console.log(`[HYBRID] Ninguna instance dentro de Persona ${idx}`);
                  }
                } else {
                  console.log(`[HYBRID] ${eppType} no encontrado o sin instancias`);
                }
              });
            });
          }
        }
        
        console.log('[HYBRID] Completado');
        
        const resultData = {
          ProtectiveEquipment: detectionResult.Persons,
          Summary: {
            totalPersons: detectionResult.Persons.length,
            compliant: detectionResult.Persons.filter(p => p.ProtectiveEquipmentSummarization?.AllRequiredEquipmentCovered).length,
            minConfidence: minConfidence,
            hybridDetection: true, // Indicador de detección híbrida
            detectionMethods: {
              native: ['HEAD_COVER', 'HAND_COVER', 'FACE_COVER'],
              faces: ['EYE_COVER'],
              labels: ['FOOT_COVER', 'EAR_COVER']
            }
          },
          DetectionType: 'ppe_detection',
        };
        
        // Guardar resultado en S3 y generar presigned URL
        const baseName = filename.split('/').pop().split('.')[0];
        const jsonKey = `web/${baseName}_${Date.now()}.json`;
        
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: jsonKey,
          Body: JSON.stringify(resultData),
          ContentType: 'application/json',
        }));
        
        const presignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: jsonKey,
        }), { expiresIn: 3600 });
        
        const imagePresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: filename,
        }), { expiresIn: 3600 });
        
        console.log('Presigned URL generada:', presignedUrl);
        console.log('Image Presigned URL generada:', imagePresignedUrl);
        
        return {
          ...resultData,
          presignedUrl,
          imagePresignedUrl,
        };
      case 'label_detection':
        detectionResult = await rekognition.send(new DetectLabelsCommand(params));
        console.log('Etiquetas detectadas:', JSON.stringify(detectionResult.Labels));
        
        const labelResultData = {
          Labels: detectionResult.Labels,
          Summary: {
            totalLabels: detectionResult.Labels.length,
            minConfidence: minConfidence,
          },
          DetectionType: 'label_detection',
        };
        
        // Guardar resultado en S3 y generar presigned URL
        const labelBaseName = filename.split('/').pop().split('.')[0];
        const labelJsonKey = `web/${labelBaseName}_${Date.now()}.json`;
        
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: labelJsonKey,
          Body: JSON.stringify(labelResultData),
          ContentType: 'application/json',
        }));
        
        const labelPresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: labelJsonKey,
        }), { expiresIn: 3600 });
        
        const labelImagePresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: filename,
        }), { expiresIn: 3600 });
        
        console.log('Presigned URL generada:', labelPresignedUrl);
        console.log('Image Presigned URL generada:', labelImagePresignedUrl);
        
        return {
          ...labelResultData,
          presignedUrl: labelPresignedUrl,
          imagePresignedUrl: labelImagePresignedUrl,
        };
      case 'text_detection':
        detectionResult = await rekognition.send(new DetectTextCommand(params));
        console.log('Texto detectado:', JSON.stringify(detectionResult.TextDetections));
        
        const textResultData = {
          TextDetections: detectionResult.TextDetections,
          DetectionType: 'text_detection',
        };
        
        // Guardar resultado en S3 y generar presigned URL
        const textBaseName = filename.split('/').pop().split('.')[0];
        const textJsonKey = `web/${textBaseName}_${Date.now()}.json`;
        
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: textJsonKey,
          Body: JSON.stringify(textResultData),
          ContentType: 'application/json',
        }));
        
        const textPresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: textJsonKey,
        }), { expiresIn: 3600 });
        
        const textImagePresignedUrl = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: bucket,
          Key: filename,
        }), { expiresIn: 3600 });
        
        console.log('Presigned URL generada:', textPresignedUrl);
        console.log('Image Presigned URL generada:', textImagePresignedUrl);
        
        return {
          ...textResultData,
          presignedUrl: textPresignedUrl,
          imagePresignedUrl: textImagePresignedUrl,
        };
      case 'moderation_detection':
        detectionResult = await rekognition.send(new DetectModerationLabelsCommand(params));
        console.log('Moderation detectado:', JSON.stringify(detectionResult.ModerationLabels));
        return {
          ModerationLabels: detectionResult.ModerationLabels,
          DetectionType: 'moderation_detection',
        };
      case 'celebrity_detection':
        detectionResult = await rekognition.send(new RecognizeCelebritiesCommand(params));
        console.log('Celebridades detectadas:', JSON.stringify(detectionResult.CelebrityFaces));
        return {
          Celebrities: detectionResult.CelebrityFaces,
          DetectionType: 'celebrity_detection',
        };
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Tipo de detección no soportado' }),
        };
    }
  } catch (error) {
    console.error('Error en la detección:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al procesar la imagen', error: error.message }),
    };
  }
};
