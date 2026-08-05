export type ReverbScheme = 'http' | 'https';

export interface FirebaseEnvironment {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export interface ReverbEnvironment {
  appKey: string;
  host: string;
  port: number;
  scheme: ReverbScheme;
  authEndpoint: string;
}

export interface AppEnvironment {
  production: boolean;
  apiUrl: string;
  firebase: FirebaseEnvironment;
  reverb: ReverbEnvironment;
}
