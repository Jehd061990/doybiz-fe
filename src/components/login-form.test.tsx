import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('submits credentials and reports a rejected login', async () => {
    const onLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'wrong-password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('toggles password visibility', () => {
    render(<LoginForm onLogin={jest.fn()} />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(toggleButton).toHaveAccessibleName('Hide password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAccessibleName('Show password');
  });
});
