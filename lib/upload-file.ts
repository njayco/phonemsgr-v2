import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

export async function uploadFile(file: PickedFile): Promise<string> {
  const apiUrl = getApiUrl();
  const uploadUrl = new URL('/api/upload/media', apiUrl).toString();
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // Web: fetch the blob from the object URL and append it
    const blob = await (await globalThis.fetch(file.uri)).blob();
    formData.append('file', blob, file.name);

    const res = await expoFetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      credentials: 'include',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Upload failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return data.url as string;
  } else {
    // Native (iOS/Android): use the built-in React Native fetch which
    // correctly serialises { uri, name, type } as a multipart file part.
    // expo/fetch is a streaming API that does NOT support this pattern.
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const res = await globalThis.fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      credentials: 'include',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Upload failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return data.url as string;
  }
}
