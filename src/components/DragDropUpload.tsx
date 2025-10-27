import React, { useCallback, useState } from 'react';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({ onFileSelect, selectedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

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

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };
  
  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (showCamera) {
      stopCamera();
      setTimeout(async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode } });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error('Error switching camera:', err);
        }
      }, 100);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onFileSelect(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 Seleccionar Imagen</h2>
      
      {showCamera && (
        <div className="mb-4 bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full" />
          <div className="flex space-x-2 p-3 bg-gray-900">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
            >
              📸 Capturar
            </button>
            <button
              onClick={switchCamera}
              className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 font-medium"
            >
              🔄
            </button>
            <button
              onClick={stopCamera}
              className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium"
            >
              ✖
            </button>
          </div>
        </div>
      )}
      
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
            <div className="flex gap-2">
              <button
                onClick={() => document.getElementById('file-input')?.click()}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                📁 Seleccionar archivo
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={startCamera}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                📷 Tomar foto
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📷</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Arrastra una imagen aquí
              </p>
              <p className="text-gray-500">o selecciona una opción</p>
              <p className="text-xs text-gray-400 mt-2">Formatos soportados: JPEG, PNG</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => document.getElementById('file-input')?.click()}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                📁 Seleccionar archivo
              </button>
              <button
                onClick={startCamera}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📷 Tomar foto
              </button>
            </div>
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