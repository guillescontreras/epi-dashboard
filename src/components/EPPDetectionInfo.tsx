import React, { useState } from 'react';
import { EPP_DETECTION_CAPABILITIES, getDetectionMethodLabel, getConfidenceBadgeColor } from '../constants/eppDetectionCapabilities';

const EPPDetectionInfo: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">ℹ️</span>
          <span className="font-semibold text-blue-900">Métodos de Detección de EPPs</span>
        </div>
        <span className="text-blue-600 text-xl">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-blue-800 mb-3">
            El sistema utiliza dos métodos de detección para identificar todos los EPPs:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.values(EPP_DETECTION_CAPABILITIES).map((epp) => (
              <div
                key={epp.type}
                className="bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{epp.icon}</span>
                    <span className="font-medium text-gray-900 text-sm">{epp.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getConfidenceBadgeColor(epp.confidence)}`}>
                    {epp.confidence === 'HIGH' ? 'Alta' : epp.confidence === 'MEDIUM' ? 'Media' : 'Baja'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">{getDetectionMethodLabel(epp.detectionMethod)}</span>
                  {epp.note && <span className="block mt-1 text-gray-500">{epp.note}</span>}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <span className="font-semibold">⚠️ Nota:</span> Los EPPs detectados mediante "Detección por Objetos" 
              (gafas, calzado, orejeras) pueden tener menor precisión que los detectados nativamente. 
              Se recomienda validación visual adicional para estos elementos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPPDetectionInfo;
