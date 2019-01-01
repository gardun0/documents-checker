export default {
  USERS: (uid = '') => `/admin_users/${uid}`,
  APP_USERS: (uid = '') => `/fisa_users/${uid}`,
  SESSIONS: (uid = '') => `/admin_sessions/${uid}`,
  SLIDES: (uid = '') => `/fisa_slides/image/${uid}`,
  ALERTS: (uid = '') => `/fisa_notifications/${uid}`
}
