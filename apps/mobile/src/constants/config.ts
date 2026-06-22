export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
export const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:8080';
export const KEYCLOAK_REALM = process.env.EXPO_PUBLIC_KEYCLOAK_REALM ?? 'urbanreport';
export const KEYCLOAK_CLIENT_ID =
  process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'urbanreport-mobile';
