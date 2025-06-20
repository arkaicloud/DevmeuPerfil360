import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Enhanced Neon configuration for stability
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration for stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000,
});

export const db = drizzle({ client: pool, schema });

// Enhanced database retry utility with circuit breaker
class DatabaseCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly timeout = 30000; // 30 seconds

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const circuitBreaker = new DatabaseCircuitBreaker();

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  if (circuitBreaker.isOpen()) {
    throw new Error('Database circuit breaker is open - too many failures');
  }

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      circuitBreaker.onSuccess();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a recoverable error
      const isRecoverable = 
        error?.code === 'XX000' || 
        error?.message?.includes('Control plane request failed') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('timeout');
      
      if (isRecoverable && attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`Database retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-recoverable error or max retries reached
      circuitBreaker.onFailure();
      throw error;
    }
  }
  
  circuitBreaker.onFailure();
  throw lastError;
}