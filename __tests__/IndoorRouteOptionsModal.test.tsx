import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import IndoorRouteOptionsModal from '../components/IndoorRouteOptionsModal';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible?: boolean }) =>
    visible ? <>{children}</> : null;

  return {
    __esModule: true,
    default: MockModal,
  };
});

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      <>{children}</>,
  };
});

jest.mock('@/styles/indoorMapModal.styles', () => ({
  styles: new Proxy(
    {},
    {
      get: () => ({}),
    }
  ),
}));

describe('<IndoorRouteOptionsModal />', () => {
  const onChangeWheelchairAccessible = jest.fn();
  const onChangeAvoidStairs = jest.fn();
  const onChangePreferElevators = jest.fn();
  const onClose = jest.fn();

  const defaultProps = {
    visible: true,
    wheelchairAccessible: true,
    avoidStairs: true,
    preferElevators: true,
    onChangeWheelchairAccessible,
    onChangeAvoidStairs,
    onChangePreferElevators,
    onClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all toggle labels and descriptions', () => {
    const { getByText } = render(<IndoorRouteOptionsModal {...defaultProps} />);

    expect(getByText('Route Options')).toBeTruthy();

    expect(getByText('Wheelchair accessible')).toBeTruthy();
    expect(getByText('Prioritise ramps and wide paths')).toBeTruthy();

    expect(getByText('Avoid Stairs')).toBeTruthy();
    expect(getByText('Routes with no staircases')).toBeTruthy();

    expect(getByText('Prefer elevators')).toBeTruthy();
    expect(getByText('Indoor navigation using elevators')).toBeTruthy();
  });

  it('does not render content when modal is hidden', () => {
    const { queryByText } = render(
      <IndoorRouteOptionsModal {...defaultProps} visible={false} />
    );

    expect(queryByText('Route Options')).toBeNull();
    expect(queryByText('Wheelchair accessible')).toBeNull();
  });

  it('invokes toggle callbacks', () => {
    const { getByTestId } = render(<IndoorRouteOptionsModal {...defaultProps} />);

    fireEvent(getByTestId('indoor.options.wheelchair'), 'valueChange', false);
    expect(onChangeWheelchairAccessible).toHaveBeenCalledWith(false);

    fireEvent(getByTestId('indoor.options.avoid-stairs'), 'valueChange', false);
    expect(onChangeAvoidStairs).toHaveBeenCalledWith(false);

    fireEvent(getByTestId('indoor.options.prefer-elevators'), 'valueChange', false);
    expect(onChangePreferElevators).toHaveBeenCalledWith(false);
  });

  it('calls onClose when Done is pressed', () => {
    const { getByText } = render(<IndoorRouteOptionsModal {...defaultProps} />);

    fireEvent.press(getByText('Done'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
