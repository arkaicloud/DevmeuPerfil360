import { User, TestResult, Payment } from "@shared/schema";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache keys generators
  getUserKey(id: number): string {
    return `user:${id}`;
  }

  getUserByEmailKey(email: string): string {
    return `user:email:${email}`;
  }

  getTestResultKey(id: number): string {
    return `test:${id}`;
  }

  getUserTestsKey(userId: number): string {
    return `user:${userId}:tests`;
  }

  getPricingKey(): string {
    return 'pricing:config';
  }

  getAdminConfigKey(): string {
    return 'admin:config';
  }
}

export const cache = new MemoryCache();