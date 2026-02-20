import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NavigationSteps from '../components/NavigationSteps';
import type { NavigationStep } from '../components/NavigationSteps';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }: { name: string }) => <Text>{name}</Text> };
});

function makeStep(overrides: Partial<NavigationStep> = {}): NavigationStep {
  return {
    instruction: 'Go straight',
    distance: '100 m',
    duration: '1 min',
    startLocation: { latitude: 45.496, longitude: -73.578 },
    endLocation: { latitude: 45.497, longitude: -73.579 },
    ...overrides,
  };
}

const defaultProps = {
  steps: [makeStep()],
  currentStepIndex: 0,
  totalDistance: '1.5 km',
  totalDuration: '10 min',
  onEndNavigation: jest.fn(),
  onNextStep: jest.fn(),
  onPrevStep: jest.fn(),
};

describe('<NavigationSteps />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('returns null when currentStepIndex is out of bounds', () => {
      const { toJSON } = render(
        <NavigationSteps {...defaultProps} currentStepIndex={99} />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders the current step instruction stripping HTML tags', () => {
      const { getByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep({ instruction: 'Turn <b>left</b> onto Main St' })]}
        />
      );
      expect(getByText('Turn left onto Main St')).toBeTruthy();
    });

    it('renders the current step distance', () => {
      const { getByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep({ distance: '250 m' })]}
        />
      );
      expect(getByText('250 m')).toBeTruthy();
    });

    it('shows step counter', () => {
      const { getByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep(), makeStep({ instruction: 'Turn right' })]}
          currentStepIndex={0}
        />
      );
      expect(getByText('Step 1 of 2')).toBeTruthy();
    });

    it('shows total distance and duration', () => {
      const { getByText } = render(<NavigationSteps {...defaultProps} />);
      expect(getByText('1.5 km · 10 min')).toBeTruthy();
    });
  });

  describe('Off-route', () => {
    it('shows off-route banner when isOffRoute is true', () => {
      const { getByText } = render(
        <NavigationSteps {...defaultProps} isOffRoute={true} />
      );
      expect(getByText('You are off route. Head back to the path.')).toBeTruthy();
    });

    it('hides off-route banner by default', () => {
      const { queryByText } = render(<NavigationSteps {...defaultProps} />);
      expect(queryByText('You are off route. Head back to the path.')).toBeNull();
    });
  });

  describe('Next step preview', () => {
    it('shows NEXT step preview when a following step exists', () => {
      const { getByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep(), makeStep({ instruction: 'Turn right' })]}
          currentStepIndex={0}
        />
      );
      expect(getByText('NEXT')).toBeTruthy();
    });

    it('hides NEXT step preview at the last step', () => {
      const { queryByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep(), makeStep({ instruction: 'Turn right' })]}
          currentStepIndex={1}
        />
      );
      expect(queryByText('NEXT')).toBeNull();
    });
  });

  describe('Button states', () => {
    it('disables prev button on first step', () => {
      const { getByLabelText } = render(
        <NavigationSteps {...defaultProps} currentStepIndex={0} />
      );
      expect(getByLabelText('Previous step').props.accessibilityState.disabled).toBe(true);
    });

    it('disables next button on last step', () => {
      const { getByLabelText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep(), makeStep({ instruction: 'Turn right' })]}
          currentStepIndex={1}
        />
      );
      expect(getByLabelText('Next step').props.accessibilityState.disabled).toBe(true);
    });

    it('enables both buttons on a middle step', () => {
      const { getByLabelText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[
            makeStep(),
            makeStep({ instruction: 'Turn right' }),
            makeStep({ instruction: 'Arrive at destination' }),
          ]}
          currentStepIndex={1}
        />
      );
      expect(getByLabelText('Previous step').props.accessibilityState.disabled).toBe(false);
      expect(getByLabelText('Next step').props.accessibilityState.disabled).toBe(false);
    });

    it('single step disables both prev and next', () => {
      const { getByLabelText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep()]}
          currentStepIndex={0}
        />
      );
      expect(getByLabelText('Previous step').props.accessibilityState.disabled).toBe(true);
      expect(getByLabelText('Next step').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Button callbacks', () => {
    it('calls onPrevStep when prev button is pressed', () => {
      const onPrevStep = jest.fn();
      const { getByLabelText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep(), makeStep({ instruction: 'Turn right' })]}
          currentStepIndex={1}
          onPrevStep={onPrevStep}
        />
      );
      fireEvent.press(getByLabelText('Previous step'));
      expect(onPrevStep).toHaveBeenCalledTimes(1);
    });

    it('calls onNextStep when next button is pressed', () => {
      const onNextStep = jest.fn();
      const { getByLabelText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep(), makeStep({ instruction: 'Turn right' })]}
          currentStepIndex={0}
          onNextStep={onNextStep}
        />
      );
      fireEvent.press(getByLabelText('Next step'));
      expect(onNextStep).toHaveBeenCalledTimes(1);
    });

    it('calls onEndNavigation when end button is pressed', () => {
      const onEndNavigation = jest.fn();
      const { getByLabelText } = render(
        <NavigationSteps {...defaultProps} onEndNavigation={onEndNavigation} />
      );
      fireEvent.press(getByLabelText('End navigation'));
      expect(onEndNavigation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Maneuver icons', () => {
    it('renders with no maneuver (defaults to arrow-up icon)', () => {
      const { getAllByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep({ maneuver: undefined })]}
        />
      );
      expect(getAllByText('arrow-up').length).toBeGreaterThanOrEqual(1);
    });

    it('renders with a known maneuver icon', () => {
      const { getAllByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep({ maneuver: 'turn-left' })]}
        />
      );
      expect(getAllByText('arrow-left').length).toBeGreaterThanOrEqual(1);
    });

    it('renders with an unknown maneuver (falls back to arrow-up)', () => {
      const { getAllByText } = render(
        <NavigationSteps
          {...defaultProps}
          steps={[makeStep({ maneuver: 'some-unknown' })]}
        />
      );
      expect(getAllByText('arrow-up').length).toBeGreaterThanOrEqual(1);
    });
  });
});
