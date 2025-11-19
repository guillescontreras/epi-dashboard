import React, { useState, useEffect } from 'react';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { I18n } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';
import TermsAndConditions from './TermsAndConditions';

I18n.putVocabularies({
  es: {
    'Sign In': 'Iniciar Sesión',
    'Sign Up': 'Registrarse',
    'Sign in': 'Iniciar sesión',
    'Sign up': 'Crear cuenta',
    'Email': 'Correo Electrónico',
    'Password': 'Contraseña',
    'Confirm Password': 'Confirmar Contraseña',
    'Create Account': 'Crear Cuenta',
    'Create account': 'Crear cuenta',
    'Forgot your password?': '¿Olvidaste tu contraseña?',
    'Reset password': 'Restablecer contraseña',
    'Reset your password': 'Restablecer tu contraseña',
    'Send code': 'Enviar código',
    'Send Code': 'Enviar Código',
    'Confirm': 'Confirmar',
    'Code': 'Código',
    'Confirmation Code': 'Código de Confirmación',
    'New Password': 'Nueva Contraseña',
    'New password': 'Nueva contraseña',
    'Back to Sign In': 'Volver a Iniciar Sesión',
    'Username': 'Correo Electrónico',
    'Enter your Email': 'Ingresa tu correo electrónico',
    'Enter your Password': 'Ingresa tu contraseña',
    'Please confirm your Password': 'Por favor confirma tu contraseña',
    'Enter your username': 'Ingresa tu correo electrónico',
    'Forgot Password': '¿Olvidaste tu contraseña?',
    'Change Password': 'Cambiar Contraseña',
    'Submit': 'Enviar',
    'Resend Code': 'Reenviar Código',
    'Confirm Sign Up': 'Confirmar Registro',
    'Confirming': 'Confirmando',
    'Signing in': 'Iniciando sesión',
    'Account recovery requires verified contact information': 'La recuperación de cuenta requiere información de contacto verificada',
    'User does not exist': 'El usuario no existe',
    'Incorrect username or password': 'Correo o contraseña incorrectos',
    'Invalid password format': 'Formato de contraseña inválido',
    'Invalid verification code provided, please try again.': 'Código de verificación inválido, inténtalo de nuevo',
    'Username cannot be empty': 'El correo electrónico no puede estar vacío',
    'Password must have at least 8 characters': 'La contraseña debe tener al menos 8 caracteres',
    'Password must have numbers': 'La contraseña debe tener números',
    'Password must have special characters': 'La contraseña debe tener caracteres especiales',
    'Password must have upper case letters': 'La contraseña debe tener mayúsculas',
    'Password must have lower case letters': 'La contraseña debe tener minúsculas',
    'We Emailed You': 'Te enviamos un correo',
    'Your code is on the way. To log in, enter the code we emailed to': 'Tu código está en camino. Para iniciar sesión, ingresa el código que enviamos a',
    'It may take a minute to arrive.': 'Puede tardar un minuto en llegar.',
    'We Texted You': 'Te enviamos un mensaje',
    'Your code is on the way. To log in, enter the code we texted to': 'Tu código está en camino. Para iniciar sesión, ingresa el código que enviamos a',
    'We Sent A Code': 'Enviamos un código',
    'Confirm SMS Code': 'Confirmar código SMS',
    'Confirm TOTP Code': 'Confirmar código TOTP',
    'Enter your code': 'Ingresa tu código',
    'Verify Contact': 'Verificar contacto',
    'Skip': 'Omitir',
    'Verify': 'Verificar'
  }
});

I18n.setLanguage('es');

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Verificar términos cuando cambia el estado de autenticación
  useEffect(() => {
    const checkTerms = async () => {
      try {
        const user = await getCurrentUser();
        if (user && !termsAccepted && !showTerms) {
          const accepted = localStorage.getItem('termsAccepted');
          if (accepted !== 'true') {
            setShowTerms(true);
          } else {
            setTermsAccepted(true);
          }
        }
      } catch {
        // Usuario no autenticado
      }
    };
    checkTerms();
  }, [termsAccepted, showTerms]);

  const checkAuth = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
      // Verificar si ya aceptó términos
      const accepted = localStorage.getItem('termsAccepted');
      if (accepted === 'true') {
        setTermsAccepted(true);
      } else {
        setShowTerms(true);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setTermsAccepted(true);
    setShowTerms(false);
  };

  const handleDeclineTerms = async () => {
    alert('Debes aceptar los términos y condiciones para usar la aplicación.');
  };

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
      {({ signOut, user }) => {
        return (
          <>
            {showTerms && user && (
              <TermsAndConditions
                onAccept={handleAcceptTerms}
                onDecline={handleDeclineTerms}
              />
            )}
            {(!showTerms || termsAccepted) && children}
          </>
        );
      }}
    </Authenticator>
  );
};

export default AuthWrapper;