import { toast as sonnerToast } from 'sonner';

/**
 * Toast notification utility wrapper for Alps-CI
 * Provides a consistent API for success and error notifications
 */
export const toast = {
  /**
   * Show a success toast notification
   * @param message - The success message to display
   * @returns Toast ID
   */
  success: (message: string) => {
    return sonnerToast.success(message, {
      duration: 3000, // 3 seconds
    });
  },

  /**
   * Show an error toast notification
   * @param message - The error message to display
   * @returns Toast ID
   */
  error: (message: string) => {
    return sonnerToast.error(message, {
      duration: 5000, // 5 seconds
    });
  },
};
