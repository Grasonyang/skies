import { CacheEntry } from '@/types';
import { CACHE_TTL } from '@/lib/constants';

/**
 * 記憶體快取服務
 */
class CacheService {
  private cache: Map<string, CacheEntry<unknown>>;
  private ttl: number;

  constructor(ttl: number = CACHE_TTL) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * 獲取快取數據
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ 快取命中: ${key}`);
    return entry.data as T;
  }

  /**
   * 設定快取數據
   */
  async set<T>(key: string, data: T, customTtl?: number): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // 設定自動清除
    const ttl = customTtl || this.ttl;
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl);

    console.log(`💾 快取設定: ${key} (TTL: ${ttl / 1000}s)`);
  }

  /**
   * 刪除快取
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * 清空所有快取
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 獲取快取統計資訊
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

// 導出單例
export const cacheService = new CacheService();
