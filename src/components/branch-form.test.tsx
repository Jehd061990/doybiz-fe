import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BranchForm } from './branch-form';

describe('BranchForm', () => {
  it('validates all backend-required fields before submitting', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(<BranchForm isSaving={false} error={null} success={null} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Create branch' }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a branch name, address, and contact number.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits exactly the supported branch fields and selected status', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(<BranchForm isSaving={false} error={null} success={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: '  North Branch  ' } });
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '555-0102' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '12 North Road' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'INACTIVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      name: 'North Branch',
      address: '12 North Road',
      contactNumber: '555-0102',
      status: 'INACTIVE',
    }));
  });

  it('keeps branch details available after a failed save', async () => {
    const onSubmit = jest.fn().mockResolvedValue(false);
    const { rerender } = render(<BranchForm isSaving={false} error={null} success={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: 'North Branch' } });
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '555-0102' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '12 North Road' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    rerender(<BranchForm isSaving={false} error="Check the branch details and try again." success={null} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Branch name')).toHaveValue('North Branch');
    expect(screen.getByRole('alert')).toHaveTextContent('Check the branch details and try again.');
  });
});