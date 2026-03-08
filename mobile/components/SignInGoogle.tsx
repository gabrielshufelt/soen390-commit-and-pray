import React from "react";
import { View, StyleSheet, Text, Alert } from "react-native";
import {
  GoogleSignin,
  GoogleSigninButton,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useAuth } from "../context/AuthContext";
import { useCalendar } from "../context/CalendarContext";
import { logGoogleSignIn } from "../utils/analytics";


export default function SignInGoogle() {
  const { signIn: saveUser } = useAuth();
  const { fetchCalendars } = useCalendar();

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

        // Fetch the user's Google Calendars now that we have a valid access token
        await fetchCalendars(tokens.accessToken);

        // log that the user signed in with Google
        logGoogleSignIn();

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