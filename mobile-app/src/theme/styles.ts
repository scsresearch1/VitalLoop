/**
 * Global Styles
 * Gen-Z themed stylesheet
 */

import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  // Text styles
  h1: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.white,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
  },
  body: {
    fontSize: 16,
    color: colors.white,
  },
  caption: {
    fontSize: 12,
    color: colors.slate[400],
  },
  
  // Spacing
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  padding: {
    padding: 16,
  },
  paddingLarge: {
    padding: 24,
  },
  
  // Cards
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.slate[900],
  },
  
  // Buttons
  button: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
