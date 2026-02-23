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
      console.log("Checking Play Services...");
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log("Play Services OK, opening sign-in...");

      const response = await GoogleSignin.signIn();
      console.log("Response:", JSON.stringify(response));

      if (isSuccessResponse(response)) {
        console.log("Success:", response.data.user.email);
      } else {
        console.log("Non-success response:", response);
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        console.log("Error code:", error.code);
        console.log("Error message:", error.message);
      } else {
        console.log("Unknown error:", error);
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