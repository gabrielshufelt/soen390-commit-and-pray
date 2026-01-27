import { Text, View, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { theme, setTheme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

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
});
