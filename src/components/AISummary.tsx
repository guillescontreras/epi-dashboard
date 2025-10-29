import React from 'react';

interface AISummaryProps {
  summary: string;
}

const AISummary: React.FC<AISummaryProps> = ({ summary }) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">🤖</span>
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Resumen Inteligente</h3>
          <p className="text-sm text-gray-600">Análisis generado por IA</p>
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <p className="text-gray-800 leading-relaxed">{summary}</p>
      </div>
    </div>
  );
};

export default AISummary;