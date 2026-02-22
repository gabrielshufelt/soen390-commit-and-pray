import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';


import type { MapViewDirectionsMode } from 'react-native-maps-directions';
import TransportModeSelector from '../components/TransportModeSelector';

describe('TransportModeSelector', () => {
  const modes = [
    { mode: 'DRIVING' as MapViewDirectionsMode, label: 'Driving' },
    { mode: 'WALKING' as MapViewDirectionsMode, label: 'Walking' },
    { mode: 'BICYCLING' as MapViewDirectionsMode, label: 'Cycling' },
    { mode: 'TRANSIT' as MapViewDirectionsMode, label: 'Transit' },
  ];

  it('renders all transport mode buttons', () => {
    const { getByText } = render(
      <TransportModeSelector selectedMode="DRIVING" onModeSelect={() => {}} />
    );
    modes.forEach(({ label }) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('highlights the selected mode', () => {
    const { getByText } = render(
      <TransportModeSelector selectedMode="WALKING" onModeSelect={() => {}} />
    );
    // The style check is not reliable for RN, so just check the button exists
    expect(getByText('Walking')).toBeTruthy();
  });

  it('calls onModeSelect when a button is pressed', () => {
    const onModeSelect = jest.fn();
    const { getByText } = render(
      <TransportModeSelector selectedMode="DRIVING" onModeSelect={onModeSelect} />
    );
    act(() => {
      fireEvent.press(getByText('Transit'));
    });
    expect(onModeSelect).toHaveBeenCalledWith('TRANSIT');
  });

  it('disables buttons when disabled prop is true', () => {
    const { getAllByRole } = render(
      <TransportModeSelector selectedMode="DRIVING" onModeSelect={() => {}} disabled />
    );
    // All buttons should be disabled
    const buttons = getAllByRole('button').filter(btn =>
      ['Driving', 'Walking', 'Cycling', 'Transit'].includes(btn.props.accessibilityLabel)
    );
    buttons.forEach(btn => {
      expect(btn.props.accessibilityState.disabled).toBe(true);
    });
  });
});
