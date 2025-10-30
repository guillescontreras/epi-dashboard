import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const typeColors = {
    danger: 'from-red-600 to-pink-600',
    warning: 'from-orange-600 to-yellow-600',
    info: 'from-blue-600 to-purple-600'
  };

  const iconEmoji = {
    danger: '⚠️',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
        <div className={`bg-gradient-to-r ${typeColors[type]} px-6 py-4 rounded-t-2xl`}>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{iconEmoji[type]}</span>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed">{message}</p>
        </div>

        <div className="flex space-x-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 bg-gradient-to-r ${typeColors[type]} text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
