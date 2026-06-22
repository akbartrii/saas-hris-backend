import * as admin from 'firebase-admin';
import { Logger } from '@nestjs/common';

const logger = new Logger('FirebaseAdmin');

function initializeFirebaseAdmin(): typeof admin {
  if (admin.apps.length > 0) {
    return admin;
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!base64) {
    logger.warn(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 not set. Firebase Admin will not be initialized. FCM notifications will be logged only.',
    );
    return admin;
  }

  try {
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(json);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.log('Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error.message);
  }

  return admin;
}

export const firebaseAdmin = initializeFirebaseAdmin();
