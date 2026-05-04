import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi';

export default function FileUpload({ file, onFileSelect, onClear }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-600/10'
              : 'border-white/20 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-600/5'
          }`}
        >
          <input {...getInputProps()} id="resume-upload" />

          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${
            isDragActive
              ? 'bg-indigo-500/20 text-indigo-400 scale-110'
              : 'bg-indigo-600/20 text-indigo-400'
          }`}>
            <FiUploadCloud size={32} />
          </div>

          <h3 className="text-2xl font-bold text-gray-100 mb-2">
            {isDragActive ? 'Drop your resume here' : 'Upload Your Resume'}
          </h3>

          <p className="text-gray-400 mb-1">
            Drag & drop or <span className="text-indigo-400 font-semibold hover:underline">browse</span> your file
          </p>

          <p className="text-sm text-gray-500">Supports PDF, DOCX • Max 10MB</p>
        </div>
      ) : (
        <div className="glass-card p-6 border border-indigo-500/30 animate-fade-in-up flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <FiFile size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-200 truncate">{file.name}</p>
            <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
          </div>

          <button
            onClick={onClear}
            className="p-2 rounded-lg hover:bg-red-600/10 text-gray-400 hover:text-red-400 transition-all flex-shrink-0"
            title="Remove file"
          >
            <FiX size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
