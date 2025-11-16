import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser } from 'aws-amplify/auth';
import { toast } from 'react-toastify';

const ADMIN_API_BASE = 'https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod';
const ADMIN_STATS_URL = `${ADMIN_API_BASE}/stats`;
const ADMIN_USERS_URL = `${ADMIN_API_BASE}/users`;
const ADMIN_ACTIONS_URL = `${ADMIN_API_BASE}/actions`;

interface User {
  username: string;
  email: string;
  name: string;
  createdAt: string;
  role: string;
  analysisCount: number;
  lastAnalysis: string;
}

interface Stats {
  totalUsers: number;
  totalAnalyses: number;
  byType: {
    ppe: number;
    face: number;
    label: number;
    text: number;
  };
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(ADMIN_STATS_URL);
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Mock data para desarrollo
      setStats({
        totalUsers: 0,
        totalAnalyses: 0,
        byType: { ppe: 0, face: 0, label: 0, text: 0 }
      });
      toast.info('Modo desarrollo: Estadísticas no disponibles');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(ADMIN_USERS_URL);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setUsers([]);
      toast.info('Modo desarrollo: Usuarios no disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (username: string) => {
    if (!window.confirm(`¿Resetear contraseña de ${username}?`)) return;
    
    try {
      await axios.post(ADMIN_ACTIONS_URL, { action: 'reset-password', username });
      toast.success('Contraseña reseteada. El usuario recibirá un email.');
    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      toast.error('Error reseteando contraseña');
    }
  };

  const handleChangeRole = async (username: string, newRole: string) => {
    if (!window.confirm(`¿Cambiar rol de ${username} a ${newRole}?`)) return;
    
    try {
      await axios.post(ADMIN_ACTIONS_URL, { action: 'change-role', username, role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Error cambiando rol:', error);
      toast.error('Error cambiando rol');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span>🔧</span>
            <span>Panel de Administración</span>
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Usuarios
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando...</p>
            </div>
          ) : activeTab === 'stats' ? (
            <div className="space-y-6">
              {stats && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
                      <p className="text-4xl font-bold">{stats.totalUsers}</p>
                      <p className="text-sm opacity-90 mt-2">Usuarios Registrados</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                      <p className="text-4xl font-bold">{stats.totalAnalyses}</p>
                      <p className="text-sm opacity-90 mt-2">Análisis Totales</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                      <p className="text-4xl font-bold">{stats.byType.ppe}</p>
                      <p className="text-sm opacity-90 mt-2">Análisis EPP</p>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
                      <p className="text-4xl font-bold">{stats.byType.face + stats.byType.label + stats.byType.text}</p>
                      <p className="text-sm opacity-90 mt-2">Otros Análisis</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tipo</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">🦺 EPP Detection</span>
                        <span className="font-bold text-blue-600">{stats.byType.ppe}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">👤 Face Detection</span>
                        <span className="font-bold text-purple-600">{stats.byType.face}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">🏷️ Label Detection</span>
                        <span className="font-bold text-green-600">{stats.byType.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">📝 Text Detection</span>
                        <span className="font-bold text-orange-600">{stats.byType.text}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Análisis</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.username} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.name || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.analysisCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{user.lastAnalysis || '-'}</td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          <button
                            onClick={() => handleResetPassword(user.username)}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                            title="Resetear contraseña"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleChangeRole(user.username, user.role === 'admin' ? 'user' : 'admin')}
                            className="text-purple-600 hover:text-purple-800 font-medium"
                            title="Cambiar rol"
                          >
                            {user.role === 'admin' ? '👤' : '👑'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
