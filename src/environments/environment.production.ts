import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,

  apiUrl:
    'https://api-cheofpizza-production-ae09.up.railway.app/api/',

  firebase: {
    apiKey:
      'AIzaSyDPTXXLW7qhMk0gmilfd7wGxpU9Bc9NnKY',

    authDomain:
      'cheofpizza.firebaseapp.com',

    projectId:
      'cheofpizza',

    storageBucket:
      'cheofpizza.firebasestorage.app',

    messagingSenderId:
      '211594285094',

    appId:
      '1:211594285094:web:140c242f755711716356e7',

    measurementId:
      'G-ZWRHBWFLFF',
  },

  reverb: {
    /*
     * Aquí va únicamente REVERB_APP_KEY.
     * Nunca coloques REVERB_APP_SECRET en Angular.
     */
    appKey:
      'a4m2jgmhok4yorhsjrpg',

    host:
      'cheofpizza-reverb-production.up.railway.app',

    port:
      443,

    scheme:
      'https',

    authEndpoint:
      'https://api-cheofpizza-production-ae09.up.railway.app/api/broadcasting/auth',
  },
};
