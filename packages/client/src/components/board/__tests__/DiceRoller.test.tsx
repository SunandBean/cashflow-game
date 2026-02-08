import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiceRoller } from '../DiceRoller';

describe('DiceRoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders two SVG dice', () => {
    const { container } = render(<DiceRoller onRoll={vi.fn()} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('shows "Roll Dice" button when charity is not active', () => {
    render(<DiceRoller onRoll={vi.fn()} />);
    expect(screen.getByText('Roll Dice')).toBeInTheDocument();
    expect(screen.queryByText('Roll 1 Die')).not.toBeInTheDocument();
    expect(screen.queryByText('Roll 2 Dice')).not.toBeInTheDocument();
  });

  it('shows "Roll 1 Die" and "Roll 2 Dice" buttons when charity is active', () => {
    render(<DiceRoller onRoll={vi.fn()} charityActive />);
    expect(screen.getByText('Roll 1 Die')).toBeInTheDocument();
    expect(screen.getByText('Roll 2 Dice')).toBeInTheDocument();
    expect(screen.queryByText('Roll Dice')).not.toBeInTheDocument();
  });

  it('calls onRoll after animation completes', () => {
    const onRoll = vi.fn();
    render(<DiceRoller onRoll={onRoll} />);

    fireEvent.click(screen.getByText('Roll Dice'));

    // Advance through 6 intervals of 50ms each
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    const [values, useBothDice] = onRoll.mock.calls[0];
    expect(values).toHaveLength(2);
    expect(values[0]).toBeGreaterThanOrEqual(1);
    expect(values[0]).toBeLessThanOrEqual(6);
    expect(values[1]).toBeGreaterThanOrEqual(1);
    expect(values[1]).toBeLessThanOrEqual(6);
    expect(useBothDice).toBe(false);
  });

  it('shows "Rolling..." and disables button during animation', () => {
    render(<DiceRoller onRoll={vi.fn()} />);
    fireEvent.click(screen.getByText('Roll Dice'));

    // During animation
    expect(screen.getByText('Rolling...')).toBeInTheDocument();
    expect(screen.getByText('Rolling...')).toBeDisabled();

    // Complete animation
    act(() => {
      vi.advanceTimersByTime(300);
    });
  });

  it('does not call onRoll when disabled', () => {
    const onRoll = vi.fn();
    render(<DiceRoller onRoll={onRoll} disabled />);
    fireEvent.click(screen.getByText('Roll Dice'));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onRoll).not.toHaveBeenCalled();
  });

  it('charity "Roll 2 Dice" calls onRoll with useBothDice=true', () => {
    const onRoll = vi.fn();
    render(<DiceRoller onRoll={onRoll} charityActive />);

    fireEvent.click(screen.getByText('Roll 2 Dice'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll.mock.calls[0][1]).toBe(true);
  });
});
