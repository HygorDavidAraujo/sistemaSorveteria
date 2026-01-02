import { Request, Response, NextFunction } from 'express';
import prisma from '@infrastructure/database/prisma-client';

export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = function (data: any): Response {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Don't await, log asynchronously
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId,
              userEmail: req.user?.email,
              action,
              entityType: action.split('_')[0], // e.g., 'sale_create' -> 'sale'
              entityId: res.locals.entityId, // Set by controller if needed
              description: `${action} - ${req.method} ${req.path}`,
              oldValues: res.locals.oldValues,
              newValues: res.locals.newValues,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          })
          .catch((error) => {
            console.error('Audit log error:', error);
          });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};
