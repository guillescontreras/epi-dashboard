import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

interface CustomModelDetectionProps {
  onClose: () => void;
  epiItems: string[];
  minConfidence: number;
}

const CustomModelDetection: React.FC<CustomModelDetectionProps> = ({ onClose, epiItems, minConfidence }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<any[]>([]);

  // Configuración para modelo personalizado
  // Reemplaza con tu API key de Roboflow o modelo local
  const MODEL_URL = 'YOUR_MODEL_URL'; // Ejemplo: https://detect.roboflow.com/ppe-detection/1
  const API_KEY = 'YOUR_API_KEY';

  const detectFrame = async () => {
    if (!webcamRef.current || !canvasRef.current || !isDetecting) return;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capturar frame
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      // Llamar a API de modelo personalizado (ejemplo Roboflow)
      const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: API_KEY,
          image: imageSrc.split(',')[1], // Base64 sin prefijo
        }),
      });

      const predictions = await response.json();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Dibujar detecciones
      predictions.predictions?.forEach((pred: any) => {
        if (pred.confidence * 100 >= minConfidence) {
          const x = pred.x - pred.width / 2;
          const y = pred.y - pred.height / 2;

          // Verde si es EPP requerido, rojo si no
          const isRequired = epiItems.some(item => 
            pred.class.toUpperCase().includes(item.replace('_COVER', ''))
          );
          const color = isRequired ? '#00ff00' : '#ff0000';

          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, pred.width, pred.height);

          ctx.fillStyle = color;
          ctx.font = '16px Arial';
          ctx.fillText(
            `${pred.class} ${(pred.confidence * 100).toFixed(1)}%`,
            x,
            y > 20 ? y - 5 : y + 20
          );
        }
      });

      setDetections(predictions.predictions || []);
    } catch (error) {
      console.error('Error en detección:', error);
    }

    requestAnimationFrame(detectFrame);
  };

  useEffect(() => {
    if (isDetecting) {
      detectFrame();
    }
  }, [isDetecting]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>🎯</span>
            <span>Detección Personalizada de EPPs</span>
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">×</button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">⚙️ Configuración Requerida</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>Para usar detección personalizada de EPPs:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Entrena un modelo en <a href="https://roboflow.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Roboflow</a></li>
                <li>Obtén tu API Key y URL del modelo</li>
                <li>Actualiza MODEL_URL y API_KEY en el código</li>
                <li>El modelo detectará: cascos, guantes, mascarillas, gafas, botas, etc.</li>
              </ol>
            </div>
          </div>

          <div className="relative bg-black rounded-xl overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>

          <div className="mt-4 flex space-x-4">
            {!isDetecting ? (
              <button
                onClick={() => setIsDetecting(true)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700"
              >
                ▶ Iniciar Detección
              </button>
            ) : (
              <button
                onClick={() => setIsDetecting(false)}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700"
              >
                ⏸ Detener
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomModelDetection;
