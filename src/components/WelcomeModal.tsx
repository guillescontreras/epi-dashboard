import React from 'react';

interface WelcomeModalProps {
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-6 py-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden">
            <img src="/CoironTech-logo1.jpeg" alt="CoironTech" className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenido a CoironTech EPP Analyzer</h1>
          <p className="text-blue-100">Elementos de Protección Personal con IA</p>
        </div>

        <div className="p-6">
          {/* Funcionalidad Principal - EPP */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-300 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-3xl">🦺</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">⭐ Detección de EPP con IA Avanzada</h3>
                  <p className="text-sm text-gray-700 mb-3">Análisis inteligente de Equipos de Protección Personal con tecnología de visión artificial y modelos de IA generativa</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className="text-green-600">✓</span>
                      <span>Etiquetado automático</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className="text-green-600">✓</span>
                      <span>Resúmenes con IA</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className="text-green-600">✓</span>
                      <span>Reportes profesionales</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className="text-green-600">✓</span>
                      <span>Normas OSHA/ISO 45001</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Funcionalidades Adicionales */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-semibold">Funcionalidades adicionales</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                  <span className="text-lg">👤</span>
                </div>
                <p className="text-xs text-gray-600">Detección facial</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                  <span className="text-lg">🏷️</span>
                </div>
                <p className="text-xs text-gray-600">Objetos</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                  <span className="text-lg">📝</span>
                </div>
                <p className="text-xs text-gray-600">Texto</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                  <span className="text-lg">📹</span>
                </div>
                <p className="text-xs text-gray-600 flex items-center justify-center">
                  <span>Tiempo real</span>
                  <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">Beta</span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Comenzar Análisis →
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
