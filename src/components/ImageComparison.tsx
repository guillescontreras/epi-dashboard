import React, { useRef, useState, useEffect } from 'react';

interface ImageComparisonProps {
  results: any;
  imageUrl: string;
  minConfidence: number;
  epiItems: string[];
}

const ImageComparison: React.FC<ImageComparisonProps> = ({
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

  useEffect(() => {
    // Recalcular dimensiones cuando cambie la imagen
    if (imageRef.current) {
      handleImageLoad();
    }
  }, [imageUrl]);

  if (!results || !imageUrl) return null;

  const renderAnnotations = (): JSX.Element[] => {
    const annotations: JSX.Element[] = [];

    // Renderizar anotaciones según el tipo de detección
    if (results.DetectionType === 'ppe_detection' && results.ProtectiveEquipment) {
      // Personas detectadas
      results.ProtectiveEquipment.forEach((person: any, i: number) => {
        if (person.BoundingBox) {
          const box = person.BoundingBox;
          const x = box.Left * imageDimensions.width;
          const y = box.Top * imageDimensions.height;
          const w = box.Width * imageDimensions.width;
          const h = box.Height * imageDimensions.height;
          const isCompliant = person.ProtectiveEquipmentSummarization?.AllRequiredEquipmentCovered;
          const color = isCompliant ? '#10B981' : '#EF4444';
          
          annotations.push(
            <g key={`person-${i}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill="none" stroke={color} strokeWidth="3"
                rx="4"
              />
              <rect
                x={x} y={y - 25} width={Math.max(120, w)} height="20"
                fill={color} rx="10"
              />
              <text 
                x={x + 5} y={y - 10} 
                fontSize="12" fill="white" 
                fontWeight="bold"
              >
                Persona {i + 1} - {person.Confidence?.toFixed(1)}%
              </text>
            </g>
          );
        }

        // Equipos EPP detectados
        if (person.BodyParts) {
          person.BodyParts.forEach((bodyPart: any) => {
            if (bodyPart.EquipmentDetections) {
              bodyPart.EquipmentDetections.forEach((equipment: any, j: number) => {
                if (equipment.BoundingBox && equipment.Confidence >= minConfidence && 
                    (epiItems.length === 0 || epiItems.includes(equipment.Type))) {
                  const box = equipment.BoundingBox;
                  const x = box.Left * imageDimensions.width;
                  const y = box.Top * imageDimensions.height;
                  const w = box.Width * imageDimensions.width;
                  const h = box.Height * imageDimensions.height;
                  const color = equipment.Confidence >= minConfidence ? '#10B981' : '#F59E0B';
                  
                  const equipmentName = equipment.Type === 'FACE_COVER' ? 'Mascarilla' :
                                     equipment.Type === 'HEAD_COVER' ? 'Casco' :
                                     equipment.Type === 'HAND_COVER' ? 'Guantes' :
                                     equipment.Type === 'EYE_COVER' ? 'Gafas' :
                                     equipment.Type === 'FOOT_COVER' ? 'Calzado' :
                                     equipment.Type === 'EAR_COVER' ? 'Orejeras' : equipment.Type;
                  
                  // Usar color diferente para detecciones híbridas
                  const isHybrid = ['EYE_COVER', 'FOOT_COVER', 'EAR_COVER'].includes(equipment.Type);
                  const hybridColor = isHybrid ? (equipment.Confidence >= minConfidence ? '#059669' : '#8B5CF6') : color;
                  
                  annotations.push(
                    <g key={`equipment-${i}-${bodyPart.Name}-${j}-${equipment.Type}`}>
                      <rect
                        x={x} y={y} width={w} height={h}
                        fill="none" stroke={hybridColor} strokeWidth="2"
                        strokeDasharray={isHybrid ? "10,5" : "5,5"} rx="2"
                      />
                      <rect
                        x={x} y={y + h + 2} width={Math.max(80, w)} height="18"
                        fill={hybridColor} rx="9"
                      />
                      <text 
                        x={x + 3} y={y + h + 14} 
                        fontSize="10" fill="white" 
                        fontWeight="bold"
                      >
                        {equipmentName} {equipment.Confidence?.toFixed(1)}% {isHybrid ? '(H)' : ''}
                      </text>
                    </g>
                  );
                }
              });
            }
          });
        }
      });
    }

    // Detección de rostros
    if (results.DetectionType === 'face_detection' && results.Faces) {
      results.Faces.forEach((face: any, i: number) => {
        if (face.BoundingBox) {
          const box = face.BoundingBox;
          const x = box.Left * imageDimensions.width;
          const y = box.Top * imageDimensions.height;
          const w = box.Width * imageDimensions.width;
          const h = box.Height * imageDimensions.height;
          
          annotations.push(
            <g key={`face-${i}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill="none" stroke="#3B82F6" strokeWidth="3"
                rx="4"
              />
              <rect
                x={x} y={y - 25} width={Math.max(100, w)} height="20"
                fill="#3B82F6" rx="10"
              />
              <text 
                x={x + 5} y={y - 10} 
                fontSize="12" fill="white" 
                fontWeight="bold"
              >
                Rostro {i + 1} - {face.Confidence?.toFixed(1)}%
              </text>
            </g>
          );
        }
      });
    }

    // Detección de objetos
    if (results.DetectionType === 'label_detection' && results.Labels) {
      results.Labels.forEach((label: any, labelIndex: number) => {
        // Mostrar todas las instancias de cada objeto detectado
        if (label.Instances && label.Instances.length > 0) {
          label.Instances.forEach((instance: any, instanceIndex: number) => {
            if (instance.BoundingBox) {
              const box = instance.BoundingBox;
              const x = box.Left * imageDimensions.width;
              const y = box.Top * imageDimensions.height;
              const w = box.Width * imageDimensions.width;
              const h = box.Height * imageDimensions.height;
              
              annotations.push(
                <g key={`label-${labelIndex}-instance-${instanceIndex}`}>
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill="none" stroke="#8B5CF6" strokeWidth="2"
                    rx="4"
                  />
                  <rect
                    x={x} y={y - 22} width={Math.max(label.Name.length * 8, w)} height="18"
                    fill="#8B5CF6" rx="9"
                  />
                  <text 
                    x={x + 3} y={y - 8} 
                    fontSize="11" fill="white" 
                    fontWeight="bold"
                  >
                    {label.Name} {instance.Confidence?.toFixed(1)}%
                  </text>
                </g>
              );
            }
          });
        } else {
          // Si no hay instancias específicas, mostrar el label general
          annotations.push(
            <g key={`label-general-${labelIndex}`}>
              <rect
                x={10} y={10 + (labelIndex * 25)} width={label.Name.length * 8 + 20} height="20"
                fill="#8B5CF6" rx="10"
              />
              <text 
                x={15} y={25 + (labelIndex * 25)} 
                fontSize="11" fill="white" 
                fontWeight="bold"
              >
                {label.Name} {label.Confidence?.toFixed(1)}%
              </text>
            </g>
          );
        }
      });
    }

    // Detección de texto
    if (results.DetectionType === 'text_detection' && results.TextDetections) {
      results.TextDetections.forEach((text: any, i: number) => {
        if (text.Geometry?.BoundingBox && text.Type === 'LINE') {
          const box = text.Geometry.BoundingBox;
          const x = box.Left * imageDimensions.width;
          const y = box.Top * imageDimensions.height;
          const w = box.Width * imageDimensions.width;
          const h = box.Height * imageDimensions.height;
          
          annotations.push(
            <g key={`text-${i}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill="none" stroke="#F59E0B" strokeWidth="2"
                rx="2"
              />
              <rect
                x={x} y={y - 20} width={Math.max(text.DetectedText?.length * 6 || 60, w)} height="16"
                fill="#F59E0B" rx="8"
              />
              <text 
                x={x + 2} y={y - 8} 
                fontSize="10" fill="white" 
                fontWeight="bold"
              >
                {text.DetectedText} ({text.Confidence?.toFixed(1)}%)
              </text>
            </g>
          );
        }
      });
    }

    return annotations;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <span>🔍</span>
          <span>Comparación de Imágenes</span>
        </h2>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Imagen Original */}
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-700 flex items-center space-x-2">
              <span>📷</span>
              <span>Imagen Original</span>
            </h3>
            <div className="relative bg-gray-100 rounded-xl overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Original" 
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Imagen Analizada */}
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-700 flex items-center space-x-2">
              <span>🎯</span>
              <span>Imagen Analizada</span>
            </h3>
            <div className="relative bg-gray-100 rounded-xl overflow-hidden">
              <img 
                ref={imageRef}
                src={imageUrl} 
                alt="Analizada" 
                className="w-full h-auto"
                onLoad={handleImageLoad}
              />
              <svg 
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: imageDimensions.width, height: imageDimensions.height }}
              >
                {renderAnnotations()}
              </svg>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Leyenda:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {results.DetectionType === 'ppe_detection' && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-green-500 rounded"></div>
                  <span>Cumpliente</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-red-500 rounded"></div>
                  <span>No Cumpliente</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-green-500 rounded border-dashed border"></div>
                  <span>EPP Cumple</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-yellow-500 rounded border-dashed border"></div>
                  <span>EPP No Cumple</span>
                </div>
              </>
            )}
            {results.DetectionType === 'face_detection' && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-2 bg-blue-500 rounded"></div>
                <span>Rostros Detectados</span>
              </div>
            )}
            {results.DetectionType === 'label_detection' && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-2 bg-purple-500 rounded"></div>
                <span>Objetos Detectados</span>
              </div>
            )}
            {results.DetectionType === 'text_detection' && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-2 bg-yellow-500 rounded"></div>
                <span>Texto Detectado</span>
              </div>
            )}
          </div>
        </div>

        {/* Detalles de Objetos Detectados */}
        {results.DetectionType === 'label_detection' && results.Labels && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 flex items-center space-x-2">
                <span>🏷️</span>
                <span>Objetos Detectados ({results.Labels.length})</span>
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objeto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confianza</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorías</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instancias</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicaciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.Labels.map((label: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-purple-700">{label.Name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          label.Confidence >= 90 ? 'bg-green-100 text-green-800' :
                          label.Confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {label.Confidence?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {label.Categories?.map((cat: any, j: number) => (
                          <span key={j} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                            {cat.Name}
                          </span>
                        )) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {label.Instances?.length || 0} detectada(s)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {label.Instances && label.Instances.length > 0 ? (
                          <div className="space-y-1">
                            {label.Instances.slice(0, 3).map((instance: any, idx: number) => (
                              <div key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                                📍 Conf: {instance.Confidence?.toFixed(1)}%
                                {instance.BoundingBox && (
                                  <span className="ml-1">
                                    ({(instance.BoundingBox.Left * 100).toFixed(0)}%, {(instance.BoundingBox.Top * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            ))}
                            {label.Instances.length > 3 && (
                              <div className="text-xs text-gray-500">+{label.Instances.length - 3} más...</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin ubicación específica</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detalles de Rostros Detectados */}
        {results.DetectionType === 'face_detection' && results.Faces && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 flex items-center space-x-2">
                <span>👤</span>
                <span>Rostros Detectados ({results.Faces.length})</span>
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rostro</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confianza</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Género</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emociones</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atributos</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.Faces.map((face: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Rostro {i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          face.Confidence >= 95 ? 'bg-green-100 text-green-800' :
                          face.Confidence >= 80 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {face.Confidence?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {face.AgeRange?.Low}-{face.AgeRange?.High} años
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <span>{face.Gender?.Value === 'Male' ? '👨' : '👩'}</span>
                          <span>{face.Gender?.Value}</span>
                          <span className="text-xs text-gray-400">({face.Gender?.Confidence?.toFixed(0)}%)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {face.Emotions?.slice(0, 3).map((emotion: any, j: number) => (
                            <span key={j} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {emotion.Type} ({emotion.Confidence?.toFixed(0)}%)
                            </span>
                          )) || <span className="text-gray-400">N/A</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="space-y-1">
                          {face.Eyeglasses?.Value && (
                            <div className="flex items-center space-x-1">
                              <span>👓</span>
                              <span className="text-xs">Lentes ({face.Eyeglasses.Confidence?.toFixed(0)}%)</span>
                            </div>
                          )}
                          {face.Sunglasses?.Value && (
                            <div className="flex items-center space-x-1">
                              <span>🕶️</span>
                              <span className="text-xs">Gafas de sol ({face.Sunglasses.Confidence?.toFixed(0)}%)</span>
                            </div>
                          )}
                          {face.Beard?.Value && (
                            <div className="flex items-center space-x-1">
                              <span>🧔</span>
                              <span className="text-xs">Barba ({face.Beard.Confidence?.toFixed(0)}%)</span>
                            </div>
                          )}
                          {face.Mustache?.Value && (
                            <div className="flex items-center space-x-1">
                              <span>👨</span>
                              <span className="text-xs">Bigote ({face.Mustache.Confidence?.toFixed(0)}%)</span>
                            </div>
                          )}
                          {face.Smile?.Value && (
                            <div className="flex items-center space-x-1">
                              <span>😊</span>
                              <span className="text-xs">Sonrisa ({face.Smile.Confidence?.toFixed(0)}%)</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detalles de Texto Detectado */}
        {results.DetectionType === 'text_detection' && results.TextDetections && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-yellow-50 px-4 py-3 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 flex items-center space-x-2">
                <span>📝</span>
                <span>Texto Detectado ({results.TextDetections.length})</span>
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Texto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confianza</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.TextDetections.filter((text: any) => text.Type === 'LINE').map((text: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-yellow-700">{text.DetectedText}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                          {text.Type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          text.Confidence >= 90 ? 'bg-green-100 text-green-800' :
                          text.Confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {text.Confidence?.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detalles de EPP Detectado */}
        {results.DetectionType === 'ppe_detection' && results.ProtectiveEquipment && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 flex items-center space-x-2">
                <span>🦺</span>
                <span>Detalles de EPP Detectado</span>
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Persona</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parte del Cuerpo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confianza</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // FILTRAR PERSONAS EVALUABLES
                    const evaluablePersons = results.ProtectiveEquipment.filter((person: any) => {
                      const visibleParts = new Set<string>();
                      person.BodyParts?.forEach((part: any) => visibleParts.add(part.Name));
                      const relevantParts = ['HEAD', 'FACE', 'LEFT_HAND', 'RIGHT_HAND'];
                      return visibleParts.size >= 2 && relevantParts.some(p => visibleParts.has(p));
                    });
                    
                    // Validar coherencia EPP-BodyPart
                    const validateEPP = (eppType: string, bodyPart: string) => {
                      const valid: any = {
                        'HEAD_COVER': ['HEAD'], 'EYE_COVER': ['FACE', 'HEAD'], 'FACE_COVER': ['FACE'],
                        'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'], 'FOOT_COVER': ['FOOT'], 'EAR_COVER': ['HEAD']
                      };
                      return valid[eppType]?.includes(bodyPart) || false;
                    };
                    
                    return evaluablePersons.flatMap((person: any, i: number) =>
                      person.BodyParts?.flatMap((bodyPart: any) =>
                        bodyPart.EquipmentDetections?.filter((equipment: any) => {
                          const isSelected = epiItems.length === 0 || epiItems.includes(equipment.Type);
                          const isValid = validateEPP(equipment.Type, bodyPart.Name);
                          return isSelected && isValid;
                        }).map((equipment: any, j: number) => (
                        <tr key={`${i}-${bodyPart.Name}-${j}-${equipment.Type}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Persona {i + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{bodyPart.Name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {equipment.Type === 'FACE_COVER' ? '😷 Mascarilla' :
                             equipment.Type === 'HEAD_COVER' ? '🪖 Casco' :
                             equipment.Type === 'HAND_COVER' ? '🧤 Guantes' :
                             equipment.Type === 'EYE_COVER' ? '🥽 Gafas' :
                             equipment.Type === 'FOOT_COVER' ? '🥾 Calzado' :
                             equipment.Type === 'EAR_COVER' ? '🎧 Orejeras' : equipment.Type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{equipment.Confidence?.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              equipment.Confidence >= minConfidence 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {equipment.Confidence >= minConfidence ? '✅ Cumple' : '❌ No cumple'}
                            </span>
                          </td>
                        </tr>
                        )) || []
                      ) || []
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageComparison;