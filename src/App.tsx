import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Papa from 'papaparse';
import ModernHeader from './components/ModernHeader';
import ModernAnalysisPanel from './components/ModernAnalysisPanel';
import Dashboard from './components/Dashboard';

import ImageComparison from './components/ImageComparison';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('analysis');
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const [detectionType, setDetectionType] = useState<string>('ppe_detection');
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [progress, setProgress] = useState<number>(0);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [epiItems, setEpiItems] = useState<string[]>(['HEAD_COVER', 'EYE_COVER', 'HAND_COVER', 'FOOT_COVER', 'FACE_COVER', 'EAR_COVER']);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);


  const handleUpload = async () => {
    if (!file) {
      toast.error('Por favor, selecciona una imagen');
      return;
    }

    // Validar formato de archivo
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validFormats.includes(file.type)) {
      toast.error('Formato no soportado. Use JPEG o PNG únicamente.');
      return;
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 100));
    }, 500);

    try {
      // Obtener presigned URL para subir
      const uploadApiUrl = 'https://kmekzxexq5.execute-api.us-east-1.amazonaws.com/prod/upload';
      const presignedRes = await axios.get(uploadApiUrl, { params: { filename: file.name } });
      console.log('API Response:', presignedRes.data);

      let presignedUrl = presignedRes.data.url;
      if (typeof presignedUrl !== 'string' || !presignedUrl.trim()) {
        throw new Error('URL de subida inválida');
      }
      presignedUrl = presignedUrl.trim();
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
        epi_items: detectionType === 'ppe_detection' ? epiItems : undefined,
      };
      console.log('Payload enviado a analyze:', lambdaPayload);

      const analyzeRes = await axios.post(analyzeApiUrl, lambdaPayload);
      setProgress(50);
      
      console.log('Respuesta completa de Lambda:', analyzeRes);
      console.log('Status de respuesta:', analyzeRes.status);
      console.log('Data de respuesta:', analyzeRes.data);

      // Parsear el body si viene como string
      let responseData = analyzeRes.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (parseError) {
          console.error('Error parseando respuesta:', parseError);
          throw new Error('Respuesta de análisis inválida');
        }
      }
      
      // Si la respuesta tiene body como string, parsearlo
      if (responseData.body && typeof responseData.body === 'string') {
        try {
          responseData = JSON.parse(responseData.body);
        } catch (parseError) {
          console.error('Error parseando body:', parseError);
          throw new Error('Respuesta de análisis inválida');
        }
      }
      
      console.log('ResponseData final procesada:', responseData);

      const jsonPresignedUrl = responseData.presignedUrl;

      if (!jsonPresignedUrl || typeof jsonPresignedUrl !== 'string') {
        console.error('Estructura de respuesta completa:', analyzeRes.data);
        console.error('ResponseData procesada:', responseData);
        console.error('PresignedUrl encontrada:', jsonPresignedUrl);
        throw new Error('URL presigned para JSON no válida');
      }

      // Obtener el JSON usando la presigned URL
      const res = await axios.get(jsonPresignedUrl);
      const analysisResult = { ...res.data, timestamp: Date.now() };
      setResults(analysisResult);
      setAnalysisHistory(prev => [...prev, analysisResult]);
      setProgress(70);

      if (res.data.DetectionType === 'ppe_detection' && res.data.Summary.compliant < res.data.Summary.totalPersons) {
        toast.error(`Alerta: ${res.data.Summary.compliant} de ${res.data.Summary.totalPersons} personas cumplen con EPI`);
      }

      setProgress(100);
      setTimeout(() => {
        setProgress(0);
        clearInterval(interval);
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
      if (errorMessage.includes('invalid image format')) {
        toast.error('Formato de imagen no soportado. Use JPEG o PNG únicamente.');
      } else {
        toast.error('Error en el proceso: ' + errorMessage);
      }
      setTimeout(() => {
        setProgress(0);
        clearInterval(interval);
      }, 1000);
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

  const renderContent = () => {
    switch (activeSection) {
      case 'analysis':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <ModernAnalysisPanel
                file={file}
                setFile={setFile}
                detectionType={detectionType}
                setDetectionType={setDetectionType}
                minConfidence={minConfidence}
                setMinConfidence={setMinConfidence}
                epiItems={epiItems}
                handleEpiItemChange={handleEpiItemChange}
                strictMode={strictMode}
                setStrictMode={setStrictMode}
                handleUpload={handleUpload}
                progress={progress}
              />
            </div>
            <div className="space-y-6">
              {results && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📊</span>
                      <span>Resultados del Análisis</span>
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    {results.DetectionType === 'ppe_detection' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white text-center">
                            <p className="text-3xl font-bold">{results.Summary?.totalPersons || 0}</p>
                            <p className="text-sm opacity-90">Personas Detectadas</p>
                          </div>
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white text-center">
                            <p className="text-3xl font-bold">{results.Summary?.compliant || 0}</p>
                            <p className="text-sm opacity-90">Cumplientes</p>
                          </div>
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                            <p className="text-3xl font-bold">{minConfidence}%</p>
                            <p className="text-sm opacity-90">Confianza Mínima</p>
                          </div>
                        </div>
                        
                        {/* Resumen por Elemento EPI */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Elementos EPI Seleccionados:</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {epiItems.map((item) => {
                              const itemName = item === 'HEAD_COVER' ? 'Casco' :
                                             item === 'EYE_COVER' ? 'Gafas' :
                                             item === 'HAND_COVER' ? 'Guantes' :
                                             item === 'FOOT_COVER' ? 'Calzado' :
                                             item === 'FACE_COVER' ? 'Mascarilla' :
                                             item === 'EAR_COVER' ? 'Orejeras' : item;
                              
                              // Contar detecciones de este elemento
                              const detections = results.ProtectiveEquipment?.reduce((count: number, person: any) => {
                                return count + (person.BodyParts?.reduce((partCount: number, part: any) => {
                                  return partCount + (part.EquipmentDetections?.filter((eq: any) => 
                                    eq.Type === item && eq.Confidence >= minConfidence
                                  ).length || 0);
                                }, 0) || 0);
                              }, 0) || 0;
                              
                              return (
                                <div key={item} className={`flex items-center justify-between p-2 rounded ${
                                  detections > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  <span>{itemName}</span>
                                  <span className="font-bold">{detections > 0 ? '✓' : '✗'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <button
                          onClick={exportCSV}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                        >
                          <span>📄</span>
                          <span>Exportar Reporte</span>
                        </button>
                      </div>
                    )}
                    {results.DetectionType === 'face_detection' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalFaces || 0}</p>
                          <p className="text-sm opacity-90">Rostros Detectados</p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{minConfidence}%</p>
                          <p className="text-sm opacity-90">Confianza Mínima</p>
                        </div>
                      </div>
                    )}
                    {results.DetectionType === 'text_detection' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{results.Summary?.totalTextDetections || 0}</p>
                          <p className="text-sm opacity-90">Textos Detectados</p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white text-center">
                          <p className="text-3xl font-bold">{minConfidence}%</p>
                          <p className="text-sm opacity-90">Confianza Mínima</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'dashboard':
        return <Dashboard analysisHistory={analysisHistory} />;
      case 'history':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📋 Historial de Análisis</h2>
            {analysisHistory.length > 0 ? (
              <div className="space-y-4">
                {analysisHistory.map((analysis, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {analysis.DetectionType === 'ppe_detection' ? '🦺 Análisis EPI' :
                           analysis.DetectionType === 'face_detection' ? '👤 Detección Rostros' :
                           analysis.DetectionType === 'text_detection' ? '📝 Detección Texto' :
                           analysis.DetectionType === 'label_detection' ? '🏷️ Detección Objetos' :
                           '🔍 Análisis General'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Confianza: {analysis.MinConfidence}%</p>
                        {analysis.Summary && (
                          <p className="text-sm text-gray-600">
                            {analysis.DetectionType === 'ppe_detection' && 
                              `${analysis.Summary.compliant}/${analysis.Summary.totalPersons} cumplientes`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500">No hay análisis en el historial</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <ModernHeader activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
        
        {/* Visualización de Resultados */}
        {results && activeSection === 'analysis' && imageUrl && (
          <div className="mt-8">
            <ImageComparison 
              results={results}
              imageUrl={imageUrl}
              minConfidence={minConfidence}
              epiItems={epiItems}
            />
          </div>
        )}
      </main>

      <ToastContainer position="top-right" />
      
      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CT</span>
              </div>
              <div>
                <p className="text-sm font-medium">Desarrollado por CoironTech</p>
                <p className="text-xs text-purple-200">Soluciones de IA para la industria</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
              <a 
                href="mailto:info@coirontech.com" 
                className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
              >
                <span>✉️</span>
                <span>info@coirontech.com</span>
              </a>
              <a 
                href="https://www.coirontech.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
              >
                <span>🌐</span>
                <span>www.coirontech.com</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;