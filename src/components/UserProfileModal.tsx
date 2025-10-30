import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Country, State, City } from 'country-state-city';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onSave: (profile: any) => void;
  initialData?: any;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    birthDate: initialData?.birthDate || '',
    country: initialData?.country || '',
    state: initialData?.state || '',
    department: initialData?.department || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    phone: initialData?.phone || ''
  });

  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');

  useEffect(() => {
    // Cargar países
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);

    // Si hay datos iniciales, cargar estados y ciudades
    if (initialData?.country) {
      const country = allCountries.find(c => c.name === initialData.country);
      if (country) {
        setSelectedCountryCode(country.isoCode);
        const countryStates = State.getStatesOfCountry(country.isoCode);
        setStates(countryStates);

        if (initialData?.state) {
          const state = countryStates.find(s => s.name === initialData.state);
          if (state) {
            setSelectedStateCode(state.isoCode);
            const stateCities = City.getCitiesOfState(country.isoCode, state.isoCode);
            setCities(stateCities);
          }
        }
      }
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = countries.find(c => c.isoCode === countryCode);
    
    setSelectedCountryCode(countryCode);
    setFormData({
      ...formData,
      country: country?.name || '',
      state: '',
      city: ''
    });
    
    // Cargar estados del país seleccionado
    const countryStates = State.getStatesOfCountry(countryCode);
    setStates(countryStates);
    setCities([]);
    setSelectedStateCode('');
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stateCode = e.target.value;
    const state = states.find(s => s.isoCode === stateCode);
    
    setSelectedStateCode(stateCode);
    setFormData({
      ...formData,
      state: state?.name || '',
      city: ''
    });
    
    // Cargar ciudades del estado seleccionado
    const stateCities = City.getCitiesOfState(selectedCountryCode, stateCode);
    setCities(stateCities);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      city: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      toast.error('Nombre y Apellido son obligatorios');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('https://22ieg9wnd8.execute-api.us-east-1.amazonaws.com/prod', {
        userId,
        profileData: formData
      });

      toast.success('Perfil guardado exitosamente');
      onSave(response.data.profile);
      onClose();
    } catch (error) {
      console.error('Error guardando perfil:', error);
      toast.error('Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">{initialData ? 'Editar Perfil' : 'Completar Perfil'}</h2>
          <p className="text-blue-100 text-sm mt-1">{initialData ? 'Actualiza tus datos personales' : 'Ingresa tus datos personales para los informes'}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombres */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan Carlos"
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="García"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País
              </label>
              <select
                value={selectedCountryCode}
                onChange={handleCountryChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un país</option>
                {countries.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Provincia/Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provincia/Estado
              </label>
              <select
                value={selectedStateCode}
                onChange={handleStateChange}
                disabled={!selectedCountryCode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona una provincia/estado</option>
                {states.map((state) => (
                  <option key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Opcional"
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad
              </label>
              <select
                value={formData.city}
                onChange={handleCityChange}
                disabled={!selectedStateCode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona una ciudad</option>
                {cities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Código Postal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1900"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            {initialData && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;
