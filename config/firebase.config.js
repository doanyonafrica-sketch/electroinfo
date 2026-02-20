const firebaseConfig = {
  apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
  authDomain: "electroino-app.firebaseapp.com",
  projectId: "electroino-app",
  storageBucket: "electroino-app.firebasestorage.app",
  messagingSenderId: "864058526638",
  appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

export const ENV = {
    isProduction: true,
    isDevelopment: false
};

export const devLog = (message, data = null) => {
    if (ENV.isDevelopment) {
        console.log(message, data);
    }
};