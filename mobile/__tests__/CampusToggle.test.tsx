
import React from 'react';
import { render} from '@testing-library/react-native';
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
    const { getByText, rerender } = render(
      <CampusToggle selectedCampus="SGW" onCampusChange={onCampusChangeMock} />
    );

    const sgwButton = getByText('SGW');
    const loyolaButton = getByText('Loyola');

    expect(sgwButton.props.style).toMatchObject({ color: '#fff' });
    expect(loyolaButton.props.style).toMatchObject({ color: '#222' });

    // Switch campus
    rerender(<CampusToggle selectedCampus="LOYOLA" onCampusChange={onCampusChangeMock} />);
    expect(getByText('Loyola').props.style).toMatchObject({ color: '#fff' });
  });

});