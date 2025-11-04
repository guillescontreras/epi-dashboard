import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getCurrentUser } from 'aws-amplify/auth';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId?: string;
  userName?: string;
  analysisType?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, analysisId, userName, analysisType }) => {
  const [rating, setRating] = useState<number>(0);
  const [aiAccurate, setAiAccurate] = useState<boolean | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setLoading(true);

    try {
      const user = await getCurrentUser();
      
      const feedbackData = {
        userId: user.username,
        analysisId: analysisId || 'general',
        rating,
        aiAccurate,
        comments,
        userName: userName || 'Usuario',
        analysisType: analysisType || 'general',
        timestamp: new Date().toISOString()
      };

      await axios.post('https://n0f5jga1wc.execute-api.us-east-1.amazonaws.com/prod/feedback', feedbackData);
      
      toast.success('¡Gracias por tu feedback!');
      onClose();
      
      // Reset form
      setRating(0);
      setAiAccurate(null);
      setComments('');
    } catch (error) {
      console.error('Error enviando feedback:', error);
      toast.error('Error al enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>💬</span>
            <span>Tu Opinión es Importante</span>
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Calificación con estrellas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿Qué tan útil fue el análisis?
            </label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center mt-2 text-sm text-gray-600">
                {rating === 1 && 'Muy poco útil'}
                {rating === 2 && 'Poco útil'}
                {rating === 3 && 'Útil'}
                {rating === 4 && 'Muy útil'}
                {rating === 5 && '¡Excelente!'}
              </p>
            )}
          </div>

          {/* Precisión de IA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿El resumen de IA fue preciso?
            </label>
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={() => setAiAccurate(true)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  aiAccurate === true
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👍 Sí
              </button>
              <button
                type="button"
                onClick={() => setAiAccurate(false)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  aiAccurate === false
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👎 No
              </button>
            </div>
          </div>

          {/* Comentarios opcionales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentarios (opcional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Cuéntanos más sobre tu experiencia..."
            />
          </div>

          {/* Botones */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
