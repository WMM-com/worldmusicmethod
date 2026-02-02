import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PwyfSlider } from '@/components/checkout/PwyfSlider';

describe('PwyfSlider', () => {
  const defaultProps = {
    value: 50,
    onChange: vi.fn(),
    min: 5,
    max: 500,
    suggested: 50,
    currency: 'USD',
    currencySymbol: '$',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct min, max, and suggested labels', () => {
    render(<PwyfSlider {...defaultProps} />);
    
    expect(screen.getByText('$5')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('$50 suggested')).toBeInTheDocument();
    expect(screen.getByText('Suggested')).toBeInTheDocument();
  });

  it('displays current value in input field', () => {
    render(<PwyfSlider {...defaultProps} value={75} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(75);
  });

  it('shows correct dynamic step indicator', () => {
    // Value <= 50 should show step 1
    const { rerender } = render(<PwyfSlider {...defaultProps} value={45} />);
    expect(screen.getByText('Step: $1')).toBeInTheDocument();

    // Value 51-100 should show step 5
    rerender(<PwyfSlider {...defaultProps} value={75} />);
    expect(screen.getByText('Step: $5')).toBeInTheDocument();

    // Value 101-300 should show step 10
    rerender(<PwyfSlider {...defaultProps} value={150} />);
    expect(screen.getByText('Step: $10')).toBeInTheDocument();

    // Value > 300 should show step 50
    rerender(<PwyfSlider {...defaultProps} value={350} />);
    expect(screen.getByText('Step: $50')).toBeInTheDocument();
  });

  it('calls onChange with valid value on input blur', () => {
    const onChange = vi.fn();
    render(<PwyfSlider {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    // Type a new value
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.blur(input);
    
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('clamps value to min when input is below minimum', () => {
    const onChange = vi.fn();
    render(<PwyfSlider {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    // Try to set value below min
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);
    
    // Should clamp to min (5)
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('clamps value to max when input is above maximum', () => {
    const onChange = vi.fn();
    render(<PwyfSlider {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    // Try to set value above max
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    
    // Should clamp to max (500)
    expect(onChange).toHaveBeenCalledWith(500);
  });

  it('handles Enter key to submit input value', () => {
    const onChange = vi.fn();
    render(<PwyfSlider {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    fireEvent.change(input, { target: { value: '85' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onChange).toHaveBeenCalledWith(85);
  });

  it('handles invalid input by defaulting to min', () => {
    const onChange = vi.fn();
    render(<PwyfSlider {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    // Type invalid value
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    
    // Should default to min
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe('PwyfSlider dynamic stepping', () => {
  it('rounds to step of 1 for values up to 50', () => {
    const onChange = vi.fn();
    render(
      <PwyfSlider
        value={30}
        onChange={onChange}
        min={5}
        max={500}
        suggested={50}
        currency="USD"
        currencySymbol="$"
      />
    );
    
    const input = screen.getByRole('spinbutton');
    
    // 33 should stay as 33 (step 1)
    fireEvent.change(input, { target: { value: '33' } });
    fireEvent.blur(input);
    
    expect(onChange).toHaveBeenCalledWith(33);
  });

  it('allows exact values within step boundaries', () => {
    const onChange = vi.fn();
    render(
      <PwyfSlider
        value={75}
        onChange={onChange}
        min={5}
        max={500}
        suggested={50}
        currency="USD"
        currencySymbol="$"
      />
    );
    
    const input = screen.getByRole('spinbutton');
    
    // 55 is valid (step 5 in range 51-100)
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.blur(input);
    
    expect(onChange).toHaveBeenCalledWith(55);
  });
});
