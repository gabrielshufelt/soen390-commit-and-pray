import React from 'react';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export interface IconConfig {
    lib: 'FontAwesome5' | 'MaterialCommunityIcons';
    icon: string;
    label: string;
}

export const AMENITY_ICONS: Record<string, IconConfig> = {
    info: { lib: 'FontAwesome5', icon: 'info-circle', label: 'Info' },
    atm: { lib: 'FontAwesome5', icon: 'money-bill-wave', label: 'ATM' },
    bike_parking: { lib: 'FontAwesome5', icon: 'bicycle', label: 'Bike Parking' },
    car_parking: { lib: 'FontAwesome5', icon: 'parking', label: 'Parking' },
    internet: { lib: 'FontAwesome5', icon: 'wifi', label: 'Wi-Fi' },
};

export const ACCESSIBILITY_ICONS: Record<string, IconConfig> = {
    accessibility_ramp: { lib: 'MaterialCommunityIcons', icon: 'slope-uphill', label: 'Ramp' },
    accessible_elevator: { lib: 'MaterialCommunityIcons', icon: 'elevator-passenger', label: 'Elevator' },
    accessible_entrance: { lib: 'FontAwesome5', icon: 'door-open', label: 'Entrance' },
    wheelchair_lift: { lib: 'FontAwesome5', icon: 'wheelchair', label: 'Lift' },
};

export const UI_ICONS = {
    close: { lib: 'FontAwesome5' as const, icon: 'times', label: 'Close' },
    mapMarker: { lib: 'FontAwesome5' as const, icon: 'map-marker-alt', label: 'Location' },
    route: { lib: 'FontAwesome5' as const, icon: 'route', label: 'Route' },
};

export const renderIcon = (config: IconConfig, size: number, color: string): React.ReactNode => {
    switch (config.lib) {
        case 'FontAwesome5':
            return <FontAwesome5 name={config.icon} size={size} color={color} accessibilityLabel={config.label} />;
        case 'MaterialCommunityIcons':
            return <MaterialCommunityIcons name={config.icon as any} size={size} color={color} accessibilityLabel={config.label} />;
        default:
            return null;
    }
};
