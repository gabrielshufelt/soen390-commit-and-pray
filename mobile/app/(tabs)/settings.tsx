import { Text, View, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import SignInGoogle from '@/components/SignInGoogle';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { theme, setTheme, colorScheme } = useTheme();
  const { user, isLoading, signOut } = useAuth();
  const isDark = colorScheme === 'dark';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const themeOptions: { label: string; value: ThemeOption }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#f2f2f7' }]}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
        Appearance
      </Text>
      <View style={[styles.optionsContainer, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
        {themeOptions.map((option, index) => (
          <Pressable
            key={option.value}
            style={[
              styles.option,
              index < themeOptions.length - 1 && styles.optionBorder,
              { borderBottomColor: isDark ? '#38383a' : '#e5e5ea' },
            ]}
            onPress={() => setTheme(option.value)}
          >
            <Text style={[styles.optionText, { color: isDark ? '#ffffff' : '#000000' }]}>
              {option.label}
            </Text>
            {theme === option.value && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: isDark ? '#8e8e93' : '#6e6e73', marginTop: 30 }]}>
        Account
      </Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : user ? (
        <View>
          <View style={[styles.optionsContainer, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
            <View style={styles.userInfoContainer}>
              {user.photo && (
                <Image 
                  source={{ uri: user.photo }} 
                  style={styles.profileImage}
                />
              )}
              <View style={styles.userTextContainer}>
              <Text style={[styles.userName, { color: isDark ? '#ffffff' : '#000000' }]}>
                {user.name}
              </Text>
              <Text style={[styles.userEmail, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
                {user.email}
              </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.optionsContainer, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff', marginTop: 16 }]}>
            <Pressable
              style={styles.option}
              onPress={handleSignOut}
            >
              <Text style={[styles.optionText, { color: '#ff3b30' }]}>
                Log Out
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <SignInGoogle />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
  },
  optionsContainer: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 17,
  },
  checkmark: {
    fontSize: 17,
    color: '#007aff',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
  },
});
