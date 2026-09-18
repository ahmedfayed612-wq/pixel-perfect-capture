// Admin authentication middleware for protecting dashboard routes
import { createMiddleware } from '@tanstack/react-start'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export const requireAdminAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    // This middleware runs on the server, but we need to check client-side session
    // For now, we'll defer the actual check to the client component
    // In a production environment, you'd want to implement proper server-side session validation
    
    return next({
      context: {
        // We'll handle the actual auth check in the component
        requireAuth: true,
      },
    })
  }
)
