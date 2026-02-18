import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampusToggle from '../components/campusToggle';

describe('CampusToggle', () => {
  const onCampusChangeMock = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders both SGW and Loyola buttons', () => {
    const { getByText } = render(
      <CampusToggle selectedCampus="SGW" onCampusChange={onCampusChangeMock} />
    );

    expect(getByText('SGW')).toBeTruthy();
    expect(getByText('Loyola')).toBeTruthy();
  });

  it('highlights the selected campus', () => {
    const { getByLabelText, rerender } = render(
      <CampusToggle selectedCampus="SGW" onCampusChange={onCampusChangeMock} />
    );

    const sgwButton = getByLabelText('Select SGW campus');
    const loyolaButton = getByLabelText('Select Loyola campus');

    expect(sgwButton).toHaveAccessibilityValue({ text: 'SGW' });
    expect(loyolaButton).toHaveAccessibilityValue({ text: 'Loyola' });

    rerender(
      <CampusToggle selectedCampus="LOYOLA" onCampusChange={onCampusChangeMock} />
    );

    expect(getByLabelText('Select SGW campus')).toHaveAccessibilityValue({ text: 'SGW' });
    expect(getByLabelText('Select Loyola campus')).toHaveAccessibilityValue({ text: 'Loyola' });
  });

  it('calls onCampusChange when a campus button is pressed', () => {
    const { getByText } = render(
      <CampusToggle selectedCampus="SGW" onCampusChange={onCampusChangeMock} />
    );

    fireEvent.press(getByText('Loyola'));

    expect(onCampusChangeMock).toHaveBeenCalledTimes(1);
    expect(onCampusChangeMock).toHaveBeenCalledWith('LOYOLA');
  });
});