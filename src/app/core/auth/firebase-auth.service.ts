import { Injectable } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth, User } from 'firebase/auth';
import { environment } from '../../../environments/environment';

export interface GoogleFirebaseProfile {
  idToken: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;

  constructor() {
    this.app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
  }

  async signInWithGoogle(): Promise<GoogleFirebaseProfile> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const cred = await signInWithPopup(this.auth, provider);
    const user: User = cred.user;

    return {
      idToken: await user.getIdToken(),
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      email: user.email ?? null,
    };
  }
}
