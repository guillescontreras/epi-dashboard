import React, { useState } from 'react';

interface ModernAnalysisPanelProps {
  file: File | null;
  setFile: (file: File | null) => void;
  files?: File[];
  setFiles?: (files: File[]) => void;
  detectionType: string;
  setDetectionType: (type: string) => void;
  minConfidence: number;
  setMinConfidence: (confidence: number) => void;
  epiItems: string[];
  handleEpiItemChange: (item: string) => void;
  strictMode: boolean;
  setStrictMode: (mode: boolean) => void;
  handleUpload: () => void;
  progress: number;
}

const ModernAnalysisPanel: React.FC<ModernAnalysisPanelProps> = ({
  file, setFile, files = [], setFiles = () => {}, detectionType, setDetectionType, minConfidence, setMinConfidence,
  epiItems, handleEpiItemChange, strictMode, setStrictMode, handleUpload, progress
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (videoFile) {
      setFile(videoFile);
      setDetectionType('ppe_video_detection');
    } else if (imageFile) {
      setFile(imageFile);
      if (detectionType === 'ppe_video_detection') {
        setDetectionType('ppe_detection');
      }
    }
  };

  const detectionTypes = [
    { value: 'ppe_detection', label: 'Detección de EPP (Imagen)', icon: '🦺', color: 'from-green-500 to-emerald-600' },
    { value: 'realtime_detection', label: 'Detección en Tiempo Real', icon: '📹', color: 'from-pink-500 to-rose-600' },
    { value: 'face_detection', label: 'Análisis Facial', icon: '👤', color: 'from-blue-500 to-cyan-600' },
    { value: 'label_detection', label: 'Detección de Objetos', icon: '🏷️', color: 'from-purple-500 to-violet-600' },
    { value: 'text_detection', label: 'Reconocimiento de Texto', icon: '📝', color: 'from-orange-500 to-amber-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <span>📁</span>
            <span>Cargar Imagen</span>
          </h2>
        </div>
        
        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragOver
                ? 'border-blue-400 bg-blue-50 scale-105'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {file ? (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                >
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center text-3xl">
                  📷
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Arrastra tu imagen aquí
                  </p>
                  <p className="text-gray-500 mb-4">o haz clic para seleccionar</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => document.getElementById('file-input')?.click()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Seleccionar Archivo
                    </button>
                    <button
                      onClick={() => document.getElementById('camera-input')?.click()}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      📷 Tomar Foto
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <input
              id="file-input"
              type="file"
              accept={detectionType === 'ppe_video_detection' ? 'video/mp4,video/avi,video/mov,video/quicktime' : 'image/jpeg,image/jpg,image/png'}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  if (selectedFile.type.startsWith('video/')) {
                    setFile(selectedFile);
                    setDetectionType('ppe_video_detection');
                  } else if (selectedFile.type.startsWith('image/')) {
                    setFile(selectedFile);
                    if (detectionType === 'ppe_video_detection') {
                      setDetectionType('ppe_detection');
                    }
                  } else if (detectionType === 'ppe_batch_detection' && e.target.files) {
                    setFiles(Array.from(e.target.files));
                  } else {
                    setFile(selectedFile);
                  }
                }
              }}
              className="hidden"
            />
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  setFile(selectedFile);
                  if (detectionType === 'ppe_video_detection') {
                    setDetectionType('ppe_detection');
                  }
                }
              }}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Detection Type Selection */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <span>🔬</span>
            <span>Tipo de Análisis</span>
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detectionTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setDetectionType(type.value)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  detectionType === type.value
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white text-lg shadow-md`}>
                    {type.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* EPP Configuration */}
          {(detectionType === 'ppe_detection' || detectionType === 'ppe_video_detection' || detectionType === 'realtime_detection') && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <h3 className="font-medium text-gray-900 mb-3">Configuración EPP</h3>
              <div className="space-y-3">
                {[
                  { value: 'HEAD_COVER', label: 'Casco', icon: '🪖' },
                  { value: 'EYE_COVER', label: 'Gafas de Seguridad', icon: '🥽' },
                  { value: 'HAND_COVER', label: 'Guantes', icon: '🧤' },
                  { value: 'FOOT_COVER', label: 'Calzado de Seguridad', icon: '🥾' },
                  { value: 'FACE_COVER', label: 'Mascarilla', icon: '😷' },
                  { value: 'EAR_COVER', label: 'Protección Auditiva', icon: '🎧' }
                ].map((item) => (
                  <label key={item.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epiItems.includes(item.value)}
                      onChange={() => handleEpiItemChange(item.value)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </label>
                ))}
                <div className="pt-2 border-t border-green-200">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strictMode}
                      onChange={() => setStrictMode(!strictMode)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Modo Estricto</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confidence Slider */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <span>🎯</span>
            <span>Confianza Mínima: {minConfidence}%</span>
          </h2>
        </div>
        
        <div className="p-6">
          <input
            type="range"
            min="0"
            max="100"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0% - Baja</span>
            <span>50% - Media</span>
            <span>100% - Alta</span>
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6">
          <button
            onClick={handleUpload}
            disabled={(detectionType !== 'realtime_detection' && !file) || progress > 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {progress > 0 ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Analizando... {progress}%</span>
              </div>
            ) : detectionType === 'realtime_detection' ? (
              <div className="flex items-center justify-center space-x-2">
                <span>📹</span>
                <span>Abrir Cámara</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>🚀</span>
                <span>Iniciar Análisis</span>
              </div>
            )}
          </button>

          {progress > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernAnalysisPanel;