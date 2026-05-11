import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFile, FiX, FiCheck } from 'react-icons/fi';

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
      'text/plain': ['.txt'],
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
          className={`file-upload-zone ${isDragActive ? 'file-upload-zone-active' : ''}`}
        >
          <input {...getInputProps()} id="resume-upload" />

          <div className={`file-upload-icon-wrap ${isDragActive ? 'file-upload-icon-active' : ''}`}>
            <FiUploadCloud size={32} />
            <div className="file-upload-icon-ring" />
          </div>

          <h3 className="text-xl font-bold text-gray-100 mb-2 relative z-10">
            {isDragActive ? 'Drop your resume here' : 'Upload Your Resume'}
          </h3>

          <p className="text-slate-400 mb-1.5 text-sm relative z-10">
            Drag & drop or <span className="text-cyan-400 font-semibold hover:underline">browse</span> your file
          </p>

          <div className="flex items-center gap-3 text-xs text-slate-500 relative z-10">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              PDF
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              DOCX
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              TXT
            </span>
            <span className="text-slate-600">•</span>
            <span>Max 10MB</span>
          </div>
        </div>
      ) : (
        <div className="file-upload-selected animate-fade-in-up">
          <div className="file-upload-selected-icon">
            <FiFile size={22} />
            <div className="file-upload-check">
              <FiCheck size={10} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-200 truncate text-sm">{file.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatSize(file.size)} • Ready to analyze</p>
          </div>

          <button
            onClick={onClear}
            className="file-upload-remove"
            title="Remove file"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
