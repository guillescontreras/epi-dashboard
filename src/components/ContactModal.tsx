import React, { useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';

interface ContactModalProps {
  onClose: () => void;
  initialTab?: TabType;
  initialMessage?: string;
  userProfile?: any;
}

type TabType = 'contact' | 'feature' | 'bug';
type MessageType = 'Contacto General' | 'Solicitud de Característica' | 'Reporte de Bug';

const ContactModal: React.FC<ContactModalProps> = ({ onClose, initialTab = 'contact', initialMessage = '', userProfile }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [formData, setFormData] = useState({
    name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
    email: userProfile?.email || '',
    subject: '',
    message: initialMessage
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const getMessageType = (): MessageType => {
    switch (activeTab) {
      case 'contact': return 'Contacto General';
      case 'feature': return 'Solicitud de Característica';
      case 'bug': return 'Reporte de Bug';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const user = await getCurrentUser();
      const userId = user.userId;

      const payload = {
        userId,
        messageType: getMessageType(),
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Error al enviar mensaje');

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
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

  const getTabContent = () => {
    switch (activeTab) {
      case 'contact':
        return {
          title: '📧 Contacto General',
          description: 'Envíanos tus consultas, sugerencias o comentarios',
          subjectPlaceholder: 'Ej: Consulta sobre funcionalidades'
        };
      case 'feature':
        return {
          title: '💡 Solicitar Característica',
          description: 'Cuéntanos qué funcionalidad te gustaría ver en CoironTech AI',
          subjectPlaceholder: 'Ej: Exportar informes en formato Excel'
        };
      case 'bug':
        return {
          title: '🐛 Reportar Bug',
          description: 'Ayúdanos a mejorar reportando errores o problemas técnicos',
          subjectPlaceholder: 'Ej: Error al cargar historial de análisis'
        };
    }
  };

  const content = getTabContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Contáctanos</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'contact'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📧 Contacto
          </button>
          <button
            onClick={() => setActiveTab('feature')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'feature'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            💡 Feature
          </button>
          <button
            onClick={() => setActiveTab('bug')}
            className={`flex-1 py-4 px-6 font-semibold transition-all ${
              activeTab === 'bug'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🐛 Bug
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h3>
            <p className="text-gray-600">{content.description}</p>
          </div>

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
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={content.subjectPlaceholder}
              />
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
