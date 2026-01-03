import { useState, useCallback, useEffect } from 'react';

interface UseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = []
): UseQueryState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseQueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await queryFn();
      setState({ data: result, loading: false, error: null });
    } catch (err: any) {
      setState({
        data: null,
        loading: false,
        error: err.message || 'An error occurred',
      });
    }
  }, [queryFn]);

  useEffect(() => {
    refetch();
  }, dependencies);

  return { ...state, refetch };
}

interface UseMutationOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseMutationState {
  loading: boolean;
  error: string | null;
}

export function useMutation<T, R>(
  mutationFn: (data: T) => Promise<R>,
  options?: UseMutationOptions
): UseMutationState & {
  mutate: (data: T) => Promise<R | null>;
  reset: () => void;
} {
  const [state, setState] = useState<UseMutationState>({
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (data: T) => {
      setState({ loading: true, error: null });
      try {
        const result = await mutationFn(data);
        setState({ loading: false, error: null });
        options?.onSuccess?.();
        return result;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message;
        setState({ loading: false, error: errorMessage });
        options?.onError?.(errorMessage);
        return null;
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}
