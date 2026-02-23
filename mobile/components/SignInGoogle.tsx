import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import {
  GoogleSignin,
  GoogleSigninButton,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";

// Call this once at app startup (e.g. in App.tsx or a root layout)
GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export default function SignInGoogle() {
  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { user, idToken } = response.data;
        console.log("Signed in as:", user.email);
        // Send idToken to your backend for verification
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log("User cancelled sign-in");
            break;
          case statusCodes.IN_PROGRESS:
            console.log("Sign-in already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.log("Play Services not available");
            break;
          default:
            console.error("Unknown error", error);
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={signIn}
      />
      <Text style={{ marginTop: 10, color: "#888" }}>
        Sign in with Google to sync your calendar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});