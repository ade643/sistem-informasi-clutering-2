import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from './header';

describe('Header component', () => {
  test('renders header with logo and navigation', () => {
    render(<Header />);
    const logo = screen.getByAltText(/logo/i);
    expect(logo).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });
});
