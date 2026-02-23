import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { renderIcon, AMENITY_ICONS, ACCESSIBILITY_ICONS, UI_ICONS } from '../constants/buildingIcons';

jest.mock('@expo/vector-icons', () => ({
    FontAwesome5: 'FontAwesome5',
    MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('renderIcon', () => {
    it('renders FontAwesome5 icon for FontAwesome5 config', () => {
        const { toJSON } = render(
            <View>{renderIcon(AMENITY_ICONS.info, 20, '#000')}</View>
        );
        expect(toJSON()).not.toBeNull();
    });

    it('renders MaterialCommunityIcons icon for MaterialCommunityIcons config', () => {
        const { toJSON } = render(
            <View>{renderIcon(ACCESSIBILITY_ICONS.accessibility_ramp, 20, '#000')}</View>
        );
        expect(toJSON()).not.toBeNull();
    });

    it('returns null for unknown icon lib', () => {
        const unknownConfig = { lib: 'UnknownLib' as any, icon: 'test', label: 'Test' };
        const result = renderIcon(unknownConfig, 20, '#000');
        expect(result).toBeNull();
    });

    it('passes accessibilityLabel from config.label for FontAwesome5', () => {
        const { getByLabelText } = render(
            <View>{renderIcon(AMENITY_ICONS.info, 20, '#000')}</View>
        );
        expect(getByLabelText('Info')).toBeTruthy();
    });

    it('passes accessibilityLabel from config.label for MaterialCommunityIcons', () => {
        const { getByLabelText } = render(
            <View>{renderIcon(ACCESSIBILITY_ICONS.accessibility_ramp, 20, '#000')}</View>
        );
        expect(getByLabelText('Ramp')).toBeTruthy();
    });
});
