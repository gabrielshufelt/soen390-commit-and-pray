import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;
export const DISMISS_THRESHOLD = SHEET_HEIGHT * 0.35;
export const VELOCITY_THRESHOLD = 0.5;
