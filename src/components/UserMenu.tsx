import React, { useState } from 'react';
import { signOut, getCurrentUser } from 'aws-amplify/auth';

const UserMenu: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const user = await getCurrentUser();
        setUserEmail(user.signInDetails?.loginId || '');
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 shadow-md hover:shadow-lg transition-all"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {userEmail.split('@')[0]}
        </span>
        <span className="text-gray-400">▼</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Cuenta</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;