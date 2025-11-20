import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { getCurrentUser } from 'aws-amplify/auth';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface EPPStatus {
  HEAD_COVER: 'detectado' | 'no_detectado' | 'no_evaluable' | 'analizando' | 'disabled';
  HAND_COVER: 'detectado' | 'no_detectado' | 'no_evaluable' | 'analizando' | 'disabled';
  FACE_COVER: 'detectado' | 'no_detectado' | 'no_evaluable' | 'analizando' | 'disabled';
  EYE_COVER: 'detectado' | 'no_detectado' | 'no_evaluable' | 'analizando' | 'disabled';
  FOOT_COVER: 'detectado' | 'no_detectado' | 'no_evaluable' | 'analizando' | 'disabled';
  EAR_COVER: 'detectado' | 'no_detectado' | 'no_evaluable' | 'analizando' | 'disabled';
}

interface RealtimeDetectionProps {
  onClose: () => void;
  epiItems: string[];
  minConfidence: number;
}

const RealtimeDetection: React.FC<RealtimeDetectionProps> = ({ onClose, epiItems, minConfidence }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [enabledEPPs, setEnabledEPPs] = useState<Set<keyof EPPStatus>>(new Set(['HEAD_COVER', 'HAND_COVER', 'FACE_COVER'] as (keyof EPPStatus)[]));
  const [eppStatus, setEppStatus] = useState<EPPStatus>({
    HEAD_COVER: 'disabled',
    HAND_COVER: 'disabled', 
    FACE_COVER: 'disabled',
    EYE_COVER: 'disabled',
    FOOT_COVER: 'disabled',
    EAR_COVER: 'disabled'
  });
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analysisInProgressRef = useRef(false);
  
  // Estados para alertas multicanal
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEPPs, setAlertEPPs] = useState<Set<keyof EPPStatus>>(new Set(['HEAD_COVER', 'HAND_COVER'] as (keyof EPPStatus)[]));
  const [lastAlertTime, setLastAlertTime] = useState<Date | null>(null);
  const [alertCooldown] = useState(5); // 5 minutos
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [supervisors, setSupervisors] = useState<Array<{username: string, email: string, name: string, role: string}>>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [alertTypes, setAlertTypes] = useState({
    push: false,
    email: false,
    sms: false
  });
  const { isSupported: isPushSupported, isSubscribed, subscribeToPush, unsubscribeFromPush, loading: pushLoading } = usePushNotifications();

  const eppNames = {
    HEAD_COVER: 'Casco',
    HAND_COVER: 'Guantes',
    FACE_COVER: 'Mascarilla',
    EYE_COVER: 'Gafas',
    FOOT_COVER: 'Calzado',
    EAR_COVER: 'Orejeras'
  };

  // Detección de movimiento
  const detectMotion = () => {
    if (!webcamRef.current?.video || !canvasRef.current) return false;
    
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (lastFrameRef.current) {
      let diff = 0;
      for (let i = 0; i < currentFrame.data.length; i += 4) {
        const r = Math.abs(currentFrame.data[i] - lastFrameRef.current.data[i]);
        const g = Math.abs(currentFrame.data[i + 1] - lastFrameRef.current.data[i + 1]);
        const b = Math.abs(currentFrame.data[i + 2] - lastFrameRef.current.data[i + 2]);
        diff += (r + g + b) / 3;
      }
      const avgDiff = diff / (canvas.width * canvas.height);
      const hasMotion = avgDiff > 10;
      
      if (hasMotion && !analysisInProgressRef.current) {
        console.log(`🎯 Movimiento DETECTADO - Diferencia promedio: ${avgDiff.toFixed(2)}`);
        analysisInProgressRef.current = true;
        captureAndAnalyze();
      }
      
      lastFrameRef.current = currentFrame;
      return hasMotion;
    }
    
    lastFrameRef.current = currentFrame;
    return false;
  };

  // Capturar y analizar fotograma
  const captureAndAnalyze = async () => {
    if (!webcamRef.current || !isDetecting || isAnalyzing) {
      console.log('❌ Análisis bloqueado - ya está analizando');
      return;
    }
    
    const enabledEPPsArray = Array.from(enabledEPPs);
    if (enabledEPPsArray.length === 0) return;

    setIsAnalyzing(true);
    const startTime = Date.now();
    console.log('🎯 Iniciando análisis EPP en tiempo real...');
    console.log('📋 EPPs habilitados:', enabledEPPsArray);

    // Marcar como analizando solo una vez
    setEppStatus(prev => {
      const newStatus = { ...prev };
      enabledEPPsArray.forEach(epp => {
        newStatus[epp] = 'analizando';
      });
      return newStatus;
    });

    try {
      const imageSrc = webcamRef.current.getScreenshot({
        width: 320,
        height: 240
      });
      if (!imageSrc) return;

      // Comprimir imagen para mayor velocidad
      const img = new Image();
      img.src = imageSrc;
      await new Promise(resolve => img.onload = resolve);
      
      const compressCanvas = document.createElement('canvas');
      const compressCtx = compressCanvas.getContext('2d');
      compressCanvas.width = 320;
      compressCanvas.height = 240;
      compressCtx?.drawImage(img, 0, 0, 320, 240);
      
      const compressedDataUrl = compressCanvas.toDataURL('image/jpeg', 0.5);
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const filename = `realtime_frame_${timestamp}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      const uploadRes = await axios.get('https://kmekzxexq5.execute-api.us-east-1.amazonaws.com/prod/upload', {
        params: { filename }
      });
      
      await axios.put(uploadRes.data.url, file, {
        headers: { 'Content-Type': 'image/jpeg' }
      });

      const analyzeRes = await axios.post('https://tf52bbq6o6.execute-api.us-east-1.amazonaws.com/prod/analyze', {
        bucket: 'rekognition-gcontreras',
        filename: `input/${filename}`,
        detection_type: 'ppe_detection',
        min_confidence: minConfidence,
        epi_items: enabledEPPsArray
      });

      let responseData = analyzeRes.data;
      if (typeof responseData === 'string') responseData = JSON.parse(responseData);
      if (responseData.body) responseData = JSON.parse(responseData.body);

      const resultsRes = await axios.get(responseData.presignedUrl);
      const analysisData = resultsRes.data;
      
      console.log('📊 Datos de análisis recibidos:', analysisData);

      const newStatus = { ...eppStatus };
      enabledEPPsArray.forEach(epp => {
        const result = evaluateEPP(analysisData, epp);
        console.log(`🔍 ${epp}: ${result}`);
        newStatus[epp] = result;
      });
      
      setEppStatus(newStatus);
      setLastAnalysis(new Date());
      const totalTime = Date.now() - startTime;
      console.log(`✅ Estado EPP actualizado en ${totalTime}ms:`, newStatus);
      
      // Verificar si hay EPPs faltantes para alertas
      await checkAndSendAlert(newStatus, enabledEPPsArray);
      
      // Esperar 10 segundos antes de permitir nuevo análisis
      setIsAnalyzing(false);
      analysisTimeoutRef.current = setTimeout(() => {
        analysisInProgressRef.current = false;
        console.log('✅ Sistema listo para nuevo análisis');
      }, 10000);
      
    } catch (error) {
      console.error('Error en análisis:', error);
      setEppStatus(prev => {
        const newStatus = { ...prev };
        enabledEPPsArray.forEach(epp => {
          newStatus[epp] = 'no_evaluable';
        });
        return newStatus;
      });
      
      // En caso de error, también esperar 10 segundos
      setIsAnalyzing(false);
      analysisTimeoutRef.current = setTimeout(() => {
        analysisInProgressRef.current = false;
        console.log('✅ Sistema listo para nuevo análisis (después de error)');
      }, 10000);
    }
  };

  const evaluateEPP = (analysisData: any, eppType: keyof EPPStatus): 'detectado' | 'no_detectado' | 'no_evaluable' => {
    if (!analysisData.ProtectiveEquipment || analysisData.ProtectiveEquipment.length === 0) {
      return 'no_evaluable';
    }

    let detected = false;
    let evaluable = false;

    analysisData.ProtectiveEquipment.forEach((person: any) => {
      person.BodyParts?.forEach((part: any) => {
        const requiredParts = {
          HEAD_COVER: ['HEAD'],
          FACE_COVER: ['FACE'],
          EYE_COVER: ['FACE'],
          HAND_COVER: ['LEFT_HAND', 'RIGHT_HAND'],
          FOOT_COVER: ['FOOT'],
          EAR_COVER: ['HEAD']
        };
        
        if (requiredParts[eppType]?.includes(part.Name)) {
          evaluable = true;
          
          part.EquipmentDetections?.forEach((eq: any) => {
            if (eq.Type === eppType && eq.Confidence >= minConfidence) {
              detected = true;
            }
          });
        }
      });
    });

    if (!evaluable) return 'no_evaluable';
    return detected ? 'detectado' : 'no_detectado';
  };

  // Función para verificar y enviar alertas SMS
  const checkAndSendAlert = async (currentStatus: EPPStatus, enabledEPPsArray: string[]) => {
    if (!alertsEnabled || !selectedSupervisor) return;
    
    // Verificar cooldown
    if (lastAlertTime) {
      const timeSinceLastAlert = (Date.now() - lastAlertTime.getTime()) / (1000 * 60);
      if (timeSinceLastAlert < alertCooldown) {
        console.log(`⏰ Cooldown activo: ${Math.ceil(alertCooldown - timeSinceLastAlert)} min restantes`);
        return;
      }
    }
    
    // Encontrar EPPs faltantes que están en la lista de alertas
    const missingEPPs = enabledEPPsArray.filter(epp => {
      const eppKey = epp as keyof EPPStatus;
      return alertEPPs.has(eppKey) && currentStatus[eppKey] === 'no_detectado';
    });
    
    if (missingEPPs.length === 0) return;
    
    try {
      const user = await getCurrentUser();
      const response = await axios.post('https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod/send-alert', {
        supervisorUsername: selectedSupervisor,
        missingEPPs,
        timestamp: Date.now(),
        workerUserId: user.username,
        alertTypes
      });
      
      console.log('✅ Alerta enviada exitosamente');
      
      // Mostrar notificación de éxito
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Alerta Enviada', {
          body: `Alerta enviada a supervisor: ${selectedSupervisor}`,
          icon: '/favicon.ico'
        });
      }
      
      setShowToast({message: `Alerta enviada: ${missingEPPs.map(epp => eppNames[epp as keyof typeof eppNames]).join(', ')} no detectado`, type: 'info'});
      setTimeout(() => setShowToast(null), 4000);
      setLastAlertTime(new Date());
    } catch (error) {
      console.error('❌ Error enviando alerta:', error);
      setShowToast({message: 'Error enviando alerta', type: 'error'});
      setTimeout(() => setShowToast(null), 3000);
    }
  };
  
  // Guardar configuración de alertas en DynamoDB
  const saveAlertConfig = async () => {
    if (!selectedSupervisor) return;
    
    try {
      const user = await getCurrentUser();
      await axios.put('https://rg38nq36tb.execute-api.us-east-1.amazonaws.com/prod', {
        userId: user.username,
        enabled: alertsEnabled,
        enabledEPPs: Array.from(alertEPPs),
        cooldownMinutes: alertCooldown,
        selectedSupervisor,
        alertTypes
      });
      console.log('💾 Configuración de alertas guardada');
      setShowToast({message: 'Configuración de alertas guardada exitosamente', type: 'success'});
      setTimeout(() => setShowToast(null), 3000);
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      setShowToast({message: 'Error guardando configuración de alertas', type: 'error'});
      setTimeout(() => setShowToast(null), 3000);
    }
  };
  
  const toggleAlertEPP = (epp: keyof EPPStatus) => {
    setAlertEPPs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(epp)) {
        newSet.delete(epp);
      } else {
        newSet.add(epp);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (isDetecting && !isAnalyzing) {
      setEppStatus(prev => {
        const newStatus = { ...prev };
        Object.keys(eppNames).forEach(epp => {
          const eppKey = epp as keyof EPPStatus;
          // Solo resetear a inicial si no tiene resultados previos
          if (prev[eppKey] === 'disabled' || (prev[eppKey] === 'no_evaluable' && !lastAnalysis)) {
            newStatus[eppKey] = enabledEPPs.has(eppKey) ? 'no_evaluable' : 'disabled';
          }
        });
        return newStatus;
      });

      const motionInterval = setInterval(detectMotion, 100);
      
      // Ya no necesitamos intervalo, el análisis se dispara desde detectMotion

      return () => {
        clearInterval(motionInterval);
        if (analysisTimeoutRef.current) {
          clearTimeout(analysisTimeoutRef.current);
        }
      };
    }
  }, [isDetecting, enabledEPPs, isAnalyzing, lastAnalysis]);

  const handleStart = () => {
    setIsDetecting(true);
    setLastAnalysis(null);
  };

  const handleStop = () => {
    setIsDetecting(false);
    setIsAnalyzing(false);
    analysisInProgressRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    if (webcamRef.current?.stream) {
      webcamRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleEPP = (epp: keyof EPPStatus) => {
    setEnabledEPPs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(epp)) {
        newSet.delete(epp);
      } else {
        newSet.add(epp);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: EPPStatus[keyof EPPStatus]) => {
    switch (status) {
      case 'detectado': return 'bg-green-500 text-white';
      case 'no_detectado': return 'bg-red-500 text-white';
      case 'no_evaluable': return 'bg-gray-500 text-white';
      case 'analizando': return 'bg-blue-500 text-white animate-pulse';
      case 'disabled': return 'bg-gray-200 text-gray-500';
      default: return 'bg-gray-200 text-gray-500';
    }
  };

  const getStatusIcon = (status: EPPStatus[keyof EPPStatus]) => {
    switch (status) {
      case 'detectado': return '✅';
      case 'no_detectado': return '❌';
      case 'no_evaluable': return '❓';
      case 'analizando': return '🔄';
      case 'disabled': return '⚪';
      default: return '⚪';
    }
  };

  const getStatusText = (status: EPPStatus[keyof EPPStatus]) => {
    switch (status) {
      case 'detectado': return 'Detectado';
      case 'no_detectado': return 'No Detectado';
      case 'no_evaluable': return 'No Evaluable';
      case 'analizando': return 'Analizando...';
      case 'disabled': return 'Deshabilitado';
      default: return 'Deshabilitado';
    }
  };

  // Cargar supervisores al montar el componente
  React.useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        const response = await axios.get('https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod/supervisors');
        setSupervisors(response.data.supervisors || []);
      } catch (error) {
        console.error('Error cargando supervisores:', error);
      }
    };
    
    fetchSupervisors();
    
    return () => {
      // Cleanup: detener cámara al desmontar componente
      if (webcamRef.current?.stream) {
        webcamRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>🎥</span>
            <span>Detección en Tiempo Real</span>
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">×</button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full"
                  videoConstraints={{ facingMode }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex space-x-3">
                  {!isDetecting ? (
                    <button
                      onClick={handleStart}
                      disabled={enabledEPPs.size === 0}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enabledEPPs.size === 0 ? '⚠️ Selecciona EPPs' : '▶ Iniciar Monitoreo EPP'}
                    </button>
                  ) : (
                    <button
                      onClick={handleStop}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700"
                    >
                      ⏹ Detener Monitoreo
                    </button>
                  )}
                  <button
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="bg-gray-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-700 flex items-center justify-center"
                    title="Cambiar cámara"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">🛡️ Panel de Control EPP</h3>
                <div className="space-y-2">
                  {Object.entries(eppNames).map(([epp, name]) => {
                    const eppKey = epp as keyof EPPStatus;
                    const isEnabled = enabledEPPs.has(eppKey);
                    const status = eppStatus[eppKey];
                    
                    return (
                      <div key={epp} className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-500 ${
                        status === 'detectado' ? 'bg-green-100 border-green-400 shadow-lg shadow-green-200' :
                        status === 'no_detectado' ? 'bg-red-100 border-red-400 shadow-lg shadow-red-200' :
                        status === 'analizando' ? 'bg-blue-100 border-blue-400 animate-pulse' :
                        status === 'no_evaluable' ? 'bg-yellow-100 border-yellow-400' :
                        'bg-white hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <span className="text-base">
                            {epp === 'HEAD_COVER' ? '🪪' : epp === 'EYE_COVER' ? '🥽' : epp === 'HAND_COVER' ? '🧤' : epp === 'FOOT_COVER' ? '🥾' : epp === 'FACE_COVER' ? '😷' : '🎧'}
                          </span>
                          <span className={`text-xs font-medium transition-colors ${
                            status === 'detectado' ? 'text-green-800 font-bold' :
                            status === 'no_detectado' ? 'text-red-800 font-bold' :
                            status === 'analizando' ? 'text-blue-800 font-bold' :
                            status === 'no_evaluable' ? 'text-yellow-800 font-bold' :
                            'text-gray-700'
                          }`}>{name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                          </div>
                          <button
                            onClick={() => toggleEPP(eppKey)}
                            disabled={isDetecting}
                            className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                              isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                            } disabled:opacity-50`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">📊 Estado del Sistema</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <span className={`text-sm font-bold ${isAnalyzing ? 'text-blue-600' : 'text-gray-400'}`}>
                      {isAnalyzing ? '🔄 Analizando' : '⚪ Esperando'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Último análisis:</span>
                    <span className="text-xs text-gray-500">
                      {lastAnalysis ? lastAnalysis.toLocaleTimeString() : 'Ninguno'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <span className={`text-sm font-bold ${
                      isAnalyzing ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {isAnalyzing ? '🔄 Analizando...' : '✅ Listo'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                    🎯 Detecta movimiento → Analiza → Espera 10s
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-3 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center space-x-2">
                    <span>📱</span>
                    <span>Envío de Alerta</span>
                  </h3>
                  <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                      alertsEnabled ? 'bg-orange-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      alertsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                
                {alertsEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        📢 Tipos de alerta:
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alertTypes.push}
                            onChange={(e) => setAlertTypes(prev => ({...prev, push: e.target.checked}))}
                            disabled={!isPushSupported || !isSubscribed}
                            className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                          />
                          <span className="text-xs text-gray-700">🔔 Push Notification</span>
                          {isPushSupported ? (
                            isSubscribed ? (
                              <span className="text-xs text-green-600 font-medium">✅ Activo</span>
                            ) : (
                              <button
                                onClick={subscribeToPush}
                                disabled={pushLoading}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {pushLoading ? '⏳ Activando...' : '🔔 Activar Push'}
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-red-600">❌ No soportado</span>
                          )}
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alertTypes.email}
                            onChange={(e) => setAlertTypes(prev => ({...prev, email: e.target.checked}))}
                            className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-xs text-gray-700">📧 Email</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alertTypes.sms}
                            onChange={(e) => setAlertTypes(prev => ({...prev, sms: e.target.checked}))}
                            className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-xs text-gray-700">📱 SMS</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        🚨 EPPs para alertar:
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(eppNames).map(([epp, name]) => {
                          const eppKey = epp as keyof EPPStatus;
                          const isAlertEnabled = alertEPPs.has(eppKey);
                          
                          return (
                            <label key={epp} className="flex items-center space-x-1 cursor-pointer p-1 rounded hover:bg-orange-100">
                              <input
                                type="checkbox"
                                checked={isAlertEnabled}
                                onChange={() => toggleAlertEPP(eppKey)}
                                className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <span className="text-xs text-gray-700">{name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        👮 Supervisor a notificar:
                      </label>
                      {supervisors.length > 0 ? (
                        <select
                          value={selectedSupervisor}
                          onChange={(e) => setSelectedSupervisor(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Seleccionar supervisor...</option>
                          {supervisors.map((supervisor) => (
                            <option key={supervisor.username} value={supervisor.username}>
                              {supervisor.role === 'admin' ? '👑' : '👮'} {supervisor.name || supervisor.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No hay supervisores disponibles</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Cooldown: {alertCooldown} min</span>
                      <button
                        onClick={saveAlertConfig}
                        disabled={!selectedSupervisor || (!alertTypes.push && !alertTypes.email && !alertTypes.sms)}
                        className="px-2 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        💾 Guardar
                      </button>
                    </div>
                    
                    {lastAlertTime && (
                      <div className="text-xs text-gray-500 pt-1 border-t border-orange-200">
                        📱 Última alerta: {lastAlertTime.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}
                
                {!alertsEnabled && (
                  <p className="text-xs text-gray-600">
                    Activa las alertas para notificar al supervisor cuando no se detecten EPPs críticos
                  </p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <span>🧠</span>
                  <span>Detección EPP con IA</span>
                </h3>
                <div className="text-xs text-gray-700 space-y-2">
                  <p><strong>Cómo funciona:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Detecta movimiento en tiempo real</li>
                    <li>Análisis inmediato al detectar cambios</li>
                    <li>Espera 10 segundos entre análisis</li>
                  </ul>
                  <p className="mt-2 text-blue-800 font-medium">
                    🚀 Misma precisión que el análisis de imágenes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Toast Notification */}
        {showToast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            showToast.type === 'success' ? 'bg-green-600' :
            showToast.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            <div className="flex items-center space-x-2">
              <span>
                {showToast.type === 'success' ? '✅' :
                 showToast.type === 'error' ? '❌' : '📱'}
              </span>
              <span>{showToast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeDetection;
