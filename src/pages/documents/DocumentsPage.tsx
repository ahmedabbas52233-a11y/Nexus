import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Download, Trash2, Eye, PenLine } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { documentAPI, SOCKET_URL } from "../../services/api";
import { SignatureModal } from "../../components/documents/SignatureModal";
import toast from "react-hot-toast";

interface ApiDocument {
  id: number;
  name: string; // filename on disk
  originalName: string;
  mimeType: string;
  size: number;
  ownerId: number;
  signature?: string | null;
  uploadedAt: string;
}

interface DocItem {
  id: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: string;
  uploadedAt: string;
  url: string;
  isPdf: boolean;
  isImage: boolean;
  signed: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);
  const [signingDoc, setSigningDoc] = useState<DocItem | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await documentAPI.getMyDocuments();
      if (data.documents && Array.isArray(data.documents)) {
        setDocuments(
          data.documents.map((doc: ApiDocument): DocItem => {
            const mimeType = doc.mimeType || "";
            return {
              id: doc.id,
              fileName: doc.name,
              originalName: doc.originalName || doc.name,
              mimeType,
              size: formatFileSize(doc.size || 0),
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
              url: `${SOCKET_URL}/uploads/${doc.name}`,
              isPdf: mimeType === "application/pdf",
              isImage: mimeType.startsWith("image/"),
              signed: !!doc.signature,
            };
          }),
        );
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const data = await documentAPI.uploadDocument(file);
      if (!data.success) throw new Error(data.message || "Upload failed");
      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error((err as Error).message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  }, [fetchDocuments]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: { errors: { message: string }[] }[]) => {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0]?.message || "File not accepted");
      return;
    }
    const file = acceptedFiles[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB, matches backend limit
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    noClick: true,
    noKeyboard: true,
  });

  const handleDownload = (doc: DocItem) => {
    window.open(doc.url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (doc: DocItem) => {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    try {
      const data = await documentAPI.deleteDocument(doc.id);
      if (!data.success) throw new Error(data.message || "Delete failed");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Document deleted");
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete document");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-lg w-full max-w-4xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 truncate">{previewDoc.originalName}</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)}>Close</Button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100">
              {previewDoc.isPdf ? (
                <iframe title="Document preview" src={previewDoc.url} className="w-full h-full" />
              ) : previewDoc.isImage ? (
                <img src={previewDoc.url} alt={previewDoc.originalName} className="max-w-full mx-auto" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <FileText size={48} className="mb-4" />
                  <p>No inline preview available for this file type.</p>
                  <Button className="mt-4" onClick={() => handleDownload(previewDoc)}>Download instead</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {signingDoc && (
        <SignatureModal
          documentName={signingDoc.originalName}
          onClose={() => setSigningDoc(null)}
          onSigned={() => {
            setSigningDoc(null);
            fetchDocuments();
          }}
          documentId={signingDoc.id}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Chamber</h1>
          <p className="text-gray-600">Upload, preview, and e-sign your startup's important files</p>
        </div>

        <div>
          <input {...getInputProps()} />
          <Button leftIcon={<Upload size={18} />} onClick={open} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragActive ? "border-primary-500 bg-primary-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isDragActive ? "Drop the file here…" : "Drag and drop a file here, or click \"Upload Document\" above"}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, PNG, JPG — up to 10MB</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center p-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg mr-4" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <div className="p-2 bg-primary-50 rounded-lg mr-4">
                    <FileText size={24} className="text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</h3>
                      {doc.signed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success-50 text-success-700">Signed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{doc.mimeType || "File"}</span>
                      <span>{doc.size}</span>
                      <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" className="p-2" title="Preview" onClick={() => setPreviewDoc(doc)}>
                      <Eye size={18} />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2" title="E-sign" onClick={() => setSigningDoc(doc)}>
                      <PenLine size={18} />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2" title="Download" onClick={() => handleDownload(doc)}>
                      <Download size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-error-600 hover:text-error-700"
                      title="Delete"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No documents yet</h3>
              <p className="text-gray-500 mt-1">Upload your first document to get started</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
