import React, { useState, useRef } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Papa from 'papaparse';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [detectionType, setDetectionType] = useState<string>('ppe_detection');
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [progress, setProgress] = useState<number>(0);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [epiItems, setEpiItems] = useState<string[]>(['HEAD_COVER', 'HAND_COVER', 'FACE_COVER']);
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

  const handleUpload = async () => {
    if (!file) {
      toast.error('Por favor, selecciona una imagen');
      return;
    }

    setProgress(0);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(Math.min(currentProgress, 100));
      if (currentProgress >= 100) clearInterval(interval);
    }, 500);

    try {
      // Obtener presigned URL
      const apiUrl = 'https://kmekzxexq5.execute-api.us-east-1.amazonaws.com/prod/upload';
      const presignedRes = await axios.get(apiUrl, {
        params: { filename: file.name },
      });
      console.log('API Response:', presignedRes.data);

      let presignedUrl = presignedRes.data.url;
      if (typeof presignedUrl === 'string') {
        presignedUrl = presignedUrl.trim();
      } else {
        throw new Error('URL de subida inválida');
      }

      console.log('Presigned URL:', presignedUrl);

      // Subir la imagen al bucket
      await axios.put(presignedUrl, file, {
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 30) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      setProgress(40);

      // Actualizar la URL de la imagen
      setImageUrl(`https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${file.name}`);

      // Invocar la Lambda para análisis
      const analyzeApiUrl = 'https://tf52bbq6o6.execute-api.us-east-1.amazonaws.com/prod/analyze';
      const lambdaPayload = {
        bucket: 'rekognition-gcontreras',
        filename: `input/${file.name}`,
        detection_type: detectionType,
        min_confidence: minConfidence,
      };
      console.log('Payload enviado a analyze:', lambdaPayload);

      const analyzeRes = await axios.post(analyzeApiUrl, lambdaPayload);
      setProgress(50);
      const jsonKey = analyzeRes.data.resultsFile; // Obtener el nombre único del JSON
      console.log('JSON Key recibido:', jsonKey); // Depuración

      // Esperar el JSON
      const jsonUrl = `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/${jsonKey}`;

      setTimeout(async () => {
        try {
          const res = await axios.get(jsonUrl);
          setResults(res.data);
          setProgress(70);
          if (res.data.DetectionType === 'ppe_detection' && res.data.Summary.compliant < res.data.Summary.totalPersons) {
            toast.error(`Alerta: ${res.data.Summary.compliant} de ${res.data.Summary.totalPersons} personas cumplen con EPI`);
          }
          setProgress(100);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Verifica la conexión o el archivo JSON';
          toast.error('Error al obtener resultados: ' + errorMessage);
          setProgress(0);
          console.error(err);
        }
      }, 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
      toast.error('Error al subir la imagen: ' + errorMessage);
      setProgress(0);
      console.error(err);
    }
  };

  const exportCSV = () => {
    if (!results || results.DetectionType !== 'ppe_detection') return;
    const csvData = results.ProtectiveEquipment.flatMap((p: any, i: number) =>
      p.BodyParts.flatMap((bp: any) =>
        bp.EquipmentDetections.map((ed: any) => ({
          PersonID: i,
          BodyPart: bp.Name,
          Type: ed.Type,
          Confidence: ed.Confidence.toFixed(2),
          Compliant: ed.Confidence >= minConfidence ? 'Sí' : 'No',
        }))
      )
    );
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-epi.csv';
    a.click();
  };

  const handleEpiItemChange = (item: string) => {
    setEpiItems((prev) => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Análisis visual basado en algoritmos de detección - CoironTech</h1>
      
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Seleccionar Imagen</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-2 border p-2 rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Algoritmo de Detección</label>
        <select
          value={detectionType}
          onChange={(e) => setDetectionType(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="ppe_detection">EPI (Equipos de Protección)</option>
          <option value="face_detection">Rostros</option>
          <option value="label_detection">Objetos</option>
          <option value="text_detection">Texto</option>
          <option value="moderation_detection">Contenido Moderado</option>
          <option value="celebrity_detection">Celebridades</option>
        </select>
        {detectionType === 'ppe_detection' && (
          <div className="mt-2">
            <label className="block mb-2 font-semibold">Elementos a Auditar</label>
            <div>
              <label><input type="checkbox" value="HEAD_COVER" checked={epiItems.includes('HEAD_COVER')} onChange={() => handleEpiItemChange('HEAD_COVER')} /> Casco</label>
              <label><input type="checkbox" value="HAND_COVER" checked={epiItems.includes('HAND_COVER')} onChange={() => handleEpiItemChange('HAND_COVER')} /> Guantes</label>
              <label><input type="checkbox" value="FACE_COVER" checked={epiItems.includes('FACE_COVER')} onChange={() => handleEpiItemChange('FACE_COVER')} /> Mascarilla</label>
            </div>
            <label><input type="checkbox" checked={strictMode} onChange={() => setStrictMode(!strictMode)} /> Strict Mode (Todos los elementos requeridos)</label>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Confianza Mínima (%)</label>
        <input
          type="range"
          min="0"
          max="100"
          value={minConfidence}
          onChange={(e) => setMinConfidence(Number(e.target.value))}
          className="w-full"
        />
        <span>{minConfidence}%</span>
      </div>

      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Subir y Analizar
      </button>

      {progress > 0 && (
        <div className="mt-4">
          <progress value={progress} max="100" className="w-full" />
          <p>Progreso: {progress}%</p>
        </div>
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">Resultados</h2>
          {results.DetectionType === 'ppe_detection' && (
            <div className="mb-4">
              <p><strong>Total Personas:</strong> {results.Summary.totalPersons}</p>
              <p><strong>Cumplientes:</strong> {results.Summary.compliant}</p>
              <p><strong>Confianza Mínima:</strong> {minConfidence}%</p>
              <button
                onClick={exportCSV}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2"
              >
                Exportar Reporte CSV
              </button>
            </div>
          )}
          {results.DetectionType === 'face_detection' && (
            <div className="mb-4">
              <p><strong>Total Rostros:</strong> {results.Summary.totalFaces}</p>
              <p><strong>Confianza Mínima:</strong> {minConfidence}%</p>
            </div>
          )}
          {results.DetectionType === 'label_detection' && (
            <div className="mb-4">
              <p><strong>Total Objetos:</strong> {results.Summary.totalLabels}</p>
              <p><strong>Confianza Mínima:</strong> {minConfidence}%</p>
            </div>
          )}

          <h3 className="text-lg font-semibold">Imagen con Anotaciones</h3>
          <div style={{ position: 'relative', maxWidth: '100%' }}>
            <img ref={imageRef} src={imageUrl} alt="Original" style={{ maxWidth: '100%' }} onLoad={handleImageLoad} />
            <svg style={{ position: 'absolute', top: 0, left: 0, width: imageDimensions.width, height: imageDimensions.height }}>
              {results.DetectionType === 'ppe_detection' &&
                results.ProtectiveEquipment.map((p: any, i: number) => {
                  const box = p.BoundingBox;
                  const x = box.Left * imageDimensions.width;
                  const y = box.Top * imageDimensions.height;
                  const w = box.Width * imageDimensions.width;
                  const h = box.Height * imageDimensions.height;
                  const color = p.ProtectiveEquipmentSummarization?.AllRequiredEquipmentCovered ? 'green' : 'red';
                  return (
                    <g key={`person-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                      />
                      <text x={x} y={y - 5} fontSize="12" fill={color}>
                        Person {i} - {p.Confidence.toFixed(2)}%
                      </text>
                    </g>
                  );
                })}
              {results.DetectionType === 'ppe_detection' &&
                results.ProtectiveEquipment.flatMap((p: any) =>
                  p.BodyParts.flatMap((bp: any) =>
                    bp.EquipmentDetections.map((ed: any, j: number) => {
                      if (ed.Confidence >= minConfidence && (!epiItems.length || epiItems.includes(ed.Type))) {
                        const box = ed.BoundingBox;
                        const x = box.Left * imageDimensions.width;
                        const y = box.Top * imageDimensions.height;
                        const w = box.Width * imageDimensions.width;
                        const h = box.Height * imageDimensions.height;
                        const color = ed.Confidence >= minConfidence ? 'green' : 'red';
                        return (
                          <g key={`epi-${j}`}>
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              fill="none"
                              stroke={color}
                              strokeWidth="2"
                            />
                            <text x={x} y={y - 5} fontSize="12" fill={color}>
                              {ed.Type} - {ed.Confidence.toFixed(2)}%
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })
                  )
                )}
              {results.DetectionType === 'face_detection' &&
                results.Faces.map((f: any, i: number) => {
                  const box = f.BoundingBox;
                  const x = box.Left * imageDimensions.width;
                  const y = box.Top * imageDimensions.height;
                  const w = box.Width * imageDimensions.width;
                  const h = box.Height * imageDimensions.height;
                  return (
                    <g key={`face-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="none"
                        stroke="blue"
                        strokeWidth="2"
                      />
                      <text x={x} y={y - 5} fontSize="12" fill="blue">
                        Face {i} - {f.Confidence.toFixed(2)}%
                      </text>
                    </g>
                  );
                })}
              {results.DetectionType === 'label_detection' &&
                results.Labels.map((l: any, i: number) => {
                  const box = l.Instances?.[0]?.BoundingBox || { Left: 0, Top: 0, Width: 0.1, Height: 0.1 };
                  const x = box.Left * imageDimensions.width;
                  const y = box.Top * imageDimensions.height;
                  const w = box.Width * imageDimensions.width;
                  const h = box.Height * imageDimensions.height;
                  return (
                    <g key={`label-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="none"
                        stroke="purple"
                        strokeWidth="2"
                      />
                      <text x={x} y={y - 5} fontSize="12" fill="purple">
                        {l.Name} - {l.Confidence.toFixed(2)}%
                      </text>
                    </g>
                  );
                })}
              {results.DetectionType === 'text_detection' &&
                results.TextDetections.map((t: any, i: number) => {
                  if (t.Type === 'LINE') {
                    const box = t.Geometry.BoundingBox;
                    const x = box.Left * imageDimensions.width;
                    const y = box.Top * imageDimensions.height;
                    const w = box.Width * imageDimensions.width;
                    const h = box.Height * imageDimensions.height;
                    return (
                      <g key={`text-${i}`}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="none"
                          stroke="orange"
                          strokeWidth="2"
                        />
                        <text x={x} y={y - 5} fontSize="12" fill="orange">
                          {t.DetectedText} - {t.Confidence.toFixed(2)}%
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}
              {results.DetectionType === 'moderation_detection' &&
                results.ModerationLabels.map((m: any, i: number) => {
                  const box = m.BoundingBox || { Left: 0, Top: 0, Width: 0.1, Height: 0.1 };
                  const x = box.Left * imageDimensions.width;
                  const y = box.Top * imageDimensions.height;
                  const w = box.Width * imageDimensions.width;
                  const h = box.Height * imageDimensions.height;
                  return (
                    <g key={`moderation-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="none"
                        stroke="yellow"
                        strokeWidth="2"
                      />
                      <text x={x} y={y - 5} fontSize="12" fill="yellow">
                        {m.Name} - {m.Confidence.toFixed(2)}%
                      </text>
                    </g>
                  );
                })}
              {results.DetectionType === 'celebrity_detection' &&
                results.Celebrities.map((c: any, i: number) => {
                  const box = c.Face?.BoundingBox || { Left: 0, Top: 0, Width: 0.1, Height: 0.1 };
                  const x = box.Left * imageDimensions.width;
                  const y = box.Top * imageDimensions.height;
                  const w = box.Width * imageDimensions.width;
                  const h = box.Height * imageDimensions.height;
                  return (
                    <g key={`celebrity-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="none"
                        stroke="pink"
                        strokeWidth="2"
                      />
                      <text x={x} y={y - 5} fontSize="12" fill="pink">
                        {c.Name} - {c.MatchConfidence.toFixed(2)}%
                      </text>
                    </g>
                  );
                })}
            </svg>
          </div>

          <h3 className="text-lg font-semibold mt-4">Detalles de Detección</h3>
          {results.DetectionType === 'ppe_detection' && (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Persona ID</th>
                  <th className="border p-2">Parte del Cuerpo</th>
                  <th className="border p-2">Tipo de EPI</th>
                  <th className="border p-2">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {results.ProtectiveEquipment.flatMap((p: any, i: number) =>
                  p.BodyParts.flatMap((bp: any) =>
                    bp.EquipmentDetections.map((ed: any, j: number) => (
                      <tr key={`epi-${i}-${j}`}>
                        <td className="border p-2">{i}</td>
                        <td className="border p-2">{bp.Name}</td>
                        <td className="border p-2">{ed.Type}</td>
                        <td className="border p-2">{ed.Confidence.toFixed(2)}%</td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          )}
          {results.DetectionType === 'face_detection' && (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">ID Rostro</th>
                  <th className="border p-2">Confianza</th>
                  <th className="border p-2">Edad (Rango)</th>
                  <th className="border p-2">Género</th>
                </tr>
              </thead>
              <tbody>
                {results.Faces.map((f: any, i: number) => (
                  <tr key={`face-${i}`}>
                    <td className="border p-2">{i}</td>
                    <td className="border p-2">{f.Confidence.toFixed(2)}%</td>
                    <td className="border p-2">{`${f.AgeRange.Low}-${f.AgeRange.High}`}</td>
                    <td className="border p-2">{f.Gender.Value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results.DetectionType === 'label_detection' && (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Objeto</th>
                  <th className="border p-2">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {results.Labels.map((l: any, i: number) => (
                  <tr key={`label-${i}`}>
                    <td className="border p-2">{l.Name}</td>
                    <td className="border p-2">{l.Confidence.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results.DetectionType === 'text_detection' && (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Texto Detectado</th>
                  <th className="border p-2">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {results.TextDetections.map((t: any, i: number) => (
                  <tr key={`text-${i}`}>
                    <td className="border p-2">{t.DetectedText}</td>
                    <td className="border p-2">{t.Confidence.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results.DetectionType === 'moderation_detection' && (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Categoría</th>
                  <th className="border p-2">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {results.ModerationLabels.map((m: any, i: number) => (
                  <tr key={`moderation-${i}`}>
                    <td className="border p-2">{m.Name}</td>
                    <td className="border p-2">{m.Confidence.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results.DetectionType === 'celebrity_detection' && (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Celebridad</th>
                  <th className="border p-2">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {results.Celebrities.map((c: any, i: number) => (
                  <tr key={`celebrity-${i}`}>
                    <td className="border p-2">{c.Name}</td>
                    <td className="border p-2">{c.MatchConfidence.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default App;