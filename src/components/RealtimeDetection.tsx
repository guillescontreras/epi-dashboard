import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
  timestamp: number;
}

interface RealtimeDetectionProps {
  onClose: () => void;
  epiItems: string[];
  minConfidence: number;
}

const RealtimeDetection: React.FC<RealtimeDetectionProps> = ({ onClose, epiItems, minConfidence }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState({ total: 0, compliant: 0, nonCompliant: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const epiMapping: { [key: string]: string[] } = {
    HEAD_COVER: ['helmet', 'hat'],
    HAND_COVER: ['glove'],
    FACE_COVER: ['mask'],
    EYE_COVER: ['glasses', 'sunglasses'],
    FOOT_COVER: ['shoe', 'boot']
  };

  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);

  const detectFrame = async () => {
    if (!model || !webcamRef.current || !canvasRef.current || !isDetecting) return;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) {
      setTimeout(detectFrame, 100);
      return;
    }

    const predictions = await model.detect(video);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const newDetections: Detection[] = [];
    let personCount = 0;
    let compliantCount = 0;

    predictions.forEach((prediction) => {
      if (prediction.score * 100 >= minConfidence) {
        const [x, y, width, height] = prediction.bbox;
        
        if (prediction.class === 'person') {
          personCount++;
        }

        const isEPP = Object.values(epiMapping).flat().includes(prediction.class);
        const color = isEPP ? '#00ff00' : '#ff0000';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = color;
        ctx.font = '16px Arial';
        ctx.fillText(
          `${prediction.class} ${(prediction.score * 100).toFixed(1)}%`,
          x,
          y > 20 ? y - 5 : y + 20
        );

        newDetections.push({
          class: prediction.class,
          score: prediction.score * 100,
          bbox: prediction.bbox,
          timestamp: Date.now()
        });
      }
    });

    setDetections(prev => [...prev.slice(-50), ...newDetections]);
    setStats({ total: personCount, compliant: compliantCount, nonCompliant: personCount - compliantCount });

    // Limitar a ~2 FPS para no sobrecargar el dispositivo
    setTimeout(detectFrame, 500);
  };

  useEffect(() => {
    if (isDetecting && model) {
      detectFrame();
    }
  }, [isDetecting, model]);

  const handleStart = () => {
    setIsDetecting(true);
    setDetections([]);
  };

  const handleStop = () => {
    setIsDetecting(false);
    setShowSummary(true);
    // Detener el stream de la cámara
    if (webcamRef.current?.stream) {
      webcamRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const detectionSummary = detections.reduce((acc: any, det) => {
    acc[det.class] = (acc[det.class] || 0) + 1;
    return acc;
  }, {});

  React.useEffect(() => {
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
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex space-x-3">
                  {!isDetecting && !showSummary ? (
                    <button
                      onClick={handleStart}
                      disabled={!model}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {model ? '▶ Iniciar Detección' : '⏳ Cargando modelo...'}
                    </button>
                  ) : isDetecting ? (
                    <button
                      onClick={handleStop}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700"
                    >
                      ⏹ Finalizar y Ver Resumen
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowSummary(false); onClose(); }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-700"
                    >
                      🆕 Nuevo Análisis
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
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3">📊 Estadísticas</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Personas:</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Detecciones:</span>
                    <span className="text-2xl font-bold text-purple-600">{detections.length}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                    ⏱️ Análisis: ~2 FPS (optimizado para dispositivos)
                  </div>
                </div>
              </div>

              {!showSummary ? (
                <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 mb-3">🔍 Detecciones Recientes</h3>
                  <div className="space-y-2">
                    {detections.slice(-10).reverse().map((det, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2 text-xs border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{det.class}</span>
                          <span className="text-green-600 font-bold">{det.score.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-3">🎯 Resumen Final</h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">Total de Detecciones</p>
                      <p className="text-3xl font-bold text-green-600">{detections.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 max-h-48 overflow-y-auto">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Objetos Detectados:</p>
                      {Object.entries(detectionSummary)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .map(([obj, count]: any) => (
                          <div key={obj} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                            <span className="text-xs text-gray-700 capitalize">{obj}</span>
                            <span className="text-xs font-bold text-green-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <span>🧠</span>
                  <span>Modelo de Detección</span>
                </h3>
                <div className="text-xs text-gray-700 space-y-2">
                  <p><strong>Estado actual:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Detecta personas y objetos generales</li>
                    <li>🛠️ Modelo en entrenamiento para EPPs específicos</li>
                    <li>Próximamente: cascos, guantes, mascarillas, gafas, botas</li>
                  </ul>
                  <p className="mt-2 text-blue-800 font-medium">
                    🚀 Para detección precisa de EPPs, usa el análisis de imágenes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDetection;
