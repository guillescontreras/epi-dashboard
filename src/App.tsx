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

    try {
      // Obtener presigned URL
      const apiUrl = 'https://kmekzxexq5.execute-api.us-east-1.amazonaws.com/prod/upload'; // Tu URL
      const presignedRes = await axios.get(apiUrl, {
        params: { filename: file.name },
      });
      console.log('API Response:', presignedRes.data);

      let presignedUrl = presignedRes.data.url;
      if (typeof presignedUrl === 'string') {
        presignedUrl = presignedUrl.trim(); // Eliminar espacios en blanco
      } else {
        throw new Error('URL de subida inválida');
      }

      console.log('Presigned URL:', presignedUrl);

      // Subir la imagen al bucket
      await axios.put(presignedUrl, file, {
        headers: { 'Content-Type': file.type || 'image/jpeg' },
      });

      // Actualizar la URL de la imagen
      setImageUrl(`https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/input/${file.name}`);

      // Esperar el JSON (simulado por ahora)
      const baseName = file.name.split('.')[0];
      const jsonUrl = `https://rekognition-gcontreras.s3.us-east-1.amazonaws.com/web/${baseName}.json`;

      setTimeout(async () => {
        try {
          const res = await axios.get(jsonUrl);
          setResults(res.data);
          if (res.data.DetectionType === 'ppe_detection' && res.data.Summary.compliant < res.data.Summary.totalPersons) {
            toast.error(`Alerta: ${res.data.Summary.compliant} de ${res.data.Summary.totalPersons} personas cumplen con EPI`);
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Verifica la conexión o el archivo JSON';
          toast.error('Error al obtener resultados: ' + errorMessage);
          console.error(err);
        }
      }, 5000); // Aumentado a 5 segundos para dar más tiempo a la Lambda
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
      toast.error('Error al subir la imagen: ' + errorMessage);
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
          Compliant: ed.Confidence >= results.MinConfidence ? 'Sí' : 'No',
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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard de Auditoría EPI</h1>
      
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
        <label className="block mb-2 font-semibold">Tipo de Detección</label>
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
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Confianza Mínima (%)</label>
        <input
          type="number"
          value={minConfidence}
          onChange={(e) => setMinConfidence(Number(e.target.value))}
          min="0"
          max="100"
          className="p-2 border rounded w-full"
        />
      </div>

      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Subir y Analizar
      </button>

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">Resultados</h2>
          {results.DetectionType === 'ppe_detection' && (
            <div className="mb-4">
              <p><strong>Total Personas:</strong> {results.Summary.totalPersons}</p>
              <p><strong>Cumplientes:</strong> {results.Summary.compliant}</p>
              <p><strong>Confianza Mínima:</strong> {results.Summary.minConfidence}%</p>
              <button
                onClick={exportCSV}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mt-2"
              >
                Exportar Reporte CSV
              </button>
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
                  return (
                    <g key={`person-${i}`}>
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
                        Person {i} - {p.Confidence.toFixed(2)}%
                      </text>
                    </g>
                  );
                })}
              {results.DetectionType === 'ppe_detection' &&
                results.ProtectiveEquipment.flatMap((p: any) =>
                  p.BodyParts.flatMap((bp: any) =>
                    bp.EquipmentDetections.map((ed: any, j: number) => {
                      if (ed.Confidence >= results.MinConfidence) {
                        const box = ed.BoundingBox;
                        const x = box.Left * imageDimensions.width;
                        const y = box.Top * imageDimensions.height;
                        const w = box.Width * imageDimensions.width;
                        const h = box.Height * imageDimensions.height;
                        return (
                          <g key={`epi-${j}`}>
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              fill="none"
                              stroke="green"
                              strokeWidth="2"
                            />
                            <text x={x} y={y - 5} fontSize="12" fill="green">
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
                        stroke="red"
                        strokeWidth="2"
                      />
                      <text x={x} y={y - 5} fontSize="12" fill="red">
                        Face {i} - {f.Confidence.toFixed(2)}%
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
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default App;