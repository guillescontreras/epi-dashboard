import React, { useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';

interface ContactModalProps {
  onClose: () => void;
  initialTab?: 'contact' | 'feature' | 'bug';
  initialMessage?: string;
  userProfile?: any;
  analysisId?: string;
}

type MessageType = 'Contacto' | 'Requerimiento de Característica' | 'Reporte de Bug' | 'Soporte';

const ContactModal: React.FC<ContactModalProps> = ({ onClose, initialTab = 'contact', initialMessage = '', userProfile, analysisId }) => {
  const getInitialMessageType = (): MessageType => {
    if (initialTab === 'bug') return 'Reporte de Bug';
    if (initialTab === 'feature') return 'Requerimiento de Característica';
    return 'Contacto';
  };

  const [formData, setFormData] = useState({
    name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
    email: userProfile?.email || '',
    messageType: getInitialMessageType(),
    message: initialMessage,
    analysisId: ''
  });

  React.useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: `${userProfile.firstName} ${userProfile.lastName}`,
        email: userProfile.email || ''
      }));
    }
  }, [userProfile]);

  React.useEffect(() => {
    if (analysisId) {
      setFormData(prev => ({
        ...prev,
        analysisId: analysisId
      }));
    }
  }, [analysisId]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const user = await getCurrentUser();
      const userId = user.userId;

      const payload = {
        userId,
        messageType: formData.messageType,
        name: formData.name,
        email: formData.email,
        message: formData.message,
        analysisId: formData.analysisId || undefined,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Error al enviar mensaje');

      setSubmitStatus('success');
      setFormData({ name: '', email: '', messageType: 'Contacto', message: '', analysisId: '' });
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Formulario de Contacto</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Success/Error Messages */}
          {submitStatus === 'success' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              ✅ Mensaje enviado exitosamente. Te responderemos pronto.
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              ❌ Error al enviar el mensaje. Por favor intenta nuevamente.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asunto *
              </label>
              <select
                required
                value={formData.messageType}
                onChange={(e) => setFormData({ ...formData, messageType: e.target.value as MessageType })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Contacto">Contacto</option>
                <option value="Requerimiento de Característica">Requerimiento de Característica</option>
                <option value="Reporte de Bug">Reporte de Bug</option>
                <option value="Soporte">Soporte</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mensaje *
              </label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe tu consulta, sugerencia o problema en detalle..."
              />
            </div>

            {analysisId && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ID de Análisis
                </label>
                <input
                  type="text"
                  value={formData.analysisId}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Este ID ayudará a nuestro equipo a identificar el análisis específico</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
