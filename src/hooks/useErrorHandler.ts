import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

interface ErrorHandlerOptions {
  showToast?: boolean;
  showAlert?: boolean;
  retryable?: boolean;
  onRetry?: () => Promise<void>;
  customMessage?: string;
}

interface ErrorState {
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  const handleError = useCallback(
    async (
      error: any,
      options: ErrorHandlerOptions = {}
    ) => {
      const {
        showToast = true,
        showAlert = false,
        retryable = false,
        onRetry,
        customMessage,
      } = options;

      const errorMessage = customMessage || 
        (error?.message || 'An unexpected error occurred');

      console.error('Error handled:', {
        message: errorMessage,
        error,
        options,
        timestamp: new Date().toISOString(),
      });

      setErrorState(prev => ({
        ...prev,
        error: errorMessage,
      }));

      if (showToast) {
        toast.error(errorMessage);
      }

      if (showAlert) {
        const alertButtons = [
          { text: 'OK', style: 'default' as const },
        ];

        if (retryable && onRetry) {
          alertButtons.unshift({
            text: 'Retry',
            style: 'default' as const,
            onPress: () => handleRetry(onRetry),
          } as any);
        }

        Alert.alert('Error', errorMessage, alertButtons);
      }
    },
    []
  );

  const handleRetry = useCallback(async (retryFn: () => Promise<void>) => {
    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      await retryFn();
      setErrorState(prev => ({
        ...prev,
        error: null,
        isRetrying: false,
      }));
      toast.success('Operation completed successfully');
    } catch (error) {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
      }));
      
      // Recursive error handling with exponential backoff
      const maxRetries = 3;
      if (errorState.retryCount < maxRetries) {
        handleError(error, {
          showToast: true,
          showAlert: true,
          retryable: true,
          onRetry: retryFn,
          customMessage: `Retry ${errorState.retryCount + 1}/${maxRetries} failed. ${error?.message || 'Please try again.'}`,
        });
      } else {
        handleError(error, {
          showToast: true,
          showAlert: true,
          retryable: false,
          customMessage: 'Maximum retry attempts reached. Please check your connection and try again later.',
        });
      }
    }
  }, [errorState.retryCount, handleError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  const withErrorHandling = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      options?: ErrorHandlerOptions
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          const result = await fn(...args);
          clearError();
          return result;
        } catch (error) {
          await handleError(error, options);
          return undefined;
        }
      };
    },
    [handleError, clearError]
  );

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    handleError,
    handleRetry,
    clearError,
    withErrorHandling,
  };
}