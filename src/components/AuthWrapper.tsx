import React from 'react';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { I18n } from 'aws-amplify/utils';

I18n.putVocabularies({
  es: {
    'Sign In': 'Iniciar Sesión',
    'Sign Up': 'Registrarse',
    'Email': 'Correo Electrónico',
    'Password': 'Contraseña',
    'Confirm Password': 'Confirmar Contraseña',
    'Create Account': 'Crear Cuenta',
    'Forgot your password?': '¿Olvidaste tu contraseña?',
    'Reset password': 'Restablecer contraseña',
    'Send code': 'Enviar código',
    'Confirm': 'Confirmar',
    'Code': 'Código',
    'New Password': 'Nueva Contraseña',
    'Back to Sign In': 'Volver a Iniciar Sesión',
    'Username': 'Correo Electrónico'
  }
});

I18n.setLanguage('es');

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Authenticator
      hideSignUp={false}
      components={{
        Header() {
          return (
            <div className="flex flex-col items-center mb-6">
              <img 
                src="/CoironTech-logo1.jpeg" 
                alt="CoironTech" 
                className="w-20 h-20 object-contain mb-4"
              />
              <h1 className="text-2xl font-bold text-gray-800">EPP Dashboard</h1>
              <p className="text-gray-600 text-sm">Análisis de Elementos de Protección Personal</p>
            </div>
          );
        }
      }}
    >
      {children}
    </Authenticator>
  );
};

export default AuthWrapper;