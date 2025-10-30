import React from 'react';

interface TermsAndConditionsProps {
  onAccept: () => void;
  onDecline: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">📋 Términos y Condiciones de Uso</h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4 text-gray-700">
            <section>
              <h3 className="font-bold text-gray-900 mb-2">1. Aceptación de Términos</h3>
              <p className="text-sm">
                Al utilizar CoironTech AI - Análisis Visual Inteligente, usted acepta estos términos y condiciones. 
                Si no está de acuerdo, por favor no utilice la aplicación.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">2. Privacidad y Seguridad de Datos</h3>
              <div className="text-sm space-y-2">
                <p>
                  <strong>🔒 Encriptación:</strong> Todos los datos transmitidos están protegidos mediante encriptación SSL/TLS.
                </p>
                <p>
                  <strong>🛡️ Almacenamiento:</strong> Las imágenes y análisis se almacenan de forma segura en servidores de AWS con acceso restringido.
                </p>
                <p>
                  <strong>🔐 Confidencialidad:</strong> Su información personal y análisis son confidenciales y no serán compartidos con terceros sin su consentimiento.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">3. Uso de Datos para Desarrollo</h3>
              <div className="text-sm space-y-2">
                <p>
                  <strong>🧪 Propósito de Prueba:</strong> Los análisis realizados se utilizarán exclusivamente para:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Mejorar la precisión de los modelos de IA</li>
                  <li>Desarrollar nuevas funcionalidades</li>
                  <li>Realizar pruebas de calidad del sistema</li>
                  <li>Optimizar el rendimiento de la aplicación</li>
                </ul>
                <p className="mt-2">
                  <strong>🚫 No Divulgación:</strong> La información de sus análisis NO será:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Compartida públicamente</li>
                  <li>Vendida a terceros</li>
                  <li>Utilizada con fines comerciales externos</li>
                  <li>Divulgada sin su autorización expresa</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">4. Responsabilidad del Usuario</h3>
              <p className="text-sm">
                El usuario es responsable de:
              </p>
              <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                <li>Mantener la confidencialidad de sus credenciales</li>
                <li>Utilizar la aplicación de manera ética y legal</li>
                <li>No subir contenido inapropiado u ofensivo</li>
                <li>Verificar los resultados antes de tomar decisiones críticas</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">5. Limitación de Responsabilidad</h3>
              <p className="text-sm">
                CoironTech proporciona esta herramienta "tal cual" para asistencia en análisis de seguridad. 
                Los resultados deben ser verificados por personal calificado antes de tomar decisiones operativas.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">6. Derechos de Propiedad Intelectual</h3>
              <p className="text-sm">
                Todo el contenido, diseño y tecnología de la aplicación son propiedad de CoironTech y están protegidos 
                por leyes de propiedad intelectual.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">7. Modificaciones</h3>
              <p className="text-sm">
                CoironTech se reserva el derecho de modificar estos términos en cualquier momento. 
                Los cambios serán notificados a través de la aplicación.
              </p>
            </section>

            <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>📧 Contacto:</strong> Para consultas sobre privacidad o términos de uso, 
                contacte a <a href="mailto:info@coirontech.com" className="text-blue-600 hover:underline">info@coirontech.com</a>
              </p>
            </section>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
          >
            Rechazar
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
