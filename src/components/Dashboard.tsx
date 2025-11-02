import React from 'react';

interface DashboardProps {
  analysisHistory: any[];
  calculateCompliance: (analysisData: any, selectedEPPs: string[], confidenceThreshold: number) => number;
}

const Dashboard: React.FC<DashboardProps> = ({ analysisHistory, calculateCompliance }) => {
  const totalAnalysis = analysisHistory.length;
  const ppeAnalysis = analysisHistory.filter(a => a.DetectionType === 'ppe_detection').length;
  const avgConfidence = analysisHistory.length > 0 
    ? (analysisHistory.reduce((sum, a) => sum + (a.MinConfidence || 0), 0) / analysisHistory.length).toFixed(1)
    : 0;

  // Calcular estadísticas de cumplimiento EPP
  const ppeStats = analysisHistory
    .filter(a => a.DetectionType === 'ppe_detection' && a.Summary)
    .reduce((acc, a) => {
      acc.totalPersons += a.Summary.totalPersons || 0;
      acc.compliantPersons += calculateCompliance(a, a.selectedEPPs || [], a.MinConfidence || 75);
      return acc;
    }, { totalPersons: 0, compliantPersons: 0 });

  const complianceRate = ppeStats.totalPersons > 0 
    ? ((ppeStats.compliantPersons / ppeStats.totalPersons) * 100).toFixed(1)
    : '0';

  const recentAnalysis = analysisHistory.slice(-6).reverse();

  const stats = [
    { 
      label: 'Total Análisis', 
      value: totalAnalysis, 
      icon: '📊', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Análisis EPP', 
      value: ppeAnalysis, 
      icon: '🦺', 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    { 
      label: 'Cumplimiento EPP', 
      value: `${complianceRate}%`, 
      icon: '✅', 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    { 
      label: 'Confianza Promedio', 
      value: `${avgConfidence}%`, 
      icon: '🎯', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header del Dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard de Análisis</h1>
            <p className="text-blue-100">Monitoreo en tiempo real de detección de EPP y análisis facial</p>
          </div>
          <div className="text-6xl opacity-20">📈</div>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className={`h-2 bg-gradient-to-r ${stat.color}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>{stat.value}</p>
                </div>
                <div className={`w-16 h-16 ${stat.bgColor} rounded-full flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Análisis Recientes y Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Análisis Recientes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">🕒 Análisis Recientes</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Últimos {recentAnalysis.length}
            </span>
          </div>
          
          {recentAnalysis.length > 0 ? (
            <div className="space-y-4">
              {recentAnalysis.map((analysis, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
                        analysis.DetectionType === 'ppe_detection' ? 'bg-green-100 text-green-600' :
                        analysis.DetectionType === 'face_detection' ? 'bg-blue-100 text-blue-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {analysis.DetectionType === 'ppe_detection' ? '🦺' : 
                         analysis.DetectionType === 'face_detection' ? '👤' : '🔍'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {analysis.DetectionType === 'ppe_detection' ? 'Análisis EPP' :
                           analysis.DetectionType === 'face_detection' ? 'Detección Rostros' :
                           'Análisis General'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(analysis.timestamp || Date.now()).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Confianza: {analysis.MinConfidence}%
                      </p>
                      {analysis.Summary && (
                        <p className="text-sm text-gray-500">
                          {analysis.DetectionType === 'ppe_detection' && 
                            `${calculateCompliance(analysis, analysis.selectedEPPs || [], analysis.MinConfidence || 75)}/${analysis.Summary.totalPersons} cumplientes`}
                          {analysis.DetectionType === 'face_detection' && 
                            `${analysis.Summary.totalFaces} rostros detectados`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay análisis recientes</h3>
              <p className="text-gray-500">Comienza subiendo una imagen para ver los resultados aquí</p>
            </div>
          )}
        </div>

        {/* Estadísticas de Cumplimiento */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📈 Estadísticas de Cumplimiento</h2>
          
          {ppeAnalysis > 0 ? (
            <div className="space-y-6">
              {/* Indicador de Cumplimiento */}
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`${parseFloat(complianceRate.toString()) >= 80 ? 'text-green-500' : parseFloat(complianceRate.toString()) >= 60 ? 'text-yellow-500' : 'text-red-500'}`}
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${complianceRate}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{complianceRate}%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Tasa de Cumplimiento General</p>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{ppeStats.totalPersons}</p>
                  <p className="text-sm text-gray-600">Personas Analizadas</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{ppeStats.compliantPersons}</p>
                  <p className="text-sm text-gray-600">Personas Cumplientes</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">📈</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin datos de EPP</h3>
              <p className="text-gray-500">Realiza análisis de EPP para ver las estadísticas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;