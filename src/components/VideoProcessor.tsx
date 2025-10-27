import React, { useRef, useEffect, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

interface VideoProcessorProps {
  videoFile: File;
  onClose: () => void;
  minConfidence: number;
}

const VideoProcessor: React.FC<VideoProcessorProps> = ({ videoFile, onClose, minConfidence }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detections, setDetections] = useState<any[]>([]);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [capturedFrames, setCapturedFrames] = useState<Array<{image: string; detections: any[]; personCount?: number; frame?: number}>>([]);
  const [selectedFrame, setSelectedFrame] = useState<{image: string; detections: any[]; personCount?: number; frame?: number} | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await cocoSsd.load({
        base: 'mobilenet_v2'
      });
      setModel(loadedModel);
    };
    loadModel();
  }, []);

  const processVideo = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const allDetections: any[] = [];
    const uniquePersons: Array<{bbox: number[]; frame: number}> = [];
    const fps = 2; // Procesar 2 frames por segundo
    const duration = video.duration;
    const totalFrames = Math.floor(duration * fps);
    let currentFrame = 0;
    let captureCount = 0;

    const processFrame = async () => {
      if (currentFrame >= totalFrames) {
        setIsProcessing(false);
        setProgress(100);
        return;
      }

      video.currentTime = currentFrame / fps;
      
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        setTimeout(resolve, 500); // timeout fallback
      });

      const predictions = await model.detect(video, undefined, 0.2);
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const frameDetections: any[] = [];
      const personsInFrame: any[] = [];
      
      predictions.forEach((prediction) => {
        if (prediction.score * 100 >= Math.min(minConfidence, 20)) {
          const [x, y, width, height] = prediction.bbox;
          
          ctx.strokeStyle = prediction.class === 'person' ? '#00ff00' : '#ff9900';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          ctx.fillStyle = prediction.class === 'person' ? '#00ff00' : '#ff9900';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${prediction.class} ${(prediction.score * 100).toFixed(1)}%`,
            x,
            y > 20 ? y - 5 : y + 20
          );

          const detection = {
            frame: currentFrame,
            class: prediction.class,
            score: prediction.score * 100,
            timestamp: currentFrame / fps,
            bbox: prediction.bbox
          };
          
          allDetections.push(detection);
          frameDetections.push(detection);
          
          if (prediction.class === 'person') {
            personsInFrame.push(detection);
          }
        }
      });
      
      // Capturar solo personas únicas
      if (personsInFrame.length > 0 && captureCount < 15) {
        personsInFrame.forEach((person) => {
          const isUnique = uniquePersons.every((existing) => {
            const [x1, y1, w1, h1] = existing.bbox;
            const [x2, y2, w2, h2] = person.bbox;
            const centerX1 = x1 + w1/2, centerY1 = y1 + h1/2;
            const centerX2 = x2 + w2/2, centerY2 = y2 + h2/2;
            const distance = Math.sqrt(Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2));
            return distance > 50;
          });
          
          if (isUnique && captureCount < 15) {
            const frameImage = canvas.toDataURL('image/jpeg', 0.7);
            uniquePersons.push({ bbox: person.bbox, frame: currentFrame });
            captureCount++;
            setCapturedFrames(prev => [...prev, { 
              image: frameImage, 
              detections: frameDetections,
              personCount: personsInFrame.length,
              frame: currentFrame
            }]);
          }
        });
      }

      currentFrame++;
      setProgress(Math.round((currentFrame / totalFrames) * 100));
      setDetections(allDetections);

      setTimeout(() => processFrame(), 50);
    };

    processFrame();
  };

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const url = URL.createObjectURL(videoFile);
      videoRef.current.src = url;
      setProcessedVideoUrl(url);
    }
  }, [videoFile]);

  const detectionSummary = detections.reduce((acc: any, det) => {
    acc[det.class] = (acc[det.class] || 0) + 1;
    return acc;
  }, {});
  
  const uniquePersonCount = capturedFrames.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>🎬</span>
            <span>Procesamiento de Video</span>
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">×</button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full"
                  controls={!isProcessing}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ display: isProcessing ? 'block' : 'none' }}
                />
              </div>

              {!isProcessing && progress === 0 && (
                <button
                  onClick={processVideo}
                  disabled={!model}
                  className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
                >
                  {model ? '▶ Procesar Video' : '⏳ Cargando modelo...'}
                </button>
              )}

              {isProcessing && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Procesando...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-3">📊 Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Detecciones:</span>
                    <span className="text-2xl font-bold text-purple-600">{detections.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Progreso:</span>
                    <span className="text-2xl font-bold text-pink-600">{progress}%</span>
                  </div>
                </div>
              </div>

              {Object.keys(detectionSummary).length > 0 && (
                <>
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">🔍 Detecciones</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">👥 Personas Únicas</span>
                        <span className="text-sm font-bold text-green-600">{uniquePersonCount}</span>
                      </div>
                      {Object.entries(detectionSummary)
                        .filter(([obj]) => obj !== 'person')
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 5)
                        .map(([obj, count]: any) => (
                          <div key={obj} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900 capitalize">{obj}</span>
                            <span className="text-sm font-bold text-purple-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {capturedFrames.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">📸 Capturas ({capturedFrames.length})</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                        {capturedFrames.map((frame, idx) => (
                          <div key={idx} className="relative group cursor-pointer" onClick={() => setSelectedFrame(frame)}>
                            <img 
                              src={frame.image} 
                              alt={`Frame ${idx}`}
                              className="w-full rounded-lg border border-gray-200 hover:border-purple-500 transition-all"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-xs p-2 rounded-b-lg">
                              <div className="font-bold">👥 {frame.personCount || 0} persona(s)</div>
                              <div className="text-gray-300">{frame.detections.length} objeto(s) total</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {progress === 100 && (
                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700"
                >
                  🆕 Nuevo Análisis
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {selectedFrame && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedFrame(null)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedFrame(null)}
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
            >
              ×
            </button>
            <img 
              src={selectedFrame.image} 
              alt="Frame ampliado" 
              className="w-full rounded-xl"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
              <div className="font-bold text-lg">👥 {selectedFrame.personCount || 0} persona(s) detectada(s)</div>
              <div className="text-sm text-gray-300">{selectedFrame.detections.length} objeto(s) en total</div>
              <div className="text-xs text-gray-400 mt-1">Frame: {selectedFrame.frame}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessor;
