import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Papa from 'papaparse';
import './aws-config';
import AuthWrapper from './components/AuthWrapper';
import { getCurrentUser } from 'aws-amplify/auth';
import ModernHeader from './components/ModernHeader';
import UserMenu from './components/UserMenu';
import ModernAnalysisPanel from './components/ModernAnalysisPanel';
import Dashboard from './components/Dashboard';
import RealtimeDetection from './components/RealtimeDetection';
import ImageComparison from './components/ImageComparison';
import WelcomeModal from './components/WelcomeModal';
import GuidedAnalysisWizard from './components/GuidedAnalysisWizard';
import VideoProcessor from './components/VideoProcessor';
import AISummary from './components/AISummary';
import { APP_VERSION } from './version';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('analysis');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [detectionType, setDetectionType] = useState<string>('ppe_detection');
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [progress, setProgress] = useState<number>(0);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [epiItems, setEpiItems] = useState<string[]>(['HEAD_COVER', 'EYE_COVER', 'HAND_COVER', 'FOOT_COVER', 'FACE_COVER', 'EAR_COVER']);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [showRealtimeDetection, setShowRealtimeDetection] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [useGuidedMode, setUseGuidedMode] = useState(true);
  const [showVideoProcessor, setShowVideoProcessor] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [totalAnalysisCount, setTotalAnalysisCount] = useState<number>(0);
  
  const fetchAnalysisData = async () => {
    try {
      // Contador global desde S3
      console.log('Obteniendo contador...');
      const countResponse = await fetch('https://9znhglw756.execute-api.us-east-1.amazonaws.com/prod');
      const countData = await countResponse.json();
      console.log('Contador recibido:', countData);
      setTotalAnalysisCount(countData.count || 0);
      
      // Historial personal
      const user = await getCurrentUser();
      console.log('Usuario actual:', user);
      const historyUrl = `https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod?userId=${user.username}`;
      console.log('URL historial:', historyUrl);
      const historyResponse = await fetch(historyUrl);
      const historyData = await historyResponse.json();
      console.log('Historial recibido:', historyData);
      setAnalysisHistory(historyData.history?.map((item: any) => item.analysisData) || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setTotalAnalysisCount(0);
    }
  };
  
  React.useEffect(() => {
    fetchAnalysisData();
  }, []);
  
  // Refrescar datos cuando cambia la sección activa
  React.useEffect(() => {
    if (activeSection === 'dashboard' || activeSection === 'history') {
      fetchAnalysisData();
    }
  }, [activeSection]);
  
  const incrementAnalysisCount = () => {
    setTotalAnalysisCount(prev => prev + 1);
  };
  
  const generateLocalAISummary = (analysisData: any) => {
    console.log('🔍 Generando resumen local con datos:', analysisData);
    const { Summary, ProtectiveEquipment, MinConfidence } = analysisData;
    const totalPersons = Summary?.totalPersons || 0;
    
    // Obtener EPPs requeridos del análisis
    const requiredEPPs = epiItems; // Los EPPs que el usuario seleccionó
    console.log('📋 EPPs requeridos:', requiredEPPs);
    
    // Calcular cumplimiento real: persona cumple si tiene TODOS los EPPs requeridos
    let compliantPersons = 0;
    let partialCompliantPersons = 0;
    let totalEPPsDetected = 0;
    let totalEPPsRequired = requiredEPPs.length * totalPersons;
    
    if (ProtectiveEquipment && ProtectiveEquipment.length > 0) {
      ProtectiveEquipment.forEach((person: any) => {
        const personEPPs = new Set<string>();
        person.BodyParts?.forEach((part: any) => {
          part.EquipmentDetections?.forEach((eq: any) => {
            if (eq.Confidence >= (MinConfidence || 75)) {
              personEPPs.add(eq.Type);
            }
          });
        });
        
        // Contar cuántos EPPs requeridos tiene esta persona
        const personRequiredEPPs = requiredEPPs.filter((epp: string) => personEPPs.has(epp)).length;
        totalEPPsDetected += personRequiredEPPs;
        
        // Verificar si tiene TODOS los EPPs requeridos
        const hasAllRequired = requiredEPPs.every((epp: string) => personEPPs.has(epp));
        const hasSomeRequired = requiredEPPs.some((epp: string) => personEPPs.has(epp));
        
        if (hasAllRequired) {
          compliantPersons++;
        } else if (hasSomeRequired) {
          partialCompliantPersons++;
        }
      });
    }
    
    const compliant = compliantPersons;
    const partial = partialCompliantPersons;
    const nonCompliant = totalPersons - compliant - partial;
    const compliancePercent = totalEPPsRequired > 0 ? Math.round((totalEPPsDetected / totalEPPsRequired) * 100) : 0;
    
    console.log('📊 Stats (recalculados):', { 
      totalPersons, 
      compliant, 
      partial, 
      nonCompliant, 
      requiredEPPs: requiredEPPs.length,
      totalEPPsDetected,
      totalEPPsRequired,
      compliancePercent
    });
    
    // Analizar detecciones de EPP
    let totalDetections = 0;
    let detectedItems: string[] = [];
    
    if (ProtectiveEquipment && ProtectiveEquipment.length > 0) {
      console.log('🔎 Analizando ProtectiveEquipment:', ProtectiveEquipment);
      ProtectiveEquipment.forEach((person: any, idx: number) => {
        console.log(`👤 Persona ${idx}:`, person);
        person.BodyParts?.forEach((part: any) => {
          part.EquipmentDetections?.forEach((eq: any) => {
            console.log(`  🛡️ Equipo detectado: ${eq.Type} - ${eq.Confidence}%`);
            if (eq.Confidence >= (MinConfidence || 75)) {
              totalDetections++;
              if (!detectedItems.includes(eq.Type)) {
                detectedItems.push(eq.Type);
              }
            }
          });
        });
      });
    }
    
    console.log('✅ Detecciones totales:', totalDetections);
    console.log('✅ Items detectados:', detectedItems);
    
    let summary = `**Resumen del Análisis de Seguridad Industrial**\n\n`;
    
    if (totalPersons === 0) {
      summary += `No se detectaron personas en la imagen analizada. Verifique que la imagen contenga trabajadores y que la calidad sea adecuada para el análisis.`;
    } else {
      summary += `Se detectaron **${totalPersons} persona${totalPersons > 1 ? 's' : ''}** en el área de trabajo.\n\n`;
      
      // Mostrar EPP detectados
      if (detectedItems.length > 0) {
        const itemNames: any = {
          'HEAD_COVER': 'Casco',
          'EYE_COVER': 'Gafas de seguridad',
          'HAND_COVER': 'Guantes',
          'FOOT_COVER': 'Calzado de seguridad',
          'FACE_COVER': 'Mascarilla',
          'EAR_COVER': 'Protección auditiva'
        };
        const detectedNames = detectedItems.map(item => itemNames[item] || item).join(', ');
        summary += `**EPP detectados**: ${detectedNames}\n\n`;
      }
      
      if (compliant === totalPersons && compliant > 0) {
        summary += `✅ **Cumplimiento total** (${compliancePercent}%): Todas las personas (${totalPersons}) cumplen con los ${requiredEPPs.length} elementos de EPP requeridos.\n\n`;
        summary += `**Recomendaciones:**\n- Mantener este nivel de cumplimiento\n- Realizar inspecciones periódicas\n- Reforzar la cultura de seguridad`;
      } else if (compliant > 0 || partial > 0) {
        summary += `⚠️ **Cumplimiento parcial** (${compliancePercent}% de EPPs detectados): \n\n`;
        summary += `**Situación detectada:**\n`;
        if (compliant > 0) {
          summary += `- ${compliant} persona${compliant > 1 ? 's' : ''} con TODOS los EPP (${requiredEPPs.length}/${requiredEPPs.length})\n`;
        }
        if (partial > 0) {
          const avgEPPs = Math.round(totalEPPsDetected / (compliant + partial));
          summary += `- ${partial} persona${partial > 1 ? 's' : ''} con EPP incompleto (~${avgEPPs}/${requiredEPPs.length})\n`;
        }
        if (nonCompliant > 0) {
          summary += `- ${nonCompliant} persona${nonCompliant > 1 ? 's' : ''} sin EPP detectado (0/${requiredEPPs.length})\n`;
        }
        summary += `\n**Acciones recomendadas:**\n- Verificar EPP faltante en personal no conforme\n- Proporcionar todos los elementos de protección requeridos\n- Reforzar capacitación sobre uso correcto\n- Implementar supervisión continua`;
      } else {
        summary += `❌ **Incumplimiento** (${compliancePercent}%): Ninguna persona cumple con todos los ${requiredEPPs.length} elementos de EPP requeridos.\n\n`;
        summary += `**ACCIÓN REQUERIDA:**\n- Suspender actividades hasta corregir\n- Proporcionar EPP completo a todo el personal\n- Capacitar sobre uso correcto de EPP\n- Implementar controles de verificación\n- Revisar procedimientos de seguridad`;
      }
    }
    
    return summary;
  };

  const handleUpload = async () => {
    if (detectionType === 'realtime_detection') {
      setShowRealtimeDetection(true);
      return;
    }
    
    if (!file) {
      toast.error('Por favor, selecciona una imagen');
      return;
    }

    // Validar formato de archivo
    const validImageFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    const validVideoFormats = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
    const isVideo = detectionType === 'ppe_video_detection';
    
    if (isVideo) {
      if (!validVideoFormats.includes(file.type)) {
        toast.error('Formato de video no soportado. Use MP4, AVI o MOV.');
        return;
      }
    } else {
      if (!validImageFormats.includes(file.type)) {
        toast.error('Formato no soportado. Use JPEG o PNG únicamente.');
        return;
      }
    }

    setProgress(5);

    try {
      // Obtener presigned URL para subir
      const uploadApiUrl = 'https://kmekzxexq5.execute-api.us-east-1.amazonaws.com/prod/upload';
      const presignedRes = await axios.get(uploadApiUrl, { params: { filename: file.name } });
      console.log('API Response:', presignedRes.data);

      let presignedUrl = presignedRes.data.url;
      if (typeof presignedUrl !== 'string' || !presignedUrl.trim()) {
        throw new Error('URL de subida inválida');
      }
      presignedUrl = presignedUrl.trim();
      console.log('Presigned URL:', presignedUrl);

      // Subir la imagen al bucket
      await axios.put(presignedUrl, file, {
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 30) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      setProgress(40);

      // Actualizar la URL de la imagen
      setImageUrl(`https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${file.name}`);

      // Invocar la Lambda para análisis
      const isVideo = detectionType === 'ppe_video_detection';
      const analyzeApiUrl = isVideo 
        ? 'https://tf52bbq6o6.execute-api.us-east-1.amazonaws.com/prod/analyze-video'
        : 'https://tf52bbq6o6.execute-api.us-east-1.amazonaws.com/prod/analyze';
      const lambdaPayload = {
        bucket: 'rekognition-gcontreras',
        filename: `input/${file.name}`,
        detection_type: detectionType,
        min_confidence: minConfidence,
        epi_items: detectionType === 'ppe_detection' ? epiItems : undefined,
      };
      console.log('Payload enviado a analyze:', lambdaPayload);

      const analyzeRes = await axios.post(analyzeApiUrl, lambdaPayload);
      setProgress(50);
      
      // Manejar video
      if (detectionType === 'ppe_video_detection') {
        toast.info('Procesando video... Esto puede tomar varios minutos.');
        
        const videoResponse = await axios.post(analyzeApiUrl, lambdaPayload);
        let videoData = videoResponse.data;
        if (typeof videoData === 'string') videoData = JSON.parse(videoData);
        if (videoData.body && typeof videoData.body === 'string') videoData = JSON.parse(videoData.body);
        
        if (videoData.videoUrl) {
          setResults({
            DetectionType: 'ppe_video_detection',
            videoUrl: videoData.videoUrl,
            totalFrames: videoData.totalFrames,
            summary: videoData.summary,
            timestamp: Date.now()
          });
          setProgress(100);
          toast.success('Video procesado exitosamente!');
        } else if (videoData.error) {
          toast.error(`Error: ${videoData.error}`);
        }
        
        setTimeout(() => {
          setProgress(0);
          
        }, 1000);
        return;
      }
      
      // Manejar análisis por lotes
      if (detectionType === 'ppe_batch_detection') {
        const batchResults = [];
        
        for (let i = 0; i < files.length; i++) {
          const currentFile = files[i];
          setProgress(Math.round((i / files.length) * 90));
          
          // Subir imagen
          const uploadRes = await axios.get(uploadApiUrl, { params: { filename: currentFile.name } });
          const uploadUrl = uploadRes.data.url.trim();
          await axios.put(uploadUrl, currentFile, { headers: { 'Content-Type': currentFile.type || 'image/jpeg' } });
          
          // Analizar imagen
          const analyzePayload = {
            bucket: 'rekognition-gcontreras',
            filename: `input/${currentFile.name}`,
            detection_type: 'ppe_detection',
            min_confidence: minConfidence,
            epi_items: epiItems,
          };
          
          const analyzeResponse = await axios.post(analyzeApiUrl, analyzePayload);
          let responseData = analyzeResponse.data;
          if (typeof responseData === 'string') responseData = JSON.parse(responseData);
          if (responseData.body && typeof responseData.body === 'string') responseData = JSON.parse(responseData.body);
          
          const jsonUrl = responseData.presignedUrl;
          const resultData = await axios.get(jsonUrl);
          
          batchResults.push({
            filename: currentFile.name,
            imageUrl: `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${currentFile.name}`,
            result: resultData.data
          });
        }
        
        // Consolidar resultados
        const consolidatedResult = {
          DetectionType: 'ppe_batch_detection',
          BatchResults: batchResults,
          Summary: {
            totalImages: batchResults.length,
            totalPersons: batchResults.reduce((sum, r) => sum + (r.result.Summary?.totalPersons || 0), 0),
            totalCompliant: batchResults.reduce((sum, r) => sum + (r.result.Summary?.compliant || 0), 0),
            minConfidence
          },
          timestamp: Date.now()
        };
        
        setResults(consolidatedResult);
        setAnalysisHistory(prev => [...prev, consolidatedResult]);
        setProgress(100);
        
        toast.success(`Análisis por lotes completado: ${batchResults.length} imágenes procesadas`);
        
        setTimeout(() => {
          setProgress(0);
          
        }, 1000);
        
        return;
      }
      
      // Manejar respuesta de video en desarrollo (legacy)
      if (detectionType === 'ppe_video_detection') {
        let responseData = analyzeRes.data;
        if (typeof responseData === 'string') {
          responseData = JSON.parse(responseData);
        }
        if (responseData.body && typeof responseData.body === 'string') {
          responseData = JSON.parse(responseData.body);
        }
        
        if (responseData.status === 'pending') {
          toast.info(responseData.info || 'Análisis de video en desarrollo');
          setProgress(0);
          
          return;
        }
      }
      
      console.log('Respuesta completa de Lambda:', analyzeRes);
      console.log('Status de respuesta:', analyzeRes.status);
      console.log('Data de respuesta:', analyzeRes.data);

      // Parsear el body si viene como string
      let responseData = analyzeRes.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (parseError) {
          console.error('Error parseando respuesta:', parseError);
          throw new Error('Respuesta de análisis inválida');
        }
      }
      
      // Si la respuesta tiene body como string, parsearlo
      if (responseData.body && typeof responseData.body === 'string') {
        try {
          responseData = JSON.parse(responseData.body);
        } catch (parseError) {
          console.error('Error parseando body:', parseError);
          throw new Error('Respuesta de análisis inválida');
        }
      }
      
      console.log('ResponseData final procesada:', responseData);

      const jsonPresignedUrl = responseData.presignedUrl;

      if (!jsonPresignedUrl || typeof jsonPresignedUrl !== 'string') {
        console.error('Estructura de respuesta completa:', analyzeRes.data);
        console.error('ResponseData procesada:', responseData);
        console.error('PresignedUrl encontrada:', jsonPresignedUrl);
        throw new Error('URL presigned para JSON no válida');
      }

      // Obtener el JSON usando la presigned URL
      const res = await axios.get(jsonPresignedUrl);
      const analysisResult = { ...res.data, timestamp: Date.now() };
      setResults(analysisResult);
      setAnalysisHistory(prev => [...prev, analysisResult]);
      incrementAnalysisCount();
      
      // Guardar en DynamoDB
      try {
        const user = await getCurrentUser();
        console.log("💾 Guardando análisis en DynamoDB...");
        console.log("User ID:", user.username);
        const saveResponse = await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
          userId: user.username,
          analysisData: analysisResult
        });
        console.log("✅ Análisis guardado:", saveResponse.data);
      } catch (error) {
        console.error('Error guardando análisis:', error);
      }
      
      setProgress(70);

      // Generar resumen IA
      if (res.data.DetectionType === 'ppe_detection') {
        try {
          console.log('Generando resumen IA...');
          setProgress(85);
          const summaryResponse = await axios.post('https://n2vmezhgo7.execute-api.us-east-1.amazonaws.com/prod', {
            analysisResults: res.data,
            imageUrl: imageUrl,
            requiredEPPs: epiItems
          });
          const summaryData = summaryResponse.data;
          console.log('Resumen IA recibido:', summaryData);
          if (summaryData.summary) {
            setResults((prev: any) => ({ ...prev, aiSummary: summaryData.summary }));
            console.log('✅ Resumen IA (Bedrock) agregado exitosamente');
            toast.success('Resumen IA generado exitosamente');
          }
        } catch (error) {
          console.error('❌ Error con Bedrock, usando resumen local:', error);
          // Fallback: usar resumen local
          const localSummary = generateLocalAISummary(res.data);
          setResults((prev: any) => ({ ...prev, aiSummary: localSummary }));
          console.log('✅ Resumen IA local generado');
          toast.success('Resumen de análisis generado');
        }
      }

      setProgress(100);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
      if (errorMessage.includes('invalid image format')) {
        toast.error('Formato de imagen no soportado. Use JPEG o PNG únicamente.');
      } else {
        toast.error('Error en el proceso: ' + errorMessage);
      }
      setProgress(0);
      
      console.error(err);
    }
  };

  const exportCSV = () => {
    if (!results || results.DetectionType !== 'ppe_detection') return;
    const csvData = results.ProtectiveEquipment.flatMap((p: any, i: number) =>
      p.BodyParts.flatMap((bp: any) =>
        bp.EquipmentDetections.map((ed: any) => ({
          PersonID: i,
          BodyPart: bp.Name,
          Type: ed.Type,
          Confidence: ed.Confidence.toFixed(2),
          Compliant: ed.Confidence >= minConfidence ? 'Sí' : 'No',
        }))
      )
    );
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-epi.csv';
    a.click();
  };

  const handleEpiItemChange = (item: string) => {
    setEpiItems((prev) => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const [wizardKey, setWizardKey] = useState(0);
  
  const resetToStart = () => {
    setResults(null);
    setFile(null);
    setFiles([]);
    setImageUrl('');
    setProgress(0);
    setDetectionType('ppe_detection');
    setUseGuidedMode(true);
    setShowWelcome(false);
    setWizardKey(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGuidedComplete = async (config: any) => {
    setResults(null);
    setImageUrl('');
    setMinConfidence(config.minConfidence);
    setEpiItems(config.epiItems);
    
    if (config.mode === 'realtime') {
      if (config.detectionType === 'realtime_video' && config.file) {
        setVideoFile(config.file);
        setShowVideoProcessor(true);
      } else {
        setShowRealtimeDetection(true);
      }
    } else {
      setFile(config.file);
      setDetectionType(config.detectionType);
      
      setTimeout(async () => {
        if (!config.file) {
          toast.error('Por favor, selecciona una imagen');
          return;
        }
        await handleUploadWithFile(config.file, config.detectionType, config.minConfidence, config.epiItems);
      }, 100);
    }
  };
  
  const handleUploadWithFile = async (uploadFile: File, uploadDetectionType: string, uploadMinConfidence: number, uploadEpiItems: string[]) => {
    const validImageFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (!validImageFormats.includes(uploadFile.type)) {
      toast.error('Formato no soportado. Use JPEG o PNG únicamente.');
      return;
    }

    setProgress(5);

    try {
      const uploadApiUrl = 'https://kmekzxexq5.execute-api.us-east-1.amazonaws.com/prod/upload';
      const presignedRes = await axios.get(uploadApiUrl, { params: { filename: uploadFile.name } });
      let presignedUrl = presignedRes.data.url.trim();

      await axios.put(presignedUrl, uploadFile, {
        headers: { 'Content-Type': uploadFile.type || 'image/jpeg' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 30) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      setProgress(40);
      setImageUrl(`https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${uploadFile.name}`);

      const analyzeApiUrl = 'https://tf52bbq6o6.execute-api.us-east-1.amazonaws.com/prod/analyze';
      const lambdaPayload = {
        bucket: 'rekognition-gcontreras',
        filename: `input/${uploadFile.name}`,
        detection_type: uploadDetectionType,
        min_confidence: uploadMinConfidence,
        epi_items: uploadDetectionType === 'ppe_detection' ? uploadEpiItems : undefined,
      };

      const analyzeRes = await axios.post(analyzeApiUrl, lambdaPayload);
      setProgress(50);

      let responseData = analyzeRes.data;
      if (typeof responseData === 'string') responseData = JSON.parse(responseData);
      if (responseData.body && typeof responseData.body === 'string') responseData = JSON.parse(responseData.body);

      const jsonPresignedUrl = responseData.presignedUrl;
      const res = await axios.get(jsonPresignedUrl);
      const analysisResult = { ...res.data, timestamp: Date.now() };
      setResults(analysisResult);
      setAnalysisHistory(prev => [...prev, analysisResult]);
      incrementAnalysisCount();
      
      // Guardar en DynamoDB
      try {
        const user = await getCurrentUser();
        console.log("💾 Guardando análisis (guided)...");
        console.log("User ID:", user.username);
        const saveResponse = await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
          userId: user.username,
          analysisData: analysisResult
        });
        console.log("✅ Análisis guardado (guided):", saveResponse.data);
      } catch (error) {
        console.error('Error guardando análisis:', error);
      }
      
      setProgress(70);

      // Generar resumen IA
      if (res.data.DetectionType === 'ppe_detection') {
        try {
          console.log('Generando resumen IA (guided mode)...');
          setProgress(85);
          const summaryResponse = await axios.post('https://n2vmezhgo7.execute-api.us-east-1.amazonaws.com/prod', {
            analysisResults: res.data,
            imageUrl: `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${uploadFile.name}`,
            requiredEPPs: uploadEpiItems
          });
          const summaryData = summaryResponse.data;
          console.log('Resumen IA recibido (guided):', summaryData);
          if (summaryData.summary) {
            setResults((prev: any) => ({ ...prev, aiSummary: summaryData.summary }));
            console.log('✅ Resumen IA (Bedrock) agregado (guided)');
            toast.success('Resumen IA generado exitosamente');
          }
        } catch (error) {
          console.error('❌ Error con Bedrock (guided), usando resumen local:', error);
          // Fallback: usar resumen local
          const localSummary = generateLocalAISummary(res.data);
          setResults((prev: any) => ({ ...prev, aiSummary: localSummary }));
          console.log('✅ Resumen IA local generado (guided)');
          toast.success('Resumen de análisis generado');
        }
      }
      
      setProgress(100);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
      toast.error('Error en el proceso: ' + errorMessage);
      setProgress(0);
      
    }
  };

  const renderContent = () => {
    if (useGuidedMode) {
      return (
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Asistente de Análisis</h1>
            <button
              onClick={() => setUseGuidedMode(false)}
              className="text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
            >
              ⚙️ Modo Avanzado
            </button>
          </div>
          <GuidedAnalysisWizard key={wizardKey} onComplete={handleGuidedComplete} />
          
          {/* Resultados en el asistente */}
          {results && useGuidedMode && !showRealtimeDetection && !showVideoProcessor && (
            <div className="mt-8">
              <div className="mb-4 flex justify-end">
                <button
                  onClick={resetToStart}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
                >
                  <span>🆕</span>
                  <span>Nuevo Análisis</span>
                </button>
              </div>
              
              {results.DetectionType === 'ppe_detection' && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📊</span>
                      <span>Resumen del Análisis</span>
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{results.Summary?.totalPersons || 0}</p>
                        <p className="text-sm opacity-90">Personas Detectadas</p>
                      </div>
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{results.Summary?.compliant || 0}</p>
                        <p className="text-sm opacity-90">Cumplientes</p>
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{minConfidence}%</p>
                        <p className="text-sm opacity-90">Confianza Mínima</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Elementos EPP Seleccionados:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {epiItems.map((item) => {
                          const itemName = item === 'HEAD_COVER' ? 'Casco' :
                                         item === 'EYE_COVER' ? 'Gafas' :
                                         item === 'HAND_COVER' ? 'Guantes' :
                                         item === 'FOOT_COVER' ? 'Calzado' :
                                         item === 'FACE_COVER' ? 'Mascarilla' :
                                         item === 'EAR_COVER' ? 'Orejeras' : item;
                          
                          const detections = results.ProtectiveEquipment?.reduce((count: number, person: any) => {
                            return count + (person.BodyParts?.reduce((partCount: number, part: any) => {
                              return partCount + (part.EquipmentDetections?.filter((eq: any) => 
                                eq.Type === item && eq.Confidence >= minConfidence
                              ).length || 0);
                            }, 0) || 0);
                          }, 0) || 0;
                          
                          return (
                            <div key={item} className={`flex items-center justify-between p-2 rounded ${
                              detections > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <span>{itemName}</span>
                              <span className="font-bold">{detections > 0 ? '✓' : '✗'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {results.aiSummary && (
                <AISummary summary={results.aiSummary} />
              )}
              
              {imageUrl && (
                <ImageComparison 
                  results={results}
                  imageUrl={imageUrl}
                  minConfidence={minConfidence}
                  epiItems={epiItems}
                />
              )}
            </div>
          )}
        </div>
      );
    }
    
    switch (activeSection) {
      case 'analysis':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <ModernAnalysisPanel
                file={file}
                setFile={setFile}
                files={files}
                setFiles={setFiles}
                detectionType={detectionType}
                setDetectionType={setDetectionType}
                minConfidence={minConfidence}
                setMinConfidence={setMinConfidence}
                epiItems={epiItems}
                handleEpiItemChange={handleEpiItemChange}
                strictMode={strictMode}
                setStrictMode={setStrictMode}
                handleUpload={handleUpload}
                progress={progress}
              />
            </div>
            <div className="space-y-6">
              {results && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📊</span>
                      <span>Resultados del Análisis</span>
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    {results.DetectionType === 'ppe_detection' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                            <p className="text-3xl font-bold">{results.Summary?.totalPersons || 0}</p>
                            <p className="text-sm opacity-90">Personas Detectadas</p>
                          </div>
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white text-center">
                            <p className="text-3xl font-bold">{results.Summary?.compliant || 0}</p>
                            <p className="text-sm opacity-90">Cumplientes</p>
                          </div>
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                            <p className="text-3xl font-bold">{minConfidence}%</p>
                            <p className="text-sm opacity-90">Confianza Mínima</p>
                          </div>
                        </div>
                        
                        {/* Resumen por Elemento EPP */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Elementos EPP Seleccionados:</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {epiItems.map((item) => {
                              const itemName = item === 'HEAD_COVER' ? 'Casco' :
                                             item === 'EYE_COVER' ? 'Gafas' :
                                             item === 'HAND_COVER' ? 'Guantes' :
                                             item === 'FOOT_COVER' ? 'Calzado' :
                                             item === 'FACE_COVER' ? 'Mascarilla' :
                                             item === 'EAR_COVER' ? 'Orejeras' : item;
                              
                              // Contar detecciones de este elemento
                              const detections = results.ProtectiveEquipment?.reduce((count: number, person: any) => {
                                return count + (person.BodyParts?.reduce((partCount: number, part: any) => {
                                  return partCount + (part.EquipmentDetections?.filter((eq: any) => 
                                    eq.Type === item && eq.Confidence >= minConfidence
                                  ).length || 0);
                                }, 0) || 0);
                              }, 0) || 0;
                              
                              return (
                                <div key={item} className={`flex items-center justify-between p-2 rounded ${
                                  detections > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  <span>{itemName}</span>
                                  <span className="font-bold">{detections > 0 ? '✓' : '✗'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <button
                          onClick={exportCSV}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                        >
                          <span>📄</span>
                          <span>Exportar Reporte</span>
                        </button>
                      </div>
                    )}
                    {results.DetectionType === 'face_detection' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalFaces || 0}</p>
                          <p className="text-sm opacity-90">Rostros Detectados</p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{minConfidence}%</p>
                          <p className="text-sm opacity-90">Confianza Mínima</p>
                        </div>
                      </div>
                    )}
                    {results.DetectionType === 'ppe_batch_detection' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalImages || 0}</p>
                          <p className="text-sm opacity-90">Imágenes Analizadas</p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalPersons || 0}</p>
                          <p className="text-sm opacity-90">Personas Detectadas</p>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalCompliant || 0}</p>
                          <p className="text-sm opacity-90">Cumplientes</p>
                        </div>
                      </div>
                    )}
                    {results.DetectionType === 'text_detection' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalTextDetections || 0}</p>
                          <p className="text-sm opacity-90">Textos Detectados</p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{minConfidence}%</p>
                          <p className="text-sm opacity-90">Confianza Mínima</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'dashboard':
        return <Dashboard analysisHistory={analysisHistory} />;
      case 'history':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📋 Historial de Análisis</h2>
            {analysisHistory.length > 0 ? (
              <div className="space-y-4">
                {analysisHistory.map((analysis, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {analysis.DetectionType === 'ppe_detection' ? '🦺 Análisis EPP' :
                           analysis.DetectionType === 'face_detection' ? '👤 Detección Rostros' :
                           analysis.DetectionType === 'text_detection' ? '📝 Detección Texto' :
                           analysis.DetectionType === 'label_detection' ? '🏷️ Detección Objetos' :
                           '🔍 Análisis General'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Confianza: {analysis.MinConfidence}%</p>
                        {analysis.Summary && (
                          <p className="text-sm text-gray-600">
                            {analysis.DetectionType === 'ppe_detection' && 
                              `${analysis.Summary.compliant}/${analysis.Summary.totalPersons} cumplientes`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500">No hay análisis en el historial</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <ModernHeader 
        activeSection={activeSection} 
        onSectionChange={(section) => {
          // Evitar cambio accidental de sección durante análisis
          if (progress > 0 && progress < 100) {
            return;
          }
          // Cambiar a modo avanzado si se selecciona dashboard o historial
          if (section === 'dashboard' || section === 'history') {
            setUseGuidedMode(false);
          } else if (section === 'analysis') {
            // Al hacer click en Análisis, ir al asistente
            setUseGuidedMode(true);
          }
          setActiveSection(section);
        }}
        onGuidedMode={() => {
          if (progress > 0 && progress < 100) {
            if (!window.confirm('¿Detener el análisis en progreso y volver al inicio?')) {
              return;
            }
          }
          resetToStart();
        }}
        userMenu={<UserMenu />}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {renderContent()}
        
        {/* Visualización de Video Procesado */}
        {results && activeSection === 'analysis' && results.DetectionType === 'ppe_video_detection' && results.videoUrl && (
          <div className="mt-8">
            <div className="mb-4 flex justify-end">
              <button
                onClick={resetToStart}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
              >
                <span>🆕</span>
                <span>Nuevo Análisis</span>
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>🎥</span>
                  <span>Video Procesado con Detección de EPP</span>
                </h2>
              </div>
              <div className="p-6">
                <video controls className="w-full rounded-xl" src={results.videoUrl}>
                  Tu navegador no soporta el elemento de video.
                </video>
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 rounded-lg text-white">
                    <p className="text-xs opacity-90">Frames Analizados</p>
                    <p className="text-2xl font-bold">{results.totalFrames}</p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-lg text-white">
                    <p className="text-xs opacity-90">Personas Detectadas</p>
                    <p className="text-2xl font-bold">{results.summary?.totalPersons || 0}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-lg text-white">
                    <p className="text-xs opacity-90">Cumplientes</p>
                    <p className="text-2xl font-bold">{results.summary?.compliant || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Visualización de Resultados - Solo en modo avanzado */}
        {results && !useGuidedMode && activeSection === 'analysis' && imageUrl && results.DetectionType !== 'ppe_video_detection' && (
          <div className="mt-8">
            <div className="mb-4 flex justify-end">
              <button
                onClick={resetToStart}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
              >
                <span>🆕</span>
                <span>Nuevo Análisis</span>
              </button>
            </div>
            {results.aiSummary && (
              <AISummary summary={results.aiSummary} />
            )}
            <ImageComparison 
              results={results}
              imageUrl={imageUrl}
              minConfidence={minConfidence}
              epiItems={epiItems}
            />
          </div>
        )}
      </main>

      <ToastContainer position="top-right" />
      
      {/* Indicador de progreso flotante */}
      {progress > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md">
          {progress < 100 ? (
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-4 animate-pulse">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">⏳</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Analizando imagen...</p>
                  <p className="text-sm text-gray-600">Por favor espera</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-2xl p-4 animate-bounce cursor-pointer hover:scale-105 transition-transform"
                 onClick={() => {
                   setProgress(0);
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                 }}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-green-500 text-2xl">✓</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">¡Análisis completado!</p>
                  <p className="text-sm text-green-100">Haz clic aquí para ver los resultados ↓</p>
                </div>
                <span className="text-white text-2xl animate-bounce">↓</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {showWelcome && (
        <WelcomeModal onClose={() => {
          setShowWelcome(false);
          setUseGuidedMode(true);
        }} />
      )}
      
      {showRealtimeDetection && (
        <RealtimeDetection
          onClose={() => {
            setShowRealtimeDetection(false);
            setUseGuidedMode(true);
          }}
          epiItems={epiItems}
          minConfidence={minConfidence}
        />
      )}
      
      {showVideoProcessor && videoFile && (
        <VideoProcessor
          videoFile={videoFile}
          onClose={() => {
            setShowVideoProcessor(false);
            setVideoFile(null);
            setUseGuidedMode(true);
          }}
          minConfidence={minConfidence}
        />
      )}
      
      {/* Footer */}
      <footer className="bg-gradient-to-r from-[#8B9A9F] via-[#7A9B76] to-[#5B8FA3] text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/CoironTech-logo1.jpeg" alt="CoironTech" className="w-full h-full object-contain p-0.5" />
              </div>
              <div>
                <p className="text-sm font-medium">Desarrollado por CoironTech</p>
                <p className="text-xs text-purple-200">Soluciones de IA para la industria</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
              <a 
                href="mailto:info@coirontech.com" 
                className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
              >
                <span>✉️</span>
                <span>info@coirontech.com</span>
              </a>
              <a 
                href="https://www.coirontech.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
              >
                <span>🌐</span>
                <span>www.coirontech.com</span>
              </a>
              <div className="flex items-center space-x-2 text-purple-200">
                <span>📊</span>
                <span>{totalAnalysisCount.toLocaleString()} análisis</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-200">
                <span>🏷️</span>
                <span>v{APP_VERSION}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </AuthWrapper>
  );
};

export default App;