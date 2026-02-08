import { useState, useCallback } from 'react';
import type { GameState } from '@cashflow/shared';
import { getValidActions, TurnPhase } from '@cashflow/shared';
import { formatPhase } from '../../utils/formatters.js';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { DiceRoller } from '../board/DiceRoller';

interface ActionPanelProps {
  gameState: GameState;
  isOnline?: boolean;
  isMyTurn?: boolean;
  localPlayerId?: string;
}

export function ActionPanel({ gameState, isOnline = false, isMyTurn = true, localPlayerId }: ActionPanelProps) {
  const dispatch = useGameStore((s) => s.dispatch);
  const toggleFinancialStatement = useUIStore((s) => s.toggleFinancialStatement);
  const setShowDevicePass = useUIStore((s) => s.setShowDevicePass);
  const [loanAmount, setLoanAmount] = useState(1000);

  const player = gameState.players[gameState.currentPlayerIndex];
  const validActions = getValidActions(gameState);

  // In online mode, the dice values are irrelevant (server overrides).
  // We still dispatch the ROLL_DICE action but with placeholder values.
  const handleRoll = useCallback(
    (values: [number, number], useBothDice?: boolean) => {
      if (isOnline) {
        // In online mode, send dummy dice values; the server generates the real ones
        dispatch({ type: 'ROLL_DICE', playerId: player.id, diceValues: [0, 0], useBothDice });
      } else {
        dispatch({ type: 'ROLL_DICE', playerId: player.id, diceValues: values, useBothDice });
      }
    },
    [dispatch, player.id, isOnline],
  );

  const handleChooseDeal = (dealType: 'small' | 'big') => {
    dispatch({ type: 'CHOOSE_DEAL_TYPE', playerId: player.id, dealType });
  };

  const handleSkipDeal = () => {
    dispatch({ type: 'SKIP_DEAL', playerId: player.id });
  };

  const handleAcceptCharity = () => {
    dispatch({ type: 'ACCEPT_CHARITY', playerId: player.id });
  };

  const handleDeclineCharity = () => {
    dispatch({ type: 'DECLINE_CHARITY', playerId: player.id });
  };

  const handleCollectPayDay = () => {
    dispatch({ type: 'COLLECT_PAY_DAY', playerId: player.id });
  };

  const handleEndTurn = () => {
    if (!isOnline) {
      setShowDevicePass(true);
    }
    dispatch({ type: 'END_TURN', playerId: player.id });
  };

  const handleTakeLoan = () => {
    if (loanAmount > 0 && loanAmount % 1000 === 0) {
      dispatch({ type: 'TAKE_LOAN', playerId: player.id, amount: loanAmount });
    }
  };

  const handlePayOffLoan = (loanType: string, balance: number) => {
    const payAmount = Math.min(balance, Math.floor(player.cash / 1000) * 1000);
    if (payAmount > 0) {
      dispatch({
        type: 'PAY_OFF_LOAN',
        playerId: player.id,
        loanType,
        amount: payAmount,
      });
    }
  };

  // In online mode, if it's not my turn, show a read-only panel
  const actionsDisabled = isOnline && !isMyTurn;

  return (
    <div style={styles.container}>
      <div style={styles.phaseBar}>
        <span style={styles.phaseLabel}>{formatPhase(gameState.turnPhase)}</span>
        {isOnline && (
          <span style={{
            ...styles.turnTag,
            color: isMyTurn ? '#2ecc71' : '#e67e22',
          }}>
            {isMyTurn ? 'Your Turn' : `${player.name}'s Turn`}
          </span>
        )}
      </div>

      {actionsDisabled && (
        <div style={styles.waitingMessage}>
          Waiting for {player.name}...
        </div>
      )}

      {/* Dice roller for ROLL_DICE phase */}
      {!actionsDisabled && validActions.includes('ROLL_DICE') && (
        <DiceRoller onRoll={handleRoll} charityActive={player.charityTurnsLeft > 0} />
      )}

      {/* PayDay Collection */}
      {!actionsDisabled && validActions.includes('COLLECT_PAY_DAY') && (
        <button style={styles.primaryButton} onClick={handleCollectPayDay}>
          Collect Pay Day
        </button>
      )}

      {/* Deal choice */}
      {!actionsDisabled && validActions.includes('CHOOSE_DEAL_TYPE') && (
        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={() => handleChooseDeal('small')}>
            Small Deal
          </button>
          <button style={styles.secondaryButton} onClick={() => handleChooseDeal('big')}>
            Big Deal
          </button>
          <button style={styles.ghostButton} onClick={handleSkipDeal}>
            Skip Deal
          </button>
        </div>
      )}

      {/* Charity */}
      {!actionsDisabled && validActions.includes('ACCEPT_CHARITY') && (
        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={handleAcceptCharity}>
            Accept Charity (10% of income)
          </button>
          <button style={styles.ghostButton} onClick={handleDeclineCharity}>
            Decline Charity
          </button>
        </div>
      )}

      {/* Bankruptcy */}
      {!actionsDisabled && validActions.includes('DECLARE_BANKRUPTCY') && (
        <div style={styles.buttonGroup}>
          <div style={{ textAlign: 'center', color: '#e74c3c', fontSize: '0.9rem', fontWeight: 600 }}>
            Cash flow is negative and you cannot take more loans.
          </div>
          <button
            style={{ ...styles.primaryButton, background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}
            onClick={() => dispatch({ type: 'DECLARE_BANKRUPTCY', playerId: player.id })}
          >
            Declare Bankruptcy
          </button>
        </div>
      )}

      {/* End of turn actions */}
      {!actionsDisabled && gameState.turnPhase === TurnPhase.END_OF_TURN && (
        <div style={styles.endTurnSection}>
          {/* Loan controls */}
          <div style={styles.loanSection}>
            <div style={styles.loanRow}>
              <span style={styles.loanLabel}>Bank Loan:</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Math.max(1000, parseInt(e.target.value) || 1000))}
                style={styles.loanInput}
              />
              <button style={styles.smallButton} onClick={handleTakeLoan}>
                Take Loan
              </button>
            </div>

            {/* Pay off liabilities */}
            {player.bankLoanAmount > 0 && (
              <div style={styles.loanRow}>
                <span style={styles.loanLabel}>
                  Bank Loan: ${player.bankLoanAmount.toLocaleString()}
                </span>
                <button
                  style={styles.smallDangerButton}
                  onClick={() => handlePayOffLoan('Bank Loan', player.bankLoanAmount)}
                >
                  Pay Off
                </button>
              </div>
            )}

            {player.financialStatement.liabilities.map((liability) => (
              <div key={liability.name} style={styles.loanRow}>
                <span style={styles.loanLabel}>
                  {liability.name}: ${liability.balance.toLocaleString()}
                </span>
                <button
                  style={styles.smallDangerButton}
                  onClick={() => handlePayOffLoan(liability.name, liability.balance)}
                >
                  Pay Off
                </button>
              </div>
            ))}
          </div>

          <button style={styles.endTurnButton} onClick={handleEndTurn}>
            End Turn
          </button>
        </div>
      )}

      {/* Financial statement toggle */}
      <button style={styles.financialButton} onClick={toggleFinancialStatement}>
        Financial Statement
        {isOnline && localPlayerId && (
          <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '4px' }}>
            (Yours)
          </span>
        )}
      </button>
    </div>
  );
}



const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  phaseBar: {
    textAlign: 'center',
    padding: '8px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  phaseLabel: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  turnTag: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.05)',
  },
  waitingMessage: {
    textAlign: 'center',
    padding: '20px',
    color: '#888',
    fontSize: '0.95rem',
    fontStyle: 'italic',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  primaryButton: {
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  secondaryButton: {
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(52, 152, 219, 0.5)',
    background: 'rgba(52, 152, 219, 0.1)',
    color: '#3498db',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  ghostButton: {
    padding: '10px 16px',
    fontSize: '0.9rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: '#999',
    cursor: 'pointer',
  },
  endTurnSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loanSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  loanRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  loanLabel: {
    fontSize: '0.85rem',
    color: '#aaa',
    flex: 1,
  },
  loanInput: {
    width: '90px',
    padding: '6px 10px',
    fontSize: '0.9rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    textAlign: 'center',
  },
  smallButton: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(52, 152, 219, 0.3)',
    color: '#3498db',
    cursor: 'pointer',
  },
  smallDangerButton: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    cursor: 'pointer',
  },
  endTurnButton: {
    padding: '14px 20px',
    fontSize: '1.1rem',
    fontWeight: 700,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #e67e22, #d35400)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  financialButton: {
    padding: '10px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#aaa',
    cursor: 'pointer',
  },
};
