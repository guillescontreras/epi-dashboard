import React from 'react';
import DragDropUpload from './DragDropUpload';

interface AnalysisSectionProps {
  file: File | null;
  setFile: (file: File | null) => void;
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

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  file, setFile, detectionType, setDetectionType, minConfidence, setMinConfidence,
  epiItems, handleEpiItemChange, strictMode, setStrictMode, handleUpload, progress
}) => {
  return (
    <div className="space-y-6">
      <DragDropUpload onFileSelect={setFile} selectedFile={file} />
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configuración de Análisis</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Algoritmo de Detección
            </label>
            <select
              value={detectionType}
              onChange={(e) => setDetectionType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ppe_detection">🦺 EPI (Equipos de Protección)</option>
              <option value="face_detection">👤 Rostros</option>
              <option value="label_detection">🏷️ Objetos</option>
              <option value="text_detection">📝 Texto</option>
              <option value="moderation_detection">⚠️ Contenido Moderado</option>
              <option value="celebrity_detection">⭐ Celebridades</option>
            </select>
          </div>

          {detectionType === 'ppe_detection' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Elementos EPI a Auditar
              </label>
              <div className="space-y-2">
                {[
                  { value: 'HEAD_COVER', label: '🪖 Casco' },
                  { value: 'HAND_COVER', label: '🧤 Guantes' },
                  { value: 'FACE_COVER', label: '😷 Mascarilla' }
                ].map((item) => (
                  <label key={item.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={epiItems.includes(item.value)}
                      onChange={() => handleEpiItemChange(item.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={() => setStrictMode(!strictMode)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    🔒 Modo Estricto (Todos los elementos requeridos)
                  </span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confianza Mínima: {minConfidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <button
          onClick={handleUpload}
          disabled={!file || progress > 0}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {progress > 0 ? '🔄 Procesando...' : '🚀 Subir y Analizar'}
        </button>

        {progress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisSection;