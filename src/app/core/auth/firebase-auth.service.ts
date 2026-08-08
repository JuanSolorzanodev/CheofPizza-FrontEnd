import {
  Injectable,
} from '@angular/core';

import {
  environment,
} from '../../../environments/environment';

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
    const [
      firebaseApp,
      firebaseAuth,
    ] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);

    const app =
      firebaseApp.getApps().length
        ? firebaseApp.getApps()[0]
        : firebaseApp.initializeApp(
            environment.firebase,
          );

    const auth =
      firebaseAuth.getAuth(
        app,
      );

    const provider =
      new firebaseAuth.GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const credential =
      await firebaseAuth.signInWithPopup(
        auth,
        provider,
      );

    const user =
      credential.user;

    return {
      idToken:
        await user.getIdToken(),

      displayName:
        user.displayName ??
        null,

      photoURL:
        user.photoURL ??
        null,

      email:
        user.email ??
        null,
    };
  }
}
