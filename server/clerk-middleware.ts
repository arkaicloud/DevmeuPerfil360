import { createClerkClient } from "@clerk/backend";
import { Request, Response, NextFunction } from "express";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('Missing required Clerk secret: CLERK_SECRET_KEY');
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    // Verify the session token with Clerk using the sessions API
    const sessionToken = await clerkClient.sessions.verifySession(token, token);
    
    if (!sessionToken || !sessionToken.userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Get user information from Clerk
    const user = await clerkClient.users.getUser(sessionToken.userId);
    
    req.userId = sessionToken.userId;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Falha na autenticação' });
  }
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const sessionToken = await clerkClient.sessions.verifySession(token, token);
      
      if (sessionToken && sessionToken.userId) {
        const user = await clerkClient.users.getUser(sessionToken.userId);
        req.userId = sessionToken.userId;
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};