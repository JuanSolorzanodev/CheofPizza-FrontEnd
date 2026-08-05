import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,

  apiUrl: 'http://localhost:8000/api/',

  firebase: {
    apiKey: 'AIzaSyDPTXXLW7qhMk0gmilfd7wGxpU9Bc9NnKY',
    authDomain: 'cheofpizza.firebaseapp.com',
    projectId: 'cheofpizza',
    storageBucket: 'cheofpizza.firebasestorage.app',
    messagingSenderId: '211594285094',
    appId: '1:211594285094:web:140c242f755711716356e7',
    measurementId: 'G-ZWRHBWFLFF',
  },

  reverb: {
    appKey: 'a4m2jgmhok4yorhsjrpg',
    host: 'localhost',
    port: 8080,
    scheme: 'http',
    authEndpoint:
      'http://localhost:8000/api/broadcasting/auth',
  },
};
