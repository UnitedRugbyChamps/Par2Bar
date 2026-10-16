import { createFirebaseBackend, firebaseConfigFromEnv } from './firebase';
import { createOfflineBackend } from './offline';
import type { Backend } from './types';
import { presentLocal } from '@/notify/push';

export * from './types';

const config = firebaseConfigFromEnv();

/** Firebase when its keys are set, otherwise everything stays on the device. */
export const backend: Backend = config ? createFirebaseBackend(config) : createOfflineBackend(presentLocal);
