import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import type { AuthUser } from '@urbanreport/types';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

interface KeycloakUserInfoResponse {
  sub: string;
  email?: string;
}

const discoveryDocument = {
  authorizationEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`,
  tokenEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
  userInfoEndpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
};

export default function LoginScreen() {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const setTokens = useAuthStore((state) => state.setTokens);

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'urbanreport',
        path: 'login',
      }),
    [],
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: KEYCLOAK_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discoveryDocument,
  );

  useEffect(() => {
    const exchangeCode = async (): Promise<void> => {
      if (response?.type !== 'success' || !request?.codeVerifier) {
        return;
      }

      setIsAuthorizing(true);

      try {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: KEYCLOAK_CLIENT_ID,
            code: response.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          discoveryDocument,
        );

        const userInfoResponse = await fetch(discoveryDocument.userInfoEndpoint, {
          headers: {
            Authorization: ['Bearer', tokenResult.accessToken].join(' '),
          },
        });
        const userInfo = (await userInfoResponse.json()) as KeycloakUserInfoResponse;

        const user: AuthUser = {
          id: userInfo.sub,
          email: userInfo.email ?? '',
          roles: [],
        };

        setTokens(tokenResult.accessToken, tokenResult.refreshToken ?? '', user);
        router.replace('/(tabs)/map');
      } catch (error) {
        console.error('Keycloak login failed', error);
      } finally {
        setIsAuthorizing(false);
      }
    };

    exchangeCode().catch((error) => {
      console.error('Authorization flow failed', error);
      setIsAuthorizing(false);
    });
  }, [redirectUri, request?.codeVerifier, response, setTokens]);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">UrbanReport</Text>
      <Text style={styles.subtitle}>
        Sign in with Keycloak to submit, track, and confirm urban reports.
      </Text>
      <Button
        mode="contained"
        onPress={() => {
          setIsAuthorizing(true);
          promptAsync().catch((error) => {
            console.error('Failed to start auth flow', error);
            setIsAuthorizing(false);
          });
        }}
        disabled={!request || isAuthorizing}
      >
        Login with Keycloak
      </Button>
      {isAuthorizing ? <ActivityIndicator style={styles.loader} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  subtitle: {
    textAlign: 'center',
  },
  loader: {
    marginTop: 8,
  },
});
