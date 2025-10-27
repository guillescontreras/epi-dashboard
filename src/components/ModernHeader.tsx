import React from 'react';

interface ModernHeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onGuidedMode?: () => void;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({ activeSection, onSectionChange, onGuidedMode }) => {
  const sections = [
    { id: 'analysis', name: 'Análisis', icon: '🔬' },
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'history', name: 'Historial', icon: '📈' }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 space-y-4 sm:space-y-0">
          {/* Logo y Título */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/CoironTech-logo1.jpeg" alt="CoironTech" className="w-full h-full object-contain p-1" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">CoironTech AI</h1>
              <p className="text-xs sm:text-sm text-purple-200">Análisis Visual Inteligente</p>
            </div>
          </div>
          
          {/* Status Indicator - Solo en desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Sistema Activo</span>
            </div>
            {onGuidedMode && (
              <button
                onClick={onGuidedMode}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm flex items-center space-x-2"
              >
                <span>🧭</span>
                <span>Asistente</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Navegación Móvil */}
        <div className="pb-4">
          <nav className="flex justify-center sm:justify-start">
            <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 w-full sm:w-auto">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-white text-purple-900 shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  <span className="text-base sm:text-sm">{section.icon}</span>
                  <span className="mt-1 sm:mt-0">{section.name}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ModernHeader;