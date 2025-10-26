import React from 'react';

interface ModernHeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({ activeSection, onSectionChange }) => {
  const sections = [
    { id: 'analysis', name: 'Análisis', icon: '🔬' },
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'history', name: 'Historial', icon: '📈' }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo y Título */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">CT</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CoironTech AI</h1>
              <p className="text-sm text-purple-200">Análisis Visual Inteligente</p>
            </div>
          </div>
          
          {/* Navegación */}
          <nav className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-xl p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-white text-purple-900 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.name}</span>
              </button>
            ))}
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Sistema Activo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernHeader;