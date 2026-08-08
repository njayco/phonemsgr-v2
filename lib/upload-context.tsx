import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { fetch as expoFetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';
import { uploadFile, type PickedFile } from '@/lib/upload-file';

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
    file: PickedFile | null;
    files?: PickedFile[];
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
  const cancelledRef = useRef(false);

  const clearUpload = useCallback(() => {
    cancelledRef.current = true;
    setPendingUpload(null);
  }, []);

  const startUpload = useCallback(({ content, mediaType, audience, file, files }: {
    content: string;
    mediaType: string;
    audience: string;
    file: PickedFile | null;
    files?: PickedFile[];
  }) => {
    const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    cancelledRef.current = false;

    const allFiles: PickedFile[] = files && files.length > 0 ? files : file ? [file] : [];
    const isMultiImage = !!(files && files.length > 0);
    const effectiveMediaType = allFiles.length > 0 ? (isMultiImage ? 'image' : mediaType) : 'text';
    const previewUri = allFiles.length > 0 && effectiveMediaType === 'image' ? allFiles[0].uri : undefined;

    const upload: PendingUpload = {
      id: uploadId,
      content,
      mediaType: effectiveMediaType,
      audience,
      fileUri: allFiles[0]?.uri || '',
      fileName: allFiles[0]?.name || '',
      fileType: allFiles[0]?.type || '',
      progress: 0,
      status: allFiles.length > 0 ? 'uploading' : 'creating',
      previewUri,
    };

    setPendingUpload(upload);

    const apiUrl = getApiUrl();

    const createPost = async (mediaUrl?: string, mediaUrls?: string[]) => {
      setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'creating', progress: 100 } : prev);
      try {
        const res = await expoFetch(new URL('/api/feed', apiUrl).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content,
            mediaType: effectiveMediaType,
            audience,
            mediaUrl,
            mediaUrls,
          }),
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

    if (allFiles.length === 0) {
      createPost();
      return;
    }

    (async () => {
      try {
        const urls: string[] = [];
        for (let i = 0; i < allFiles.length; i++) {
          if (cancelledRef.current) return;
          const url = await uploadFile(allFiles[i]);
          urls.push(url);
          const pct = Math.round(((i + 1) / allFiles.length) * 95);
          setPendingUpload(prev => prev?.id === uploadId ? { ...prev, progress: pct } : prev);
        }
        if (cancelledRef.current) return;
        if (isMultiImage) {
          await createPost(undefined, urls);
        } else {
          await createPost(urls[0]);
        }
      } catch {
        setPendingUpload(prev => prev?.id === uploadId ? { ...prev, status: 'error' } : prev);
      }
    })();
  }, []);

  return (
    <UploadContext.Provider value={{ pendingUpload, startUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}
