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
import { v4 as uuidv4 } from 'uuid';
import { generateAnalysisPDF } from './utils/pdfGenerator';
import UserProfileModal from './components/UserProfileModal';
import ConfirmModal from './components/ConfirmModal';
import FAQ from './components/FAQ';
import FeedbackModal from './components/FeedbackModal';
import ContactModal from './components/ContactModal';
import AdminPanel from './components/AdminPanel';
import { fetchUserAttributes } from 'aws-amplify/auth';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('analysis');
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<any>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackAnalysisId, setFeedbackAnalysisId] = useState<string>('');
  const [feedbackAnalysisType, setFeedbackAnalysisType] = useState<string>('');
  const [showContact, setShowContact] = useState(false);
  const [contactModalData, setContactModalData] = useState<{ initialTab?: 'contact' | 'feature' | 'bug'; initialMessage?: string; analysisId?: string }>({});
  
  const [lastHistoryKey, setLastHistoryKey] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  
  const fetchAnalysisData = async () => {
    try {
      // Usuario actual
      const user = await getCurrentUser();
      console.log('Usuario actual:', user);
      setCurrentUserId(user.username);
      
      // Verificar rol de usuario
      try {
        const attributes = await fetchUserAttributes();
        const role = attributes['custom:role'] as 'user' | 'admin' || 'user';
        setUserRole(role);
        console.log('👤 Rol de usuario:', role);
      } catch (roleError) {
        console.log('No se pudo obtener rol, asumiendo user');
        setUserRole('user');
      }
      
      // Verificar si tiene perfil
      try {
        const profileResponse = await axios.get(`https://22ieg9wnd8.execute-api.us-east-1.amazonaws.com/prod?userId=${user.username}`);
        if (profileResponse.data.profile) {
          setUserProfile(profileResponse.data.profile);
        } else {
          setShowProfileModal(true);
        }
      } catch (profileError) {
        console.log('No se encontró perfil, mostrar modal');
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setTotalAnalysisCount(0);
    }
  };
  
  const fetchHistory = async (loadMore = false) => {
    try {
      setLoadingHistory(true);
      const user = await getCurrentUser();
      
      let historyUrl = `https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod?userId=${user.username}&limit=10`;
      if (loadMore && lastHistoryKey) {
        historyUrl += `&lastKey=${encodeURIComponent(lastHistoryKey)}`;
      }
      
      console.log('Cargando historial:', historyUrl);
      const historyResponse = await fetch(historyUrl);
      const historyData = await historyResponse.json();
      console.log('Historial recibido:', historyData);
      
      const newHistory = historyData.history || [];
      
      if (loadMore) {
        // Combinar y eliminar duplicados por timestamp
        const combined = [...analysisHistory, ...newHistory];
        const unique = combined.filter((item, index, self) => 
          index === self.findIndex(t => t.timestamp === item.timestamp)
        );
        // Ordenar por timestamp descendente
        unique.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setAnalysisHistory(unique);
      } else {
        // Ordenar por timestamp descendente
        newHistory.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setAnalysisHistory(newHistory);
      }
      
      setLastHistoryKey(historyData.lastKey || null);
      setHasMoreHistory(!!historyData.lastKey);
      
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  React.useEffect(() => {
    fetchAnalysisData();
    
    // Cargar contador de forma lazy (no bloquea carga inicial)
    setTimeout(async () => {
      try {
        console.log('Obteniendo contador...');
        const countResponse = await fetch('https://9znhglw756.execute-api.us-east-1.amazonaws.com/prod');
        const countData = await countResponse.json();
        console.log('Contador recibido:', countData);
        setTotalAnalysisCount(countData.count || 0);
      } catch (error) {
        console.error('Error cargando contador:', error);
        setTotalAnalysisCount(0);
      }
    }, 100);
  }, []);
  
  // Cargar historial solo cuando se accede a la sección
  React.useEffect(() => {
    if (activeSection === 'history' && analysisHistory.length === 0) {
      fetchHistory();
    }
  }, [activeSection]);
  
  const incrementAnalysisCount = () => {
    setTotalAnalysisCount(prev => prev + 1);
  };
  
  const calculateCompliance = (analysisData: any, selectedEPPs: string[], confidenceThreshold: number) => {
    if (!analysisData.ProtectiveEquipment || analysisData.ProtectiveEquipment.length === 0) {
      return 0;
    }
    
    let compliantCount = 0;
    
    analysisData.ProtectiveEquipment.forEach((person: any) => {
      const detectedEPPs = new Set<string>();
      
      person.BodyParts?.forEach((part: any) => {
        part.EquipmentDetections?.forEach((eq: any) => {
          if (eq.Confidence >= confidenceThreshold) {
            detectedEPPs.add(eq.Type);
          }
        });
      });
      
      // Persona cumple si tiene TODOS los EPPs seleccionados con confianza >= umbral
      const hasAllRequired = selectedEPPs.every(epp => detectedEPPs.has(epp));
      if (hasAllRequired) {
        compliantCount++;
      }
    });
    
    return compliantCount;
  };
  
  const generateLocalAISummary = (analysisData: any) => {
    console.log('🔍 Generando resumen local con datos:', analysisData);
    const { Summary, ProtectiveEquipment, MinConfidence } = analysisData;
    const totalPersonsDetected = Summary?.totalPersons || 0;
    
    // Obtener EPPs requeridos del análisis
    const requiredEPPs = epiItems;
    console.log('📋 EPPs requeridos:', requiredEPPs);
    
    // FILTRAR PERSONAS EVALUABLES
    // Persona es evaluable si tiene AL MENOS UNA parte visible de los EPPs requeridos
    const evaluablePersons = ProtectiveEquipment?.filter((person: any) => {
      const visibleParts = new Set<string>();
      person.BodyParts?.forEach((part: any) => {
        visibleParts.add(part.Name);
      });
      
      // Mapeo de EPP a partes del cuerpo necesarias
      const eppToParts: any = {
        'HEAD_COVER': ['HEAD'],
        'EYE_COVER': ['FACE'],
        'FACE_COVER': ['FACE'],
        'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'],
        'FOOT_COVER': ['FOOT'],
        'EAR_COVER': ['HEAD']
      };
      
      // Verificar que tenga AL MENOS UNA parte necesaria para ALGUNO de los EPPs requeridos
      for (const epp of requiredEPPs) {
        const requiredParts = eppToParts[epp] || [];
        if (requiredParts.some((part: string) => visibleParts.has(part))) {
          return true;
        }
      }
      return false;
    }) || [];
    
    const totalPersons = evaluablePersons.length;
    const filteredPersons = totalPersonsDetected - totalPersons;
    
    console.log(`👥 Personas: ${totalPersonsDetected} detectadas, ${totalPersons} evaluables, ${filteredPersons} filtradas`);
    
    // Calcular cumplimiento real considerando solo partes visibles
    let compliantPersons = 0;
    let partialCompliantPersons = 0;
    let totalEPPsDetected = 0;
    let totalEPPsEvaluable = 0;
    let personsWithMissingParts = 0;
    
    // Función para validar que EPP corresponde a la parte del cuerpo
    const validateEPPForBodyPart = (eppType: string, bodyPart: string): boolean => {
      const validCombinations: any = {
        'HEAD_COVER': ['HEAD'],
        'EYE_COVER': ['FACE', 'HEAD'],
        'FACE_COVER': ['FACE'],
        'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'],
        'FOOT_COVER': ['FOOT'],
        'EAR_COVER': ['HEAD']
      };
      return validCombinations[eppType]?.includes(bodyPart) || false;
    };
    
    if (evaluablePersons && evaluablePersons.length > 0) {
      evaluablePersons.forEach((person: any) => {
        const personEPPs = new Set<string>();
        const visibleBodyParts = new Set<string>();
        
        // Detectar qué partes del cuerpo están visibles Y validar EPPs
        person.BodyParts?.forEach((part: any) => {
          visibleBodyParts.add(part.Name);
          part.EquipmentDetections?.forEach((eq: any) => {
            // VALIDAR: Solo contar EPP si corresponde a esta parte del cuerpo
            if (eq.Confidence >= (MinConfidence || 75) && validateEPPForBodyPart(eq.Type, part.Name)) {
              personEPPs.add(eq.Type);
            }
          });
        });
        
        // Determinar qué EPPs son evaluables según partes visibles
        const evaluableEPPs = requiredEPPs.filter((epp: string) => {
          // HEAD_COVER requiere HEAD visible
          if (epp === 'HEAD_COVER') return visibleBodyParts.has('HEAD');
          // EYE_COVER y FACE_COVER requieren FACE visible
          if (epp === 'EYE_COVER' || epp === 'FACE_COVER') return visibleBodyParts.has('FACE');
          // HAND_COVER requiere al menos una mano visible
          if (epp === 'HAND_COVER') return visibleBodyParts.has('LEFT_HAND') || visibleBodyParts.has('RIGHT_HAND');
          // FOOT_COVER requiere pies visibles
          if (epp === 'FOOT_COVER') return visibleBodyParts.has('FOOT');
          // EAR_COVER es difícil de evaluar, asumimos evaluable si HEAD visible
          if (epp === 'EAR_COVER') return visibleBodyParts.has('HEAD');
          return true;
        });
        
        if (evaluableEPPs.length < requiredEPPs.length) {
          personsWithMissingParts++;
        }
        
        totalEPPsEvaluable += evaluableEPPs.length;
        
        // Contar cuántos EPPs evaluables tiene esta persona
        const personDetectedEPPs = evaluableEPPs.filter((epp: string) => personEPPs.has(epp)).length;
        totalEPPsDetected += personDetectedEPPs;
        
        // Verificar cumplimiento solo de EPPs evaluables
        const hasAllEvaluable = evaluableEPPs.every((epp: string) => personEPPs.has(epp));
        const hasSomeEvaluable = evaluableEPPs.some((epp: string) => personEPPs.has(epp));
        
        if (evaluableEPPs.length > 0) {
          if (hasAllEvaluable) {
            compliantPersons++;
          } else if (hasSomeEvaluable) {
            partialCompliantPersons++;
          }
        }
      });
    }
    
    const compliant = compliantPersons;
    const partial = partialCompliantPersons;
    const nonCompliant = totalPersons - compliant - partial;
    const compliancePercent = totalEPPsEvaluable > 0 ? Math.round((totalEPPsDetected / totalEPPsEvaluable) * 100) : 0;
    
    console.log('📊 Stats (recalculados con personas evaluables):', { 
      totalPersonsDetected,
      totalPersons, 
      filteredPersons,
      compliant, 
      partial, 
      nonCompliant, 
      requiredEPPs: requiredEPPs.length,
      totalEPPsDetected,
      totalEPPsEvaluable,
      personsWithMissingParts,
      compliancePercent
    });
    
    // Analizar detecciones de EPP - MOSTRAR TODOS LOS DETECTADOS
    let totalDetections = 0;
    let detectedItems: string[] = [];
    let belowThresholdItems: string[] = [];
    
    if (evaluablePersons && evaluablePersons.length > 0) {
      console.log('🔎 Analizando personas evaluables:', evaluablePersons.length);
      evaluablePersons.forEach((person: any, idx: number) => {
        console.log(`👤 Persona evaluable ${idx}:`, person);
        person.BodyParts?.forEach((part: any) => {
          part.EquipmentDetections?.forEach((eq: any) => {
            console.log(`  🛡️ Equipo detectado: ${eq.Type} - ${eq.Confidence}%`);
            if (validateEPPForBodyPart(eq.Type, part.Name)) {
              if (eq.Confidence >= (MinConfidence || 75)) {
                totalDetections++;
                if (!detectedItems.includes(eq.Type)) {
                  detectedItems.push(eq.Type);
                }
              } else {
                // EPP detectado pero NO cumple umbral
                if (!belowThresholdItems.includes(eq.Type)) {
                  belowThresholdItems.push(eq.Type);
                }
              }
            }
          });
        });
      });
    }
    
    console.log('✅ Detecciones totales:', totalDetections);
    console.log('✅ Items detectados:', detectedItems);
    console.log('⚠️ Items bajo umbral:', belowThresholdItems);
    
    let summary = `**Resumen del Análisis de Seguridad Industrial**\n\n`;
    
    if (totalPersons === 0) {
      if (totalPersonsDetected > 0) {
        summary += `Se detectaron **${totalPersonsDetected} persona${totalPersonsDetected > 1 ? 's' : ''}** en la imagen, pero ninguna pudo ser evaluada completamente.\n\n`;
        summary += `**⚠️ Razón:** Para evaluar un EPP, primero debe detectarse la parte del cuerpo correspondiente. Por ejemplo:\n`;
        summary += `- Para evaluar **casco**, se requiere detección de **cabeza**\n`;
        summary += `- Para evaluar **guantes**, se requiere detección de **manos**\n`;
        summary += `- Para evaluar **gafas/mascarilla**, se requiere detección de **rostro**\n\n`;
        summary += `Aunque los EPP puedan ser visibles en la imagen, si las partes del cuerpo no son detectadas (personas muy lejos, parcialmente visibles, dentro de vehículos, o en ángulos difíciles), el sistema no puede validar el cumplimiento.\n\n`;
        summary += `**📸 Recomendaciones para mejorar la detección:**\n`;
        summary += `1. **Distancia:** Acérquese a 3-5 metros de las personas\n`;
        summary += `2. **Ángulo:** Tome la foto de frente o con ángulo de 45° máximo\n`;
        summary += `3. **Encuadre:** Asegúrese de capturar a las personas de cuerpo completo\n`;
        summary += `4. **Iluminación:** Evite contraluz y sombras fuertes\n`;
        summary += `5. **Enfoque:** Verifique que la imagen no esté borrosa\n`;
        summary += `6. **Obstrucciones:** Evite que vehículos, equipos u objetos tapen a las personas`;
      } else {
        summary += `No se detectaron personas en la imagen analizada. Verifique que la imagen contenga trabajadores y que la calidad sea adecuada para el análisis.`;
      }
    } else {
      // Información sobre personas detectadas vs evaluables
      if (filteredPersons > 0) {
        summary += `Se detectaron **${totalPersonsDetected} persona${totalPersonsDetected > 1 ? 's' : ''}** en la imagen. **${totalPersons} persona${totalPersons > 1 ? 's' : ''}** pudieron ser evaluadas completamente.\n\n`;
        summary += `⚠️ **${filteredPersons} persona${filteredPersons > 1 ? 's fueron excluidas' : ' fue excluida'}** del análisis por estar parcialmente visible${filteredPersons > 1 ? 's' : ''}, muy lejos de la cámara, o dentro de vehículos.\n\n`;
        summary += `**📸 Para incluir a estas personas en el análisis:**\n`;
        summary += `- Acérquese más (distancia recomendada: 3-5 metros)\n`;
        summary += `- Cambie el ángulo de la toma para capturar mejor las partes del cuerpo\n`;
        summary += `- Asegúrese de que las personas estén completamente visibles (no dentro de vehículos)\n`;
        summary += `- Evite tomas desde muy arriba o muy abajo\n\n`;
      } else {
        summary += `Se detectaron y evaluaron **${totalPersons} persona${totalPersons > 1 ? 's' : ''}** en el área de trabajo.\n\n`;
      }
      
      // Advertencia sobre partes no visibles en personas evaluables
      if (personsWithMissingParts > 0) {
        summary += `⚠️ **Importante - Evaluación Parcial**: En ${personsWithMissingParts} de las personas evaluables, algunas partes del cuerpo no son completamente visibles.\n\n`;
        summary += `**🔍 Cómo funciona la evaluación:**\n`;
        summary += `1. Primero se detecta la **parte del cuerpo** (cabeza, manos, rostro, etc.)\n`;
        summary += `2. Luego se busca el **EPP correspondiente** en esa parte\n`;
        summary += `3. Si la parte del cuerpo NO se detecta, el EPP **no puede evaluarse** aunque sea visible\n\n`;
        summary += `Por ejemplo: Si se ve un casco pero no se detecta la cabeza de la persona (por distancia, ángulo o obstrucción), ese casco no cuenta como cumplimiento. La evaluación se realiza únicamente sobre los EPP cuyas partes del cuerpo asociadas fueron detectadas.\n\n`;
        summary += `**📸 Recomendaciones para mejorar la detección:**\n`;
        summary += `- Tome fotos más cercanas (3-5 metros de distancia)\n`;
        summary += `- Use ángulos frontales o de 45° máximo\n`;
        summary += `- Capture a las personas de cuerpo completo\n`;
        summary += `- Evite obstrucciones (vehículos, equipos, objetos)\n\n`;
      }
      
      // Mostrar EPP detectados
      const itemNames: any = {
        'HEAD_COVER': 'Casco',
        'EYE_COVER': 'Gafas de seguridad',
        'HAND_COVER': 'Guantes',
        'FOOT_COVER': 'Calzado de seguridad',
        'FACE_COVER': 'Mascarilla',
        'EAR_COVER': 'Protección auditiva'
      };
      
      if (detectedItems.length > 0) {
        const detectedNames = detectedItems.map(item => itemNames[item] || item).join(', ');
        summary += `**✅ EPP que cumplen el umbral de ${MinConfidence}%**: ${detectedNames}\n\n`;
      }
      
      if (belowThresholdItems.length > 0) {
        const belowNames = belowThresholdItems.map(item => itemNames[item] || item).join(', ');
        summary += `**⚠️ EPP detectados pero bajo el umbral de ${MinConfidence}%**: ${belowNames}\n`;
        summary += `Estos elementos fueron detectados en la imagen pero con un nivel de confianza inferior al ${MinConfidence}% establecido por el usuario. Aunque están presentes físicamente, NO cumplen con el criterio de confianza requerido para considerarse válidos. \n\n`;
        summary += `**🔍 Recomendaciones para mejorar la detección:**\n`;
        summary += `- Acercarse más a las personas (3-5 metros)\n`;
        summary += `- Mejorar el ángulo de captura (frontal o 45° máximo)\n`;
        summary += `- Verificar buena iluminación y enfoque\n`;
        summary += `- Evitar obstrucciones que tapen los EPP\n\n`;
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
            imageUrl: resultData.data.imagePresignedUrl || `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${currentFile.name}`,
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
      console.log('Tipo de detección:', detectionType);

      const jsonPresignedUrl = responseData.presignedUrl;
      console.log('PresignedUrl encontrada:', jsonPresignedUrl);
      let finalData;

      // Si hay presignedUrl, obtener datos desde S3 (EPP detection)
      if (jsonPresignedUrl && typeof jsonPresignedUrl === 'string') {
        console.log('Obteniendo datos desde S3 con presignedUrl');
        const res = await axios.get(jsonPresignedUrl);
        finalData = res.data;
      } else {
        // Si no hay presignedUrl, usar responseData directamente (otros tipos de detección)
        console.log('Usando responseData directamente (sin presignedUrl)');
        finalData = responseData;
      }
      
      console.log('FinalData:', finalData);

      const analysisId = uuidv4();
      const imageUrlToUse = finalData.imagePresignedUrl || imageUrl;
      console.log('🔍 Creando analysisResult con epiItems:', epiItems);
      const analysisResult = { ...finalData, analysisId, timestamp: Date.now(), imageUrl: imageUrlToUse, selectedEPPs: epiItems, MinConfidence: minConfidence };
      console.log('🔍 analysisResult.selectedEPPs:', analysisResult.selectedEPPs);
      setResults(analysisResult);
      setAnalysisHistory(prev => [...prev, analysisResult]);
      incrementAnalysisCount();
      
      setProgress(70);

      // Guardar en DynamoDB (TODOS los tipos)
      console.log('💾 Intentando guardar análisis:', finalData.DetectionType);
      try {
        const user = await getCurrentUser();
        console.log('👤 Usuario obtenido:', user.username);
        await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
          userId: user.username,
          analysisData: analysisResult
        });
        console.log('✅ Análisis guardado:', finalData.DetectionType);
      } catch (dbError) {
        console.error('❌ Error guardando análisis:', dbError);
        console.error('❌ Detalles:', JSON.stringify(dbError, null, 2));
      }

      // Generar resumen IA (solo para ppe_detection)
      if (finalData.DetectionType === 'ppe_detection') {
        try {
          setProgress(85);
          const summaryResponse = await axios.post('https://n2vmezhgo7.execute-api.us-east-1.amazonaws.com/prod', {
            analysisResults: finalData,
            imageUrl: imageUrl,
            requiredEPPs: epiItems
          });
          const summaryData = summaryResponse.data;
          if (summaryData.summary) {
            const updatedResult = { ...analysisResult, aiSummary: summaryData.summary };
            setResults(updatedResult);
            
            // Actualizar en DynamoDB con resumen IA Bedrock
            try {
              const user = await getCurrentUser();
              await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
                userId: user.username,
                analysisData: updatedResult
              });
              console.log('✅ Análisis EPP actualizado con resumen IA Bedrock');
            } catch (dbError) {
              console.error('❌ Error actualizando análisis:', dbError);
            }
          }
        } catch (error) {
          console.error('Error con Bedrock, usando resumen local:', error);
          // Fallback: usar resumen local
          const localSummary = generateLocalAISummary(finalData);
          const updatedResult = { ...analysisResult, aiSummary: localSummary };
          setResults(updatedResult);
          
          // Actualizar en DynamoDB con resumen local
          try {
            const user = await getCurrentUser();
            await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
              userId: user.username,
              analysisData: updatedResult
            });
            console.log('✅ Análisis EPP actualizado con resumen local');
          } catch (dbError) {
            console.error('❌ Error actualizando análisis:', dbError);
          }
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
      const analysisId = uuidv4();
      const imageUrlToUse = res.data.imagePresignedUrl || `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${uploadFile.name}`;
      const analysisResult = { ...res.data, analysisId, timestamp: Date.now(), imageUrl: imageUrlToUse, selectedEPPs: uploadEpiItems, MinConfidence: uploadMinConfidence };
      setResults(analysisResult);
      setAnalysisHistory(prev => [...prev, analysisResult]);
      incrementAnalysisCount();
      
      setProgress(70);

      // Guardar en DynamoDB (TODOS los tipos)
      console.log('💾 Intentando guardar análisis (modo guiado):', res.data.DetectionType);
      try {
        const user = await getCurrentUser();
        console.log('👤 Usuario obtenido:', user.username);
        await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
          userId: user.username,
          analysisData: analysisResult
        });
        console.log('✅ Análisis guardado (modo guiado):', res.data.DetectionType);
      } catch (dbError) {
        console.error('❌ Error guardando análisis:', dbError);
      }

      // Generar resumen IA (solo EPP)
      if (res.data.DetectionType === 'ppe_detection') {
        try {
          setProgress(85);
          const summaryResponse = await axios.post('https://n2vmezhgo7.execute-api.us-east-1.amazonaws.com/prod', {
            analysisResults: res.data,
            imageUrl: `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${uploadFile.name}`,
            requiredEPPs: uploadEpiItems
          });
          const summaryData = summaryResponse.data;
          if (summaryData.summary) {
            const updatedResult = { ...analysisResult, aiSummary: summaryData.summary };
            setResults(updatedResult);
            
            // Actualizar en DynamoDB con resumen IA Bedrock
            try {
              const user = await getCurrentUser();
              await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
                userId: user.username,
                analysisData: updatedResult
              });
              console.log('✅ Análisis EPP actualizado con resumen IA Bedrock');
            } catch (dbError) {
              console.error('❌ Error actualizando análisis:', dbError);
            }
          }
        } catch (error) {
          console.error('Error con Bedrock, usando resumen local:', error);
          // Fallback: usar resumen local
          const localSummary = generateLocalAISummary(res.data);
          const updatedResult = { ...analysisResult, aiSummary: localSummary };
          setResults(updatedResult);
          
          // Actualizar en DynamoDB con resumen local
          try {
            const user = await getCurrentUser();
            await axios.post('https://fzxam9mfn1.execute-api.us-east-1.amazonaws.com/prod', {
              userId: user.username,
              analysisData: updatedResult
            });
            console.log('✅ Análisis EPP actualizado con resumen local');
          } catch (dbError) {
            console.error('❌ Error actualizando análisis:', dbError);
          }
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
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">⚠️ Modo Avanzado temporalmente deshabilitado</span>
            </div>
          </div>
          <GuidedAnalysisWizard key={wizardKey} onComplete={handleGuidedComplete} progress={progress} setProgress={setProgress} />
          
          {/* Resultados en el asistente */}
          {results && useGuidedMode && !showRealtimeDetection && !showVideoProcessor && (
            <div className="mt-8">
              <div className="mb-4 flex justify-end gap-3">
                {results.DetectionType === 'ppe_detection' && (
                  <button
                    onClick={() => {
                      const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Usuario';
                      const compliantCount = calculateCompliance(results, results.selectedEPPs || epiItems, results.MinConfidence || minConfidence);
                      generateAnalysisPDF({ analysisData: results, imageUrl, epiItems: results.selectedEPPs || epiItems, userName, compliantCount });
                    }}
                    className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
                  >
                    <span>📝</span>
                    <span>Descargar PDF</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const detectionTypeNames: any = {
                      'ppe_detection': 'Análisis EPP',
                      'face_detection': 'Detección de Rostros',
                      'label_detection': 'Detección de Objetos',
                      'text_detection': 'Detección de Texto'
                    };
                    const typeName = detectionTypeNames[results.DetectionType] || results.DetectionType;
                    const analysisInfo = `Reporte de error en análisis:\n- ID: ${results.analysisId || results.timestamp}\n- Tipo: ${typeName}\n- Fecha: ${new Date(results.timestamp).toLocaleString()}\n${results.DetectionType === 'ppe_detection' ? `- EPPs evaluados: ${(results.selectedEPPs || epiItems).map((e: string) => e.replace('_COVER', '')).join(', ')}\n` : ''}\nDescripción del problema:\n`;
                    setContactModalData({
                      initialTab: 'bug',
                      initialMessage: analysisInfo,
                      analysisId: results.analysisId || results.timestamp?.toString()
                    });
                    setShowContact(true);
                  }}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
                >
                  <span>🚨</span>
                  <span>Reportar Error</span>
                </button>
                <button
                  onClick={resetToStart}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
                >
                  <span>🆕</span>
                  <span>Nuevo Análisis</span>
                </button>
              </div>
              
              {/* Resumen del Análisis - TODOS los tipos */}
              <div data-analysis-summary className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <span>📊</span>
                    <span>Resumen del Análisis</span>
                  </h2>
                </div>
                <div className="p-6">
                  {results.analysisId && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 mb-1">🎯 ID de Análisis:</p>
                      <p className="text-sm font-mono text-blue-900">{results.analysisId}</p>
                    </div>
                  )}
                  
                  {results.DetectionType === 'ppe_detection' && (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{results.Summary?.totalPersons || 0}</p>
                        <p className="text-sm opacity-90">Personas Detectadas</p>
                      </div>
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{(() => {
                          const epps = results.selectedEPPs || epiItems || [];
                          console.log('🔍 [Resumen] EPPs:', epps, 'Umbral:', results.MinConfidence || minConfidence);
                          return calculateCompliance(results, epps, results.MinConfidence || minConfidence);
                        })()}</p>
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
                          
                          let maxConfidence = 0;
                          let detected = false;
                          results.ProtectiveEquipment?.forEach((person: any) => {
                            person.BodyParts?.forEach((part: any) => {
                              part.EquipmentDetections?.forEach((eq: any) => {
                                if (eq.Type === item) {
                                  detected = true;
                                  if (eq.Confidence > maxConfidence) maxConfidence = eq.Confidence;
                                }
                              });
                            });
                          });
                          
                          const meetsThreshold = maxConfidence >= minConfidence;
                          const badgeColor = !detected ? 'bg-red-500 text-white' : 
                                           meetsThreshold ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white';
                          const icon = !detected ? '❌' : meetsThreshold ? '✅' : '⚠️';
                          
                          return (
                            <div key={item} className={`flex items-center justify-between p-2 rounded font-bold ${badgeColor}`}>
                              <span>{itemName}</span>
                              <span>{icon} {detected ? `${maxConfidence.toFixed(0)}%` : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    </>
                  )}
                  
                  {/* Resumen para otros tipos de detección */}
                  {results.DetectionType === 'face_detection' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              {results.DetectionType === 'label_detection' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-4 text-white text-center">
                    <p className="text-3xl font-bold">{results.Summary?.totalLabels || 0}</p>
                    <p className="text-sm opacity-90">Objetos Detectados</p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                    <p className="text-3xl font-bold">{minConfidence}%</p>
                    <p className="text-sm opacity-90">Confianza Mínima</p>
                  </div>
                </div>
              )}
              
              {results.DetectionType === 'text_detection' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              {results.aiSummary && (
                <AISummary summary={results.aiSummary} />
              )}
              
              {results.imageUrl && (
                <ImageComparison 
                  results={results}
                  imageUrl={results.imageUrl}
                  minConfidence={minConfidence}
                  epiItems={results.selectedEPPs || epiItems}
                />
              )}
              
              {/* Botón Feedback al final del informe */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    setFeedbackAnalysisId(results.analysisId || results.timestamp?.toString() || Date.now().toString());
                    setFeedbackAnalysisType(results.DetectionType || 'ppe_detection');
                    setShowFeedback(true);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-8 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center space-x-2"
                >
                  <span>⭐</span>
                  <span>Dar Feedback sobre este Análisis</span>
                </button>
              </div>
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
                hasResults={results !== null}
                setProgress={setProgress}
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
                            <p className="text-3xl font-bold">{calculateCompliance(results, results.selectedEPPs || epiItems, results.MinConfidence || minConfidence)}</p>
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
                              
                              let maxConfidence = 0;
                              let detected = false;
                              results.ProtectiveEquipment?.forEach((person: any) => {
                                person.BodyParts?.forEach((part: any) => {
                                  part.EquipmentDetections?.forEach((eq: any) => {
                                    if (eq.Type === item) {
                                      detected = true;
                                      if (eq.Confidence > maxConfidence) maxConfidence = eq.Confidence;
                                    }
                                  });
                                });
                              });
                              
                              const meetsThreshold = maxConfidence >= minConfidence;
                              const badgeColor = !detected ? 'bg-red-500 text-white' : 
                                               meetsThreshold ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white';
                              const icon = !detected ? '❌' : meetsThreshold ? '✅' : '⚠️';
                              
                              return (
                                <div key={item} className={`flex items-center justify-between p-2 rounded font-bold ${badgeColor}`}>
                                  <span>{itemName}</span>
                                  <span>{icon} {detected ? `${maxConfidence.toFixed(0)}%` : ''}</span>
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
        return <Dashboard analysisHistory={analysisHistory} calculateCompliance={calculateCompliance} />;
      case 'admin':
        return userRole === 'admin' ? <AdminPanel /> : null;
      case 'history':
        // Si hay un resultado seleccionado, mostrar informe completo
        if (results && activeSection === 'history') {
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">📊 Informe de Análisis</h2>
                <div className="flex gap-3">
                  {results.DetectionType === 'ppe_detection' && (
                    <button
                      onClick={() => {
                        const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Usuario';
                        const compliantCount = calculateCompliance(results, results.selectedEPPs || epiItems, results.MinConfidence || 75);
                        generateAnalysisPDF({ analysisData: results, imageUrl: results.imageUrl, epiItems: results.selectedEPPs || epiItems, userName, compliantCount });
                      }}
                      className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-700 hover:to-pink-700 transition-all flex items-center space-x-2"
                    >
                      <span>📝</span>
                      <span>Descargar PDF</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const detectionTypeNames: any = {
                        'ppe_detection': 'Análisis EPP',
                        'face_detection': 'Detección de Rostros',
                        'label_detection': 'Detección de Objetos',
                        'text_detection': 'Detección de Texto'
                      };
                      const typeName = detectionTypeNames[results.DetectionType] || results.DetectionType;
                      const analysisInfo = `Reporte de error en análisis:\n- ID: ${results.analysisId || results.timestamp}\n- Tipo: ${typeName}\n- Fecha: ${new Date(results.timestamp).toLocaleString()}\n${results.DetectionType === 'ppe_detection' ? `- EPPs evaluados: ${(results.selectedEPPs || epiItems).map((e: string) => e.replace('_COVER', '')).join(', ')}\n` : ''}\nDescripción del problema:\n`;
                      setContactModalData({
                        initialTab: 'bug',
                        initialMessage: analysisInfo,
                        analysisId: results.analysisId || results.timestamp?.toString()
                      });
                      setShowContact(true);
                    }}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all flex items-center space-x-2"
                  >
                    <span>🚨</span>
                    <span>Reportar Error</span>
                  </button>
                  <button
                    onClick={() => setResults(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    ← Volver al Historial
                  </button>
                </div>
              </div>
              
              {/* Resumen del Análisis */}
              {results.DetectionType === 'ppe_detection' && (
                <div data-analysis-summary className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📊</span>
                      <span>Resumen del Análisis</span>
                    </h2>
                  </div>
                  <div className="p-6">
                    {results.analysisId && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-700 mb-1">🎯 ID de Análisis:</p>
                        <p className="text-sm font-mono text-blue-900">{results.analysisId}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{results.Summary?.totalPersons || 0}</p>
                        <p className="text-sm opacity-90">Personas Detectadas</p>
                      </div>
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{calculateCompliance(results, results.selectedEPPs || epiItems, results.MinConfidence || 75)}</p>
                        <p className="text-sm opacity-90">Cumplientes</p>
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                        <p className="text-3xl font-bold">{results.MinConfidence}%</p>
                        <p className="text-sm opacity-90">Confianza Mínima</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      <p>📅 Fecha: {new Date(results.timestamp).toLocaleString()}</p>
                    </div>
                    
                    {/* EPPs Evaluados */}
                    {results.selectedEPPs && results.selectedEPPs.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">EPPs Evaluados en este Análisis:</h4>
                        <div className="flex flex-wrap gap-2">
                          {results.selectedEPPs.map((epp: string) => {
                            const eppNames: any = {
                              'HEAD_COVER': 'Casco',
                              'EYE_COVER': 'Gafas de seguridad',
                              'HAND_COVER': 'Guantes',
                              'FOOT_COVER': 'Calzado de seguridad',
                              'FACE_COVER': 'Mascarilla',
                              'EAR_COVER': 'Protección auditiva'
                            };
                            return (
                              <span key={epp} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
                                {eppNames[epp] || epp}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Resumen Inteligente */}
              {results.aiSummary && (
                <AISummary summary={results.aiSummary} />
              )}
              
              {/* Comparación de Imágenes */}
              {results.imageUrl && (
                <ImageComparison 
                  results={results}
                  imageUrl={results.imageUrl}
                  minConfidence={results.MinConfidence || 75}
                  epiItems={results.selectedEPPs || epiItems}
                />
              )}
              
              {/* Botón Feedback al final del informe */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    setFeedbackAnalysisId(results.analysisId || results.timestamp?.toString() || Date.now().toString());
                    setFeedbackAnalysisType(results.DetectionType || 'ppe_detection');
                    setShowFeedback(true);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-8 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center space-x-2"
                >
                  <span>⭐</span>
                  <span>Dar Feedback sobre este Análisis</span>
                </button>
              </div>
            </div>
          );
        }
        
        // Vista de lista de historial
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📋 Historial de Análisis</h2>
              {loadingHistory && analysisHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Cargando historial...</p>
                </div>
              ) : analysisHistory.length > 0 ? (
                <div className="space-y-4">
                  {analysisHistory.map((analysis, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
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
                          {analysis.analysisId && (
                            <p className="text-xs text-gray-400 font-mono mt-1">
                              ID: {analysis.analysisId}
                            </p>
                          )}
                          {analysis.DetectionType === 'ppe_detection' && analysis.selectedEPPs && analysis.selectedEPPs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {analysis.selectedEPPs.map((epp: string) => {
                                const eppNames: any = {
                                  'HEAD_COVER': 'Casco',
                                  'EYE_COVER': 'Gafas',
                                  'HAND_COVER': 'Guantes',
                                  'FOOT_COVER': 'Calzado',
                                  'FACE_COVER': 'Mascarilla',
                                  'EAR_COVER': 'Orejeras'
                                };
                                return (
                                  <span key={epp} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {eppNames[epp] || epp}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                            {analysis.MinConfidence || 75}% confianza
                          </span>
                          {analysis.Summary && analysis.DetectionType === 'ppe_detection' && (
                            <p className="text-sm text-gray-600">
                              {calculateCompliance(analysis, analysis.selectedEPPs || [], analysis.MinConfidence || 75)}/{analysis.Summary.totalPersons} cumplientes
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Resumen de IA si existe */}
                      {analysis.aiSummary && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs font-semibold text-purple-700 mb-1">🤖 Resumen IA:</p>
                          <p className="text-sm text-gray-700 line-clamp-3">{analysis.aiSummary}</p>
                        </div>
                      )}
                      
                      {/* Botones de acción */}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            // Cargar análisis completo en vista de historial
                            setResults(analysis);
                            setImageUrl(analysis.imageUrl || '');
                            setMinConfidence(analysis.MinConfidence || 75);
                            // Extraer epiItems del análisis si existen
                            if (analysis.ProtectiveEquipment && analysis.ProtectiveEquipment.length > 0) {
                              const detectedTypes = new Set<string>();
                              analysis.ProtectiveEquipment.forEach((person: any) => {
                                person.BodyParts?.forEach((part: any) => {
                                  part.EquipmentDetections?.forEach((eq: any) => {
                                    detectedTypes.add(eq.Type);
                                  });
                                });
                              });
                              setEpiItems(Array.from(detectedTypes));
                            }
                            // Mantener en sección historial
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 100);
                          }}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                        >
                          📊 Ver Informe Completo
                        </button>
                        <button
                          onClick={() => {
                            setAnalysisToDelete(analysis);
                            setShowDeleteConfirm(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center space-x-1"
                        >
                          <span>🗑️</span>
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {hasMoreHistory && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => fetchHistory(true)}
                        disabled={loadingHistory}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                      >
                        {loadingHistory ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Cargando...</span>
                          </div>
                        ) : (
                          <span>🔄 Cargar más</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500">No hay análisis en el historial</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Si está mostrando FAQ, renderizar solo FAQ
  if (showFAQ) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
          <ModernHeader 
            activeSection="faq" 
            onSectionChange={() => setShowFAQ(false)}
            onGuidedMode={() => {
              setShowFAQ(false);
              resetToStart();
            }}
            userMenu={<UserMenu onEditProfile={() => setShowProfileModal(true)} onContact={() => setShowContact(true)} />}
          />
          <FAQ />
          <button
            onClick={() => setShowFAQ(false)}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center space-x-2 z-50"
          >
            <span>←</span>
            <span>Volver</span>
          </button>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <ModernHeader 
        activeSection={activeSection}
        isAdmin={userRole === 'admin'}
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
        userMenu={<UserMenu onEditProfile={() => setShowProfileModal(true)} onContact={() => setShowContact(true)} />}
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
                    <p className="text-2xl font-bold">{calculateCompliance(results, results.selectedEPPs || [], results.MinConfidence || 75)}</p>
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
      
      {showProfileModal && currentUserId && (
        <UserProfileModal
          userId={currentUserId}
          initialData={userProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={(profile) => {
            setUserProfile(profile);
            setShowProfileModal(false);
          }}
        />
      )}
      
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar Análisis"
        message="¿Estás seguro de que deseas eliminar este análisis? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={async () => {
          try {
            const user = await getCurrentUser();
            await axios.delete(`https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod/delete?userId=${user.username}&timestamp=${analysisToDelete.timestamp}`);
            toast.success('Análisis eliminado exitosamente');
            setShowDeleteConfirm(false);
            setAnalysisToDelete(null);
            // Recargar historial
            fetchAnalysisData();
          } catch (error) {
            console.error('Error eliminando análisis:', error);
            toast.error('Error al eliminar el análisis');
            setShowDeleteConfirm(false);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setAnalysisToDelete(null);
        }}
      />
      
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
              <button
                onClick={() => setShowFAQ(true)}
                className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
              >
                <span>❓</span>
                <span>Preguntas Frecuentes</span>
              </button>
              <button
                onClick={() => setShowContact(true)}
                className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
              >
                <span>✉️</span>
                <span>Contacto</span>
              </button>
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
      
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        analysisId={feedbackAnalysisId}
        userName={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Usuario'}
        analysisType={feedbackAnalysisType}
      />
      
      {showContact && (
        <ContactModal 
          onClose={() => {
            setShowContact(false);
            setContactModalData({});
          }} 
          userProfile={userProfile}
          initialTab={contactModalData.initialTab}
          initialMessage={contactModalData.initialMessage}
          analysisId={contactModalData.analysisId}
        />
      )}
      </div>
    </AuthWrapper>
  );
};

export default App;