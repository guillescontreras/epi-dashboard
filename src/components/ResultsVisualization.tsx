import React, { useRef, useState } from 'react';

interface ResultsVisualizationProps {
  results: any;
  imageUrl: string;
  minConfidence: number;
  epiItems: string[];
}

const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({
  results,
  imageUrl,
  minConfidence,
  epiItems
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  };

  if (!results) return null;

  return (
    <div className="space-y-6">
      {/* Imagen con Anotaciones */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🖼️ Imagen Analizada</h3>
        <div className="relative max-w-full">
          <img 
            ref={imageRef} 
            src={imageUrl} 
            alt="Análisis" 
            className="max-w-full h-auto rounded-lg"
            onLoad={handleImageLoad} 
          />
          <svg 
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: imageDimensions.width, height: imageDimensions.height }}
          >
            {/* Renderizar anotaciones según el tipo de detección */}
            {results.DetectionType === 'ppe_detection' && results.ProtectiveEquipment?.map((p: any, i: number) => {
              const box = p.BoundingBox;
              const x = box.Left * imageDimensions.width;
              const y = box.Top * imageDimensions.height;
              const w = box.Width * imageDimensions.width;
              const h = box.Height * imageDimensions.height;
              const color = p.ProtectiveEquipmentSummarization?.AllRequiredEquipmentCovered ? '#10B981' : '#EF4444';
              
              return (
                <g key={`person-${i}`}>
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill="none" stroke={color} strokeWidth="2"
                  />
                  <text x={x} y={y - 5} fontSize="12" fill={color} className="font-medium">
                    Persona {i + 1} - {p.Confidence.toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {results.DetectionType === 'face_detection' && results.Faces?.map((f: any, i: number) => {
              const box = f.BoundingBox;
              const x = box.Left * imageDimensions.width;
              const y = box.Top * imageDimensions.height;
              const w = box.Width * imageDimensions.width;
              const h = box.Height * imageDimensions.height;
              
              return (
                <g key={`face-${i}`}>
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill="none" stroke="#3B82F6" strokeWidth="2"
                  />
                  <text x={x} y={y - 5} fontSize="12" fill="#3B82F6" className="font-medium">
                    Rostro {i + 1} - {f.Confidence.toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Detalles de Detección */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Detalles del Análisis</h3>
        
        {results.DetectionType === 'ppe_detection' && results.ProtectiveEquipment && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Persona</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parte del Cuerpo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo EPP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confianza</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.ProtectiveEquipment.flatMap((p: any, i: number) =>
                  p.BodyParts?.flatMap((bp: any) =>
                    bp.EquipmentDetections?.map((ed: any, j: number) => (
                      <tr key={`${i}-${j}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Persona {i + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bp.Name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ed.Type === 'FACE_COVER' ? '😷 Mascarilla' :
                           ed.Type === 'HEAD_COVER' ? '🪖 Casco' :
                           ed.Type === 'HAND_COVER' ? '🧤 Guantes' : ed.Type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ed.Confidence.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ed.Confidence >= minConfidence 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {ed.Confidence >= minConfidence ? '✅ Cumple' : '❌ No cumple'}
                          </span>
                        </td>
                      </tr>
                    )) || []
                  ) || []
                )}
              </tbody>
            </table>
          </div>
        )}

        {results.DetectionType === 'face_detection' && results.Faces && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rostro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confianza</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Género</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.Faces.map((f: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Rostro {i + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.Confidence.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.AgeRange?.Low}-{f.AgeRange?.High} años
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.Gender?.Value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsVisualization;