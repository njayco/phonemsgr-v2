import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'pmsgr_cache_';
const DEFAULT_TTL_DAYS = 14;

let _currentUserId: string | null = null;

export function setCacheUserId(userId: string | null) {
  _currentUserId = userId;
}

function scopedKey(key: string): string {
  if (_currentUserId) {
    return CACHE_PREFIX + _currentUserId + ':' + key;
  }
  return CACHE_PREFIX + key;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export async function cacheSet<T>(key: string, data: T, ttlDays = DEFAULT_TTL_DAYS): Promise<void> {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    cachedAt: now,
    expiresAt: now + ttlDays * 24 * 60 * 60 * 1000,
  };
  try {
    await AsyncStorage.setItem(scopedKey(key), JSON.stringify(entry));
  } catch {}
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(scopedKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(scopedKey(key));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(scopedKey(key));
  } catch {}
}

export async function cacheClearForUser(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = _currentUserId ? CACHE_PREFIX + _currentUserId + ':' : CACHE_PREFIX;
    const userKeys = allKeys.filter((k) => k.startsWith(prefix));
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
    }
  } catch {}
}

export async function cachePurgeExpired(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
    const now = Date.now();
    for (const key of cacheKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const entry = JSON.parse(raw);
          if (now > entry.expiresAt) {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch {}
}
