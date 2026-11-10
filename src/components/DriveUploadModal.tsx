import React, { useState } from 'react';
import { ProjectDocument } from '../lib/types';
import { DOC_TYPES, todayISO, uid } from '../lib/trackerLogic';
import { GoogleDriveService } from '../lib/googleDriveService';
import { X, Upload, FileText, Cloud, CheckCircle, AlertCircle } from 'lucide-react';

interface DriveUploadModalProps {
  accessToken: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (doc: ProjectDocument) => void;
}

export const DriveUploadModal: React.FC<DriveUploadModalProps> = ({
  accessToken,
  isOpen,
  onClose,
  onUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<ProjectDocument['type']>('ผลตรวจ / รายงานแล็บ');
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!accessToken) {
      setError('Google Workspace authentication required. Please sign in with Google first.');
      return;
    }

    setIsUploading(true);
    setProgress(15);
    setError(null);

    try {
      const result = await GoogleDriveService.uploadFile(
        accessToken,
        selectedFile,
        (p) => setProgress(p)
      );

      const newDoc: ProjectDocument = {
        id: uid(),
        title: title || selectedFile.name,
        type: docType,
        kind: 'gdrive',
        driveFileId: result.id,
        webViewLink: result.webViewLink,
        url: result.webViewLink,
        fileName: selectedFile.name,
        size: selectedFile.size,
        note,
        added: todayISO(),
      };

      onUploaded(newDoc);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload to Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Upload File to Google Drive
            </h3>
            <p className="text-xs text-slate-500">
              File will be stored securely in your Google Drive and linked here
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* File input / dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select File
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
              <input
                type="file"
                id="gdrive-file"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              <label htmlFor="gdrive-file" className="cursor-pointer block">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-800 font-medium">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="truncate max-w-[260px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-7 h-7 mx-auto text-slate-400" />
                    <p className="text-xs text-slate-600 font-medium">
                      Click to choose a file (PDF, Image, Excel, Lab report, etc.)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Supports all file formats
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title (ชื่อเอกสาร)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stability Test Report 3 Months"
              disabled={isUploading}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Document Category / Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Category (ประเภทเอกสาร)
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              disabled={isUploading}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (หมายเหตุ)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes or supplier details"
              disabled={isUploading}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Uploading to Google Drive...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Upload to Google Drive'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
