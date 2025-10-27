import React, { useCallback, useState } from 'react';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({ onFileSelect, selectedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    const imageFile = files.find(file => validFormats.includes(file.type));
    
    if (imageFile) {
      onFileSelect(imageFile);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png'];
      if (validFormats.includes(file.type)) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 Seleccionar Imagen</h2>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => document.getElementById('file-input')?.click()}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Cambiar imagen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📷</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Arrastra una imagen aquí
              </p>
              <p className="text-gray-500">o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-2">Formatos soportados: JPEG, PNG</p>
            </div>
            <button
              onClick={() => document.getElementById('file-input')?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Seleccionar archivo
            </button>
          </div>
        )}
        
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default DragDropUpload;