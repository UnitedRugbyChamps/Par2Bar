import { createFirebaseBackend, firebaseConfigFromEnv } from './firebase';
import { createOfflineBackend, type OfflineBackend } from './offline';
import type { Backend } from './types';
import { presentLocal } from '@/notify/push';

export * from './types';

const config = firebaseConfigFromEnv();

/** Firebase when its keys are set, otherwise everything stays on the device. */
export const offline: OfflineBackend | null = config ? null : createOfflineBackend(presentLocal);
export const backend: Backend = offline ?? createFirebaseBackend(config!);
