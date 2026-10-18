export type ToastTone = 'success' | 'error';

type Listener = (tone: ToastTone, message: string) => void;

const listeners = new Set<Listener>();

const emit = (tone: ToastTone, message: string) => listeners.forEach((listener) => listener(tone, message));

export const toast = {
    success: (message: string) => emit('success', message),
    error: (message: string) => emit('error', message),
    subscribe(listener: Listener) {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    },
};
