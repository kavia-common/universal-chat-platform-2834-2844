import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Ocean Chat brand', () => {
  render(<App />);
  const brand = screen.getByText(/Ocean Chat/i);
  expect(brand).toBeInTheDocument();
});
