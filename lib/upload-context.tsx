import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';

interface PendingUpload {
  id: string;
  content: string;
  mediaType: string;
  audience: string;
  fileUri: string;
  fileName: string;
  fileType: string;
  progress: number;
  status: 'uploading' | 'creating' | 'done' | 'error';
  previewUri?: string;
}

interface UploadContextType {
  pendingUpload: PendingUpload | null;
  startUpload: (params: {
    content: string;
    mediaType: string;
    audience: string;
    file: { uri: string; name: string; type: string } | null;
  }) => void;
  clearUpload: () => void;
}

const UploadContext = createContext<UploadContextType>({
  pendingUpload: null,
  startUpload: () => {},
  clearUpload: () => {},
});

export function useUpload() {
  return useContext(UploadContext);
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const abortRef = useRef<XMLHttpRequest | null>(null);

  const clearUpload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPendingUpload(null);
  }, []);

  const startUpload = useCallback(({ content, mediaType, audience, file }: {
    content: string;
    mediaType: string;
    audience: string;
    file: { uri: string; name: string; type: string } | null;
  }) => {
    const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const previewUri = file && (mediaType === 'image') ? file.uri : undefined;

    const upload: PendingUpload = {
      id: uploadId,
      content,
      mediaType: file ? mediaType : 'text',
      audience,
      fileUri: file?.uri || '',
      fileName: file?.name || '',
      fileType: file?.type || '',
      progress: 0,
      status: file ? 'uploading' : 'creating',
      previewUri,
    };

    setPendingUpload(upload);

    const apiUrl = getApiUrl();

    const createPost = async (mediaUrl?: string) => {
      setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'creating', progress: 100 } : prev);
      try {
        const res = await expoFetch(new URL('/api/feed', apiUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content, mediaType: file ? mediaType : 'text', audience, mediaUrl }),
        });
        if (!res.ok) throw new Error('Post creation failed');
        setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'done' } : prev);
        setTimeout(() => {
          setPendingUpload(prev => prev?.id === uploadId ? null : prev);
        }, 1500);
      } catch {
        setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'error' } : prev);
      }
    };

    if (!file) {
      createPost();
      return;
    }

    const formData = new FormData();
    if (Platform.OS === 'web') {
      globalThis.fetch(file.uri)
        .then(r => r.blob())
        .then(blob => {
          formData.append('file', blob, file.name);
          doXhrUpload(formData, uploadId, apiUrl, createPost, setPendingUpload, abortRef);
        })
        .catch(() => {
          setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'error' } : prev);
        });
    } else {
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      doXhrUpload(formData, uploadId, apiUrl, createPost, setPendingUpload, abortRef);
    }
  }, []);

  return (
    <UploadContext.Provider value={{ pendingUpload, startUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

function doXhrUpload(
  formData: FormData,
  uploadId: string,
  apiUrl: string,
  createPost: (mediaUrl: string) => Promise<void>,
  setPendingUpload: React.Dispatch<React.SetStateAction<PendingUpload | null>>,
  abortRef: React.MutableRefObject<XMLHttpRequest | null>,
) {
  const xhr = new XMLHttpRequest();
  abortRef.current = xhr;

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const pct = Math.round((event.loaded / event.total) * 95);
      setPendingUpload(prev => prev?.id === uploadId ? { ...prev, progress: pct } : prev);
    }
  };

  xhr.onload = () => {
    abortRef.current = null;
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const data = JSON.parse(xhr.responseText);
        createPost(data.url);
      } catch {
        setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'error' } : prev);
      }
    } else {
      setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'error' } : prev);
    }
  };

  xhr.onerror = () => {
    abortRef.current = null;
    setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'error' } : prev);
  };

  const uploadUrl = new URL('/api/upload/media', apiUrl).toString();
  xhr.open('POST', uploadUrl);
  xhr.withCredentials = true;
  xhr.send(formData);
}
