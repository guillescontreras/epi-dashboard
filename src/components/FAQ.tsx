import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData: FAQItem[] = [
    {
      question: '¿Qué es EPP?',
      answer: 'EPP significa Equipo de Protección Personal. Son elementos diseñados para proteger a los trabajadores de riesgos laborales que puedan amenazar su seguridad o salud. Incluyen cascos, gafas de seguridad, guantes, calzado de seguridad, mascarillas y protección auditiva.'
    },
    {
      question: '¿Cómo funciona la detección de EPP?',
      answer: 'Nuestro sistema utiliza tecnología de inteligencia artificial con el soporte de AWS para analizar imágenes y videos, detectando personas y el equipo de protección que están usando. El sistema identifica automáticamente cascos, gafas, guantes, calzado de seguridad, mascarillas y protección auditiva con un nivel de confianza configurable. Trabajamos día a día mejorando nuestros modelos de detección para ofrecer resultados cada vez más precisos.'
    },
    {
      question: '¿Qué normas de seguridad se utilizan?',
      answer: 'Los informes generados se basan en las normas internacionales OSHA (Occupational Safety and Health Administration) e ISO 45001 (Sistema de Gestión de Seguridad y Salud en el Trabajo). Estas normas establecen los requisitos mínimos de seguridad laboral y gestión de riesgos.'
    },
    {
      question: '¿Cómo interpretar los resultados del análisis?',
      answer: 'El análisis muestra: 1) Total de personas detectadas, 2) Personas cumplientes (con todos los EPP requeridos), 3) Porcentaje de cumplimiento, 4) Detalle de EPP por persona. Un resumen generado por IA proporciona recomendaciones específicas y plazos para acciones correctivas según el nivel de cumplimiento.'
    },
    {
      question: '¿Qué nivel de confianza debo usar?',
      answer: 'El nivel de confianza mínimo recomendado es 75%. Valores más altos (85-95%) reducen falsos positivos pero pueden perder detecciones válidas. Valores más bajos (60-70%) detectan más EPP pero pueden incluir falsos positivos. Para inspecciones formales, recomendamos 80-85%.'
    },
    {
      question: '¿Los análisis se guardan automáticamente?',
      answer: 'Sí, todos los análisis de EPP se guardan automáticamente en tu historial personal. Puedes acceder a ellos en cualquier momento desde la sección "Historial", ver los informes completos, descargar PDFs y eliminar análisis que ya no necesites.'
    },
    {
      question: '¿Puedo exportar los informes?',
      answer: 'Sí, puedes descargar informes en formato PDF profesional que incluyen: logo de CoironTech, fecha y hora del análisis, nombre del inspector, resumen estadístico, análisis inteligente generado por IA, tabla detallada de detecciones y referencias a normas OSHA e ISO 45001.'
    },
    {
      question: '¿Qué tipos de análisis están disponibles?',
      answer: 'Ofrecemos varios tipos: 1) Análisis de EPP (detección de equipo de protección), 2) Detección de rostros, 3) Detección de texto en imágenes, 4) Detección de objetos, 5) Análisis en tiempo real con webcam (BETA), 6) Procesamiento de video (en desarrollo).'
    },
    {
      question: '¿Mis datos están seguros?',
      answer: 'Sí, utilizamos AWS (Amazon Web Services) con las mejores prácticas de seguridad. Tus datos están encriptados en tránsito y en reposo. Solo tú tienes acceso a tu historial de análisis. No compartimos información personal con terceros. Cumplimos con estándares internacionales de protección de datos.'
    },
    {
      question: '¿Puedo usar el sistema en dispositivos móviles?',
      answer: 'Sí, la aplicación es completamente responsive y funciona en smartphones y tablets. Puedes capturar fotos directamente con la cámara de tu dispositivo, realizar análisis y descargar informes PDF desde cualquier lugar.'
    },
    {
      question: '¿Cómo contacto con soporte técnico?',
      answer: 'Puedes contactarnos a través del formulario de contacto en el footer de la aplicación o enviando un email a info@coirontech.com. También puedes reportar bugs o solicitar nuevas características desde el menú de usuario.'
    },
    {
      question: '¿El sistema funciona offline?',
      answer: 'No, el sistema requiere conexión a internet para funcionar ya que utiliza servicios de inteligencia artificial en la nube de AWS. Sin embargo, una vez descargados, los informes PDF pueden visualizarse sin conexión.'
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ❓ Preguntas Frecuentes
          </h1>
          <p className="text-lg text-gray-600">
            Encuentra respuestas a las preguntas más comunes sobre CoironTech AI
          </p>
        </div>

        {/* FAQ Acordeones */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg"
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {item.question}
                </span>
                <span
                  className={`text-2xl text-blue-600 transition-transform duration-200 ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>
              
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-4 text-gray-700 leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer de ayuda */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-3">¿No encontraste lo que buscabas?</h3>
          <p className="mb-6 text-blue-100">
            Contáctanos y estaremos encantados de ayudarte
          </p>
          <a
            href="mailto:info@coirontech.com"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
          >
            📧 Contactar Soporte
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
