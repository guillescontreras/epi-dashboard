import React, { useState } from 'react';
import DragDropUpload from './DragDropUpload';
import EPPDetectionInfo from './EPPDetectionInfo';

interface GuidedAnalysisWizardProps {
  onComplete: (config: {
    mode: 'image' | 'realtime';
    detectionType: string;
    file?: File;
    minConfidence: number;
    epiItems: string[];
  }) => void;
  resetStep?: boolean;
  progress?: number;
  setProgress?: (progress: number) => void;
}

const GuidedAnalysisWizard: React.FC<GuidedAnalysisWizardProps> = ({ onComplete, resetStep, progress = 0, setProgress = () => {} }) => {
  const [step, setStep] = useState(1);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  
  React.useEffect(() => {
    if (resetStep) {
      setStep(1);
      setMode(null);
      setDetectionType('');
      setFile(null);
    }
  }, [resetStep]);
  const [mode, setMode] = useState<'image' | 'realtime' | null>(null);
  const [detectionType, setDetectionType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [minConfidence, setMinConfidence] = useState(75);
  const [epiItems, setEpiItems] = useState<string[]>(['HEAD_COVER', 'EYE_COVER', 'HAND_COVER', 'FOOT_COVER', 'FACE_COVER', 'EAR_COVER']);

  const imageDetectionTypes = [
    { value: 'ppe_detection', label: 'Detección de EPP', icon: '🦺', desc: 'Identifica elementos de protección personal' },
    { value: 'face_detection', label: 'Análisis Facial', icon: '👤', desc: 'Detecta rostros y características' },
    { value: 'label_detection', label: 'Detección de Objetos', icon: '🏷️', desc: 'Identifica objetos en la imagen' },
    { value: 'text_detection', label: 'Reconocimiento de Texto', icon: '📝', desc: 'Extrae texto de la imagen' }
  ];

  const realtimeDetectionTypes: Array<{value: string; label: string; icon: string; desc: string; disabled?: boolean}> = [
    { value: 'realtime_ppe', label: 'Detección de EPPs', icon: '🦺', desc: 'Detecta EPPs con Rekognition cada 10s' },
    { value: 'realtime_objects', label: 'Detección de Objetos', icon: '🏷️', desc: 'Próximamente disponible', disabled: true }
  ];

  const handleModeSelect = (selectedMode: 'image' | 'realtime') => {
    setMode(selectedMode);
    setStep(2);
  };

  const handleDetectionTypeSelect = (type: string) => {
    setDetectionType(type);
    // Si es detección EPP en tiempo real, ir directo a la cámara
    if (type === 'realtime_ppe') {
      onComplete({
        mode: 'realtime',
        detectionType: 'realtime_ppe',
        minConfidence: 75,
        epiItems: ['HEAD_COVER', 'EYE_COVER']
      });
    } else {
      setStep(3);
    }
  };

  const handleEpiItemChange = (item: string) => {
    setEpiItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleComplete = () => {
    if (mode === 'realtime') {
      onComplete({
        mode: 'realtime',
        detectionType: file ? 'realtime_video' : 'realtime_detection',
        file: file || undefined,
        minConfidence,
        epiItems
      });
    } else if (file) {
      onComplete({
        mode: 'image',
        detectionType,
        file,
        minConfidence,
        epiItems
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Modo</span>
          <span>Tipo</span>
          <span>Config</span>
          <span>Acción</span>
        </div>
      </div>

      {/* Step 1: Select Mode */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona el Modo de Análisis</h2>
            <p className="text-gray-600">¿Cómo deseas analizar?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleModeSelect('image')}
              className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-200 text-left group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Análisis de Imagen</h3>
              <p className="text-gray-600 mb-4">Sube una imagen para análisis detallado de EPPs, rostros, objetos y texto</p>
              <div className="flex items-center text-blue-600 font-semibold">
                <span>Seleccionar</span>
                <span className="ml-2">→</span>
              </div>
            </button>

            <button
              onClick={() => handleModeSelect('realtime')}
              className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-pink-500 hover:shadow-xl transition-all duration-200 text-left group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📹</span>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900">Tiempo Real</h3>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded">BETA</span>
              </div>
              <p className="text-gray-600 mb-4">Usa tu cámara o sube un video para detección instantánea</p>
              <div className="flex items-center text-pink-600 font-semibold">
                <span>Seleccionar</span>
                <span className="ml-2">→</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Detection Type */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tipo de Análisis</h2>
            <p className="text-gray-600">¿Qué deseas detectar?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(mode === 'image' ? imageDetectionTypes : realtimeDetectionTypes).map((type: any) => (
              <button
                key={type.value}
                onClick={() => !type.disabled && handleDetectionTypeSelect(type.value)}
                disabled={type.disabled || false}
                className={`bg-white rounded-xl p-6 border-2 transition-all duration-200 text-left ${
                  type.disabled 
                    ? 'border-gray-200 opacity-60 cursor-not-allowed' 
                    : 'border-gray-200 hover:border-blue-500 hover:shadow-lg group'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{type.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
                    <p className="text-sm text-gray-600">{type.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Volver
          </button>
        </div>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuración</h2>
            <p className="text-gray-600">Ajusta los parámetros de detección</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">🎯 Confianza Mínima: {minConfidence}%</h3>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0% - Baja</span>
              <span>50% - Media</span>
              <span>100% - Alta</span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">ℹ️ Cómo funciona:</span> El sistema detecta todos los EPPs con confianza ≥50%. 
                Este umbral solo determina el <strong>estado visual</strong> (Cumple/No cumple). 
                Ejemplo: Si configuras 75%, un calzado detectado al 69% se mostrará como "No cumple 69%" en rojo.
              </p>
            </div>
          </div>

          {(detectionType === 'ppe_detection' || detectionType === 'realtime_ppe') && (
            <>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">🦺 Elementos EPP a Detectar</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'HEAD_COVER', label: 'Casco', icon: '🪖' },
                    { value: 'EYE_COVER', label: 'Gafas', icon: '🥽' },
                    { value: 'HAND_COVER', label: 'Guantes', icon: '🧤' },
                    { value: 'FOOT_COVER', label: 'Calzado', icon: '🥾' },
                    { value: 'FACE_COVER', label: 'Mascarilla', icon: '😷' },
                    { value: 'EAR_COVER', label: 'Orejeras', icon: '🎧' }
                  ].map((item) => (
                    <label key={item.value} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={epiItems.includes(item.value)}
                        onChange={() => handleEpiItemChange(item.value)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Volver
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Action */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'image' ? 'Subir Imagen' : 'Selecciona una Opción'}
            </h2>
            <p className="text-gray-600">
              {mode === 'image' ? 'Selecciona la imagen a analizar' : 'Usa tu cámara o sube un video'}
            </p>
          </div>

          {mode === 'image' ? (
            <DragDropUpload onFileSelect={setFile} selectedFile={file} />
          ) : (
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-8 border-2 border-pink-200 text-center cursor-pointer hover:shadow-xl transition-all max-w-md" onClick={() => setFile(null)}>
                <div className="w-20 h-20 mx-auto bg-pink-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">📹</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Cámara en Vivo</h3>
                <p className="text-sm text-gray-600">
                  Detección instantánea desde tu cámara
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Volver
            </button>
            <button
              onClick={() => {
                if (progress === 100) {
                  setProgress(0);
                  const analysisElement = document.querySelector('[data-analysis-summary]');
                  if (analysisElement) {
                    analysisElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                } else {
                  handleComplete();
                }
              }}
              disabled={(mode === 'image' && !file) || (progress > 0 && progress < 100)}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg ${
                progress === 100
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-pointer animate-pulse'
                  : progress > 0
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 cursor-not-allowed'
                  : (mode === 'image' && !file)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
              } text-white`}
            >
              {progress === 100 ? (
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">✅</span>
                  <span>Análisis Completado - Ver Resultados</span>
                </div>
              ) : progress >= 85 ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generando resumen con IA...</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm opacity-90">{progress}%</span>
                </div>
              ) : progress >= 50 ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analizando con Rekognition...</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm opacity-90">{progress}%</span>
                </div>
              ) : progress > 0 ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Subiendo imagen...</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm opacity-90">{progress}%</span>
                </div>
              ) : mode === 'image' ? (
                <span>🚀 Iniciar Análisis</span>
              ) : (
                <span>📹 Abrir Cámara</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidedAnalysisWizard;
