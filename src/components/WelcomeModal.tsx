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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <span className="text-2xl">🦺</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Detección EPP</h3>
              <p className="text-xs text-gray-600">Cascos, guantes, mascarillas</p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200 text-center">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <span className="text-2xl">📹</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Tiempo Real</h3>
              <p className="text-xs text-gray-600">Análisis desde cámara</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Reportes</h3>
              <p className="text-xs text-gray-600">Exporta resultados CSV</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">IA Avanzada</h3>
              <p className="text-xs text-gray-600">Visión Artificial + IA Generativa</p>
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
