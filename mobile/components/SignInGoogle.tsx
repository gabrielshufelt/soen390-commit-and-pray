import React, { useEffect } from "react";
import { View, StyleSheet, Text, Alert } from "react-native";
import {
  GoogleSignin,
  GoogleSigninButton,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { useAuth } from "../context/AuthContext";

// Call this once at app startup (e.g. in App.tsx or a root layout)
GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export default function SignInGoogle() {
  const { signIn: saveUser } = useAuth();

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        // Get tokens
        const tokens = await GoogleSignin.getTokens();
        
        // Save user data to context
        await saveUser({
          id: response.data.user.id,
          name: response.data.user.name || '',
          email: response.data.user.email,
          photo: response.data.user.photo || undefined,
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
        });
        
        Alert.alert('Success', 'You have been signed in successfully!');
      } else {
        Alert.alert('Sign In Failed', 'Unable to complete sign in. Please try again.');
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          Alert.alert('Cancelled', 'Sign in was cancelled.');
        } else if (error.code === statusCodes.IN_PROGRESS) {
          Alert.alert('In Progress', 'Sign in is already in progress.');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Error', 'Play Services not available or outdated.');
        } else {
          Alert.alert('Error', `Sign in error: ${error.message}`);
        }
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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