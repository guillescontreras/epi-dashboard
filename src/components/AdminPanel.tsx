import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser } from 'aws-amplify/auth';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const ADMIN_API_BASE = 'https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod';
const ADMIN_STATS_URL = `${ADMIN_API_BASE}/stats`;
const ADMIN_USERS_URL = `${ADMIN_API_BASE}/users`;
const ADMIN_ACTIONS_URL = `${ADMIN_API_BASE}/actions`;
const ADMIN_USER_HISTORY_URL = `${ADMIN_API_BASE}/user-history`;

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
  activeUsers: number;
  totalAnalyses: number;
  byType: {
    ppe: number;
    face: number;
    label: number;
    text: number;
  };
  dailyAnalyses?: Array<{ date: string; count: number }>;
}

interface UserHistory {
  history: any[];
  count: number;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);

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
      toast.error('Error cargando estadísticas');
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

  const handleViewHistory = async (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setLoadingUserHistory(true);
    
    try {
      const response = await axios.get(`${ADMIN_USER_HISTORY_URL}?userId=${user.username}`);
      setUserHistory(response.data.history || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      toast.error('Error cargando historial del usuario');
      setUserHistory([]);
    } finally {
      setLoadingUserHistory(false);
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
                      <p className="text-4xl font-bold">{stats.totalUsers}</p>
                      <p className="text-sm opacity-90 mt-2">Usuarios Registrados</p>
                    </div>
                    <div className="bg-gradient-to-r from-teal-500 to-green-500 rounded-xl p-6 text-white">
                      <p className="text-4xl font-bold">{stats.activeUsers}</p>
                      <p className="text-sm opacity-90 mt-2">Usuarios Activos</p>
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    {stats.dailyAnalyses && stats.dailyAnalyses.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Análisis Últimos 30 Días</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={stats.dailyAnalyses}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 10 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getDate()}/${date.getMonth() + 1}`;
                              }}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString('es-ES');
                              }}
                            />
                            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {stats.dailyAnalyses && stats.dailyAnalyses.length > 0 && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Actividad Diaria Detallada</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.dailyAnalyses}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString('es-ES');
                            }}
                            formatter={(value) => [`${value} análisis`, 'Cantidad']}
                          />
                          <Bar dataKey="count" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
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
                            onClick={() => handleViewHistory(user)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                            title="Ver historial"
                          >
                            👁️
                          </button>
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

      {/* Modal Historial Usuario */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Historial de {selectedUser.email}</h2>
                <p className="text-sm text-gray-600">{selectedUser.analysisCount} análisis realizados</p>
              </div>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setUserHistory([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingUserHistory ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Cargando historial...</p>
                </div>
              ) : userHistory.length > 0 ? (
                <div className="space-y-4">
                  {userHistory.map((analysis, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {analysis.DetectionType === 'ppe_detection' ? '🦺 Análisis EPP' :
                             analysis.DetectionType === 'face_detection' ? '👤 Detección Rostros' :
                             analysis.DetectionType === 'text_detection' ? '📝 Detección Texto' :
                             analysis.DetectionType === 'label_detection' ? '🏷️ Detección Objetos' :
                             '🔍 Análisis General'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(analysis.timestamp).toLocaleString()}
                          </p>
                          {analysis.analysisId && (
                            <p className="text-xs text-gray-400 font-mono mt-1">
                              ID: {analysis.analysisId}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                            {analysis.MinConfidence || 75}% confianza
                          </span>
                          {analysis.Summary && analysis.DetectionType === 'ppe_detection' && (
                            <p className="text-sm text-gray-600 mt-2">
                              {analysis.Summary.totalPersons} personas detectadas
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500">Este usuario aún no ha realizado análisis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
