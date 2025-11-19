import { BASE_URL } from "../shared/constants/urls";
import { baseEnvironment } from "./base-environment";

export const environment = {
  ...baseEnvironment,
  production: true,
  apiUrl: BASE_URL,
  logging: false,
  featureFlag: false,
  firebaseConfig: {
    apiKey: "AIzaSyCjk2yMW9AF635WmgWetTpL74uwRl9pBNU",
    authDomain: "healzy-1756630854400.firebaseapp.com",
    projectId: "healzy-1756630854400",
    storageBucket: "healzy-1756630854400.firebasestorage.app",
    messagingSenderId: "410166621597",
    appId: "1:410166621597:web:7a3b56fc96ab36e259ab74",
    measurementId: "G-PLV6RL78LQ"
  }
};
