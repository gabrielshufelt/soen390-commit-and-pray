import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignInGoogle from '../components/SignInGoogle';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';

jest.mock('@react-native-google-signin/google-signin', () => {
  const { Pressable, Text } = require('react-native');
  const MockButton = ({ onPress }: any) => (
    <Pressable testID="google-signin-button" onPress={onPress}>
      <Text>Sign in with Google</Text>
    </Pressable>
  );
  MockButton.Size = { Wide: 0, Icon: 1, Standard: 2 };
  MockButton.Color = { Dark: 0, Light: 1 };

  return {
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(() => Promise.resolve(true)),
      signIn: jest.fn(),
      getTokens: jest.fn(() => Promise.resolve({
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
      })),
    },
    GoogleSigninButton: MockButton,
    isSuccessResponse: jest.fn(),
    isErrorWithCode: jest.fn(),
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
  };
});

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        googleWebClientId: 'test-web-client-id',
        googleIosClientId: 'test-ios-client-id',
      },
    },
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    signIn: jest.fn(),
  })),
}));

jest.spyOn(Alert, 'alert');

const mockSuccessResponse = {
  data: {
    user: {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      photo: 'https://example.com/photo.jpg',
    },
  },
};

describe('SignInGoogle', () => {
  const mockSignIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
    });
  });

  it('renders sign in button and description text', () => {
    const { getByTestId, getByText } = render(<SignInGoogle />);

    expect(getByTestId('google-signin-button')).toBeTruthy();
    expect(getByText('Sign in with Google to sync your calendar')).toBeTruthy();
  });

  it('signs in successfully when user completes sign in', async () => {
    const { isSuccessResponse } = require('@react-native-google-signin/google-signin');
    (isSuccessResponse as jest.Mock).mockReturnValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({
        showPlayServicesUpdateDialog: true,
      });
      expect(GoogleSignin.signIn).toHaveBeenCalled();
      expect(GoogleSignin.getTokens).toHaveBeenCalled();
      expect(mockSignIn).toHaveBeenCalledWith({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        photo: 'https://example.com/photo.jpg',
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'You have been signed in successfully!'
      );
    });
  });

  it('shows alert when sign in response is not successful', async () => {
    const { isSuccessResponse } = require('@react-native-google-signin/google-signin');
    (isSuccessResponse as jest.Mock).mockReturnValue(false);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({});

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign In Failed',
        'Unable to complete sign in. Please try again.'
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles sign in cancellation', async () => {
    const { isErrorWithCode } = require('@react-native-google-signin/google-signin');
    (isErrorWithCode as jest.Mock).mockReturnValue(true);
    const error = { code: statusCodes.SIGN_IN_CANCELLED };
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(error);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cancelled',
        'Sign in was cancelled.'
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles sign in already in progress', async () => {
    const { isErrorWithCode } = require('@react-native-google-signin/google-signin');
    (isErrorWithCode as jest.Mock).mockReturnValue(true);
    const error = { code: statusCodes.IN_PROGRESS };
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(error);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'In Progress',
        'Sign in is already in progress.'
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles Play Services not available', async () => {
    const { isErrorWithCode } = require('@react-native-google-signin/google-signin');
    (isErrorWithCode as jest.Mock).mockReturnValue(true);
    const error = { code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE };
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(error);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Play Services not available or outdated.'
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles other error codes', async () => {
    const { isErrorWithCode } = require('@react-native-google-signin/google-signin');
    (isErrorWithCode as jest.Mock).mockReturnValue(true);
    const error = { code: 'OTHER_ERROR', message: 'Something went wrong' };
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(error);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Sign in error: Something went wrong'
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles unexpected errors', async () => {
    const { isErrorWithCode } = require('@react-native-google-signin/google-signin');
    (isErrorWithCode as jest.Mock).mockReturnValue(false);
    const error = new Error('Unexpected error');
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(error);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles play services check failure', async () => {
    const { isErrorWithCode } = require('@react-native-google-signin/google-signin');
    (GoogleSignin.hasPlayServices as jest.Mock).mockRejectedValueOnce(
      new Error('Play services error')
    );
    (isErrorWithCode as jest.Mock).mockReturnValue(false);

    const { getByTestId } = render(<SignInGoogle />);

    await act(async () => {
      fireEvent.press(getByTestId('google-signin-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    });

    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  });
});
