importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'placeholder',
  projectId: 'fitsocial-7b10a',
  messagingSenderId: 'placeholder',
  appId: 'placeholder',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'FitSocial'
  const options = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
  }
  self.registration.showNotification(title, options)
})
