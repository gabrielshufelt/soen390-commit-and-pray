import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import TransportModeSelector from '../components/TransportModeSelector';

describe('TransportModeSelector', () => {
  const modes = [
    { mode: 'driving', label: 'Driving' },
    { mode: 'walking', label: 'Walking' },
    { mode: 'bicycling', label: 'Cycling' },
    { mode: 'transit', label: 'Transit' },
  ];

  it('renders all transport mode buttons', () => {
    const { getByText } = render(
      <TransportModeSelector selectedMode="driving" onModeSelect={() => {}} />
    );
    modes.forEach(({ label }) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('highlights the selected mode', () => {
    const { getByText } = render(
      <TransportModeSelector selectedMode="walking" onModeSelect={() => {}} />
    );
    const walkingButton = getByText('Walking');
    expect(walkingButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: expect.stringMatching(/#912338|MAROON/i) })
      ])
    );
  });

  it('calls onModeSelect when a button is pressed', () => {
    const onModeSelect = jest.fn();
    const { getByText } = render(
      <TransportModeSelector selectedMode="driving" onModeSelect={onModeSelect} />
    );
    act(() => {
      fireEvent.press(getByText('Transit'));
    });
    expect(onModeSelect).toHaveBeenCalledWith('transit');
  });

  it('disables buttons when disabled prop is true', () => {
    const { getAllByRole } = render(
      <TransportModeSelector selectedMode="driving" onModeSelect={() => {}} disabled />
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
