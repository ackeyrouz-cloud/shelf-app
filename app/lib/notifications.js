import * as Notifications from 'expo-notifications';

// UI/permission plumbing only — no scheduling or sending logic yet. OS
// permission state is always queried live here, never cached in our own
// DB, since it can change outside the app (e.g. revoked in device Settings)
// and a stale cached value would lie to the toggle.
export async function getNotificationPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status; // 'granted' | 'denied' | 'undetermined'
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}
