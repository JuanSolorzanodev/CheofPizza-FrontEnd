import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface GoogleFirebaseProfile {
  idToken: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthService {
  async signInWithGoogle(): Promise<GoogleFirebaseProfile> {
    const firebaseApp = await import('firebase/app');

    const firebaseAuth = await import('firebase/auth');

    const app =
      firebaseApp.getApps().length > 0
        ? firebaseApp.getApp()
        : firebaseApp.initializeApp(environment.firebase);

    const auth = firebaseAuth.getAuth(app);

    /*
     * El proveedor se crea por cada intento.
     *
     * Evitamos conservar estado entre diferentes
     * autenticaciones de Google.
     */
    const provider = new firebaseAuth.GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account',
    });

    /*
     * signInWithPopup resuelve únicamente cuando Firebase
     * terminó correctamente el flujo OAuth.
     */
    const credential = await firebaseAuth.signInWithPopup(auth, provider);

    const user = credential.user;

    if (!user) {
      throw new Error('FIREBASE_GOOGLE_USER_MISSING');
    }

    /*
     * Forzamos la obtención de un token fresco.
     *
     * Este token será el que posteriormente Laravel
     * verificará utilizando Firebase Admin.
     */
    const idToken = await user.getIdToken(true);

    if (!idToken?.trim()) {
      throw new Error('FIREBASE_GOOGLE_ID_TOKEN_MISSING');
    }

    return {
      idToken,

      displayName: user.displayName ?? null,

      photoURL: user.photoURL ?? null,

      email: user.email ?? null,
    };
  }
}
