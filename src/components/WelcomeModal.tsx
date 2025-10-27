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
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenido a CoironTech EPI Analyzer</h1>
          <p className="text-blue-100">Análisis inteligente de seguridad con IA</p>
        </div>

        <div className="p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">✨ Características Principales</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🦺</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Detección de EPIs</h3>
              <p className="text-sm text-gray-600">Identifica cascos, guantes, mascarillas y más elementos de protección personal</p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 sm:p-6 border border-pink-200">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">📹</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Tiempo Real</h3>
              <p className="text-sm text-gray-600">Análisis instantáneo desde tu cámara con detección en vivo</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 sm:p-6 border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Análisis Facial</h3>
              <p className="text-sm text-gray-600">Detecta rostros, emociones y características demográficas</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 sm:p-6 border border-purple-200">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🏷️</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Detección de Objetos</h3>
              <p className="text-sm text-gray-600">Identifica objetos, herramientas y elementos en el entorno</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🛠️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Modelo en Desarrollo</h4>
                <p className="text-sm text-gray-700">
                  El modo de tiempo real está en fase de entrenamiento para detectar EPIs específicos. 
                  Para análisis preciso de equipos de protección, usa el análisis de imágenes.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-base sm:text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Comenzar Análisis →
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
