// Offline storage utilities for FinXchange PWA
import type { OfflineTransaction } from "@/hooks/use-offline-queue";

// IndexedDB configuration
const DB_NAME = 'FinXchangeOfflineDB';
const DB_VERSION = 1;
const TRANSACTION_STORE = 'offlineTransactions';
const USER_DATA_STORE = 'userData';
const CACHE_STORE = 'cacheData';

interface UserData {
  userId: string;
  lastSync: number;
  preferences: any;
}

interface CacheData {
  key: string;
  data: any;
  timestamp: number;
  expiry?: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline transactions store
        if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
          const transactionStore = db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id' });
          transactionStore.createIndex('userId', 'userId', { unique: false });
          transactionStore.createIndex('status', 'status', { unique: false });
          transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create user data store
        if (!db.objectStoreNames.contains(USER_DATA_STORE)) {
          db.createObjectStore(USER_DATA_STORE, { keyPath: 'userId' });
        }

        // Create cache data store
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Transaction queue management
  async addOfflineTransaction(userId: string, transaction: OfflineTransaction): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction_db = this.db!.transaction([TRANSACTION_STORE], 'readwrite');
      const store = transaction_db.objectStore(TRANSACTION_STORE);
      
      const transactionWithUserId = { ...transaction, userId };
      const request = store.add(transactionWithUserId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to add offline transaction'));
    });
  }

  async getOfflineTransactions(userId: string): Promise<OfflineTransaction[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTION_STORE], 'readonly');
      const store = transaction.objectStore(TRANSACTION_STORE);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const transactions = request.result.map(({ userId, ...transaction }) => transaction);
        // Sort by timestamp, newest first
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        resolve(transactions);
      };
      request.onerror = () => reject(new Error('Failed to get offline transactions'));
    });
  }

  async updateOfflineTransaction(transactionId: string, updates: Partial<OfflineTransaction>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTION_STORE], 'readwrite');
      const store = transaction.objectStore(TRANSACTION_STORE);
      
      const getRequest = store.get(transactionId);
      
      getRequest.onsuccess = () => {
        const existingTransaction = getRequest.result;
        if (!existingTransaction) {
          reject(new Error('Transaction not found'));
          return;
        }

        const updatedTransaction = { ...existingTransaction, ...updates };
        const updateRequest = store.put(updatedTransaction);
        
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error('Failed to update offline transaction'));
      };
      
      getRequest.onerror = () => reject(new Error('Failed to find offline transaction'));
    });
  }

  async removeOfflineTransaction(transactionId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTION_STORE], 'readwrite');
      const store = transaction.objectStore(TRANSACTION_STORE);
      const request = store.delete(transactionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove offline transaction'));
    });
  }

  async clearOfflineTransactions(userId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTION_STORE], 'readwrite');
      const store = transaction.objectStore(TRANSACTION_STORE);
      const index = store.index('userId');
      const request = index.openCursor(userId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error('Failed to clear offline transactions'));
    });
  }

  // User data management
  async setUserData(userId: string, data: Partial<UserData>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([USER_DATA_STORE], 'readwrite');
      const store = transaction.objectStore(USER_DATA_STORE);
      
      const userData: UserData = {
        userId,
        lastSync: Date.now(),
        preferences: {},
        ...data,
      };
      
      const request = store.put(userData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set user data'));
    });
  }

  async getUserData(userId: string): Promise<UserData | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([USER_DATA_STORE], 'readonly');
      const store = transaction.objectStore(USER_DATA_STORE);
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get user data'));
    });
  }

  // Cache management
  async setCacheData(key: string, data: any, expiryMinutes?: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      
      const cacheData: CacheData = {
        key,
        data,
        timestamp: Date.now(),
        expiry: expiryMinutes ? Date.now() + (expiryMinutes * 60 * 1000) : undefined,
      };
      
      const request = store.put(cacheData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set cache data'));
    });
  }

  async getCacheData(key: string): Promise<any | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check expiry
        if (result.expiry && Date.now() > result.expiry) {
          // Data has expired, remove it
          this.removeCacheData(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      
      request.onerror = () => reject(new Error('Failed to get cache data'));
    });
  }

  async removeCacheData(key: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove cache data'));
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.openCursor();
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const data = cursor.value as CacheData;
          if (data.expiry && now > data.expiry) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error('Failed to clear expired cache'));
    });
  }

  // Database management
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const stores = [TRANSACTION_STORE, USER_DATA_STORE, CACHE_STORE];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      
      let completed = 0;
      const total = stores.length;
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    });
  }

  async getStorageInfo(): Promise<{ 
    transactionCount: number; 
    cacheCount: number; 
    storageUsage: number 
  }> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transactionCount = await this.getStoreCount(TRANSACTION_STORE);
    const cacheCount = await this.getStoreCount(CACHE_STORE);
    
    // Estimate storage usage (rough calculation)
    const storageUsage = await this.estimateStorageUsage();

    return {
      transactionCount,
      cacheCount,
      storageUsage,
    };
  }

  private async getStoreCount(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to count ${storeName}`));
    });
  }

  private async estimateStorageUsage(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      } catch (error) {
        console.warn('Failed to estimate storage usage:', error);
      }
    }
    return 0;
  }
}

// Global instance
export const offlineStorage = new OfflineStorage();

// Exported helper functions
export async function addToOfflineQueue(userId: string, transaction: OfflineTransaction): Promise<void> {
  return offlineStorage.addOfflineTransaction(userId, transaction);
}

export async function getOfflineQueue(userId: string): Promise<OfflineTransaction[]> {
  return offlineStorage.getOfflineTransactions(userId);
}

export async function removeFromOfflineQueue(userId: string, transactionId: string): Promise<void> {
  return offlineStorage.removeOfflineTransaction(transactionId);
}

export async function updateOfflineTransaction(transactionId: string, updates: Partial<OfflineTransaction>): Promise<void> {
  return offlineStorage.updateOfflineTransaction(transactionId, updates);
}

export async function cacheAPIResponse(endpoint: string, data: any, expiryMinutes: number = 5): Promise<void> {
  return offlineStorage.setCacheData(`api_${endpoint}`, data, expiryMinutes);
}

export async function getCachedAPIResponse(endpoint: string): Promise<any | null> {
  return offlineStorage.getCacheData(`api_${endpoint}`);
}

export async function setUserPreferences(userId: string, preferences: any): Promise<void> {
  return offlineStorage.setUserData(userId, { preferences });
}

export async function getUserPreferences(userId: string): Promise<any | null> {
  const userData = await offlineStorage.getUserData(userId);
  return userData?.preferences || null;
}

export default offlineStorage;
