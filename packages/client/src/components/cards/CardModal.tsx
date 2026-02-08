import { useState } from 'react';
import type { GameState, GameAction } from '@cashflow/shared';
import { calculateTotalIncome, TurnPhase } from '@cashflow/shared';
import { useGameStore } from '../../stores/gameStore';
import { formatMoney } from '../../utils/formatters.js';

interface CardModalProps {
  gameState: GameState;
  onDispatch?: (action: GameAction) => void;
  localPlayerId?: string;
}

export function CardModal({ gameState, onDispatch, localPlayerId }: CardModalProps) {
  const storeDispatch = useGameStore((s) => s.dispatch);
  const dispatch = onDispatch ?? storeDispatch;
  const [shares, setShares] = useState(1);
  const [showSellToPlayer, setShowSellToPlayer] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [askingPrice, setAskingPrice] = useState(0);
  const activeCard = gameState.activeCard;
  const player = gameState.players[gameState.currentPlayerIndex];

  if (!activeCard) return null;

  const handleBuy = () => {
    if (activeCard.type === 'smallDeal' || activeCard.type === 'bigDeal') {
      const deal = activeCard.card.deal;
      if (deal.type === 'stock') {
        dispatch({ type: 'BUY_ASSET', playerId: player.id, shares });
      } else {
        dispatch({ type: 'BUY_ASSET', playerId: player.id });
      }
    }
  };

  const handlePass = () => {
    dispatch({ type: 'SKIP_DEAL', playerId: player.id });
  };

  const handlePayExpense = () => {
    dispatch({ type: 'PAY_EXPENSE', playerId: player.id });
  };

  const handleSellToMarket = (assetId: string) => {
    dispatch({ type: 'SELL_TO_MARKET', playerId: player.id, assetId });
  };

  const handleDeclineMarket = () => {
    dispatch({ type: 'DECLINE_MARKET', playerId: player.id });
  };

  const renderDealCard = () => {
    if (activeCard.type !== 'smallDeal' && activeCard.type !== 'bigDeal') return null;
    const card = activeCard.card;
    const deal = card.deal;

    return (
      <div>
        <div style={styles.cardType}>
          {activeCard.type === 'smallDeal' ? 'Small Deal' : 'Big Deal'}
        </div>
        <h2 style={styles.cardTitle}>{card.title}</h2>
        <p style={styles.description}>{deal.description}</p>
        {deal.rule && <p style={styles.rule}>{deal.rule}</p>}

        <div style={styles.detailsGrid}>
          {deal.type === 'stock' && (
            <>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Symbol</span>
                <span style={styles.detailValue}>{deal.symbol}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Price/Share</span>
                <span style={styles.detailValue}>{formatMoney(deal.costPerShare)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Dividend</span>
                <span style={styles.detailValue}>{formatMoney(deal.dividendPerShare)}/share</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Price Range</span>
                <span style={styles.detailValue}>
                  {formatMoney(deal.historicalPriceRange.low)} - {formatMoney(deal.historicalPriceRange.high)}
                </span>
              </div>
            </>
          )}
          {(deal.type === 'realEstate' || deal.type === 'business') && (
            <>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Cost</span>
                <span style={styles.detailValue}>{formatMoney(deal.cost)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Down Payment</span>
                <span style={styles.detailValue}>{formatMoney(deal.downPayment)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Mortgage</span>
                <span style={styles.detailValue}>{formatMoney(deal.mortgage)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Cash Flow</span>
                <span style={{ ...styles.detailValue, color: deal.cashFlow >= 0 ? '#2ecc71' : '#e74c3c' }}>
                  {formatMoney(deal.cashFlow)}/mo
                </span>
              </div>
            </>
          )}
        </div>

        {deal.type === 'stock' && (
          <div style={styles.sharesInput}>
            <label style={styles.sharesLabel}>Shares to buy:</label>
            <input
              type="number"
              min={1}
              value={shares}
              onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
              style={styles.numberInput}
            />
            <span style={styles.totalCost}>
              Total: {formatMoney(deal.costPerShare * shares)}
            </span>
            {deal.costPerShare * shares > player.cash && (
              <span style={styles.cantAfford}>Cannot afford!</span>
            )}
          </div>
        )}

        {deal.type !== 'stock' && deal.downPayment > player.cash && (
          <div style={styles.cantAffordBanner}>
            Not enough cash! Need {formatMoney(deal.downPayment)}, have {formatMoney(player.cash)}
          </div>
        )}

        <div style={styles.cashDisplay}>
          Your Cash: {formatMoney(player.cash)}
        </div>

        {gameState.turnPhase === TurnPhase.WAITING_FOR_DEAL_RESPONSE && gameState.pendingPlayerDeal ? (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(241,196,15,0.1)', borderRadius: '8px', border: '1px solid rgba(241,196,15,0.3)' }}>
            <div style={{ color: '#f1c40f', fontWeight: 600, marginBottom: '4px' }}>
              Waiting for {gameState.players.find(p => p.id === gameState.pendingPlayerDeal!.buyerId)?.name || 'player'} to respond...
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>
              Offered for {formatMoney(gameState.pendingPlayerDeal.askingPrice)}
            </div>
          </div>
        ) : (
          <>
            <div style={styles.buttonRow}>
              <button style={styles.buyButton} onClick={handleBuy}>
                Buy
              </button>
              <button style={styles.passButton} onClick={handlePass}>
                Pass
              </button>
            </div>
          </>
        )}

        {/* Sell to Player */}
        {gameState.turnPhase !== TurnPhase.WAITING_FOR_DEAL_RESPONSE && gameState.players.filter((p) => p.id !== player.id && !p.isBankrupt).length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {!showSellToPlayer ? (
              <button
                style={{ ...styles.passButton, width: '100%', color: '#f1c40f', borderColor: 'rgba(241,196,15,0.3)' }}
                onClick={() => setShowSellToPlayer(true)}
              >
                Sell to Player
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#e0e0e0', fontSize: '0.9rem' }}
                >
                  <option value="">Select player...</option>
                  {gameState.players
                    .filter((p) => p.id !== player.id && !p.isBankrupt)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Price: $</span>
                  <input
                    type="number"
                    min={1}
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ ...styles.numberInput, flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...styles.buyButton, flex: 1, background: 'linear-gradient(135deg, #f1c40f, #d4ac0d)', opacity: (!selectedTargetId || askingPrice <= 0) ? 0.5 : 1 }}
                    disabled={!selectedTargetId || askingPrice <= 0}
                    onClick={() => {
                      dispatch({ type: 'OFFER_DEAL_TO_PLAYER', playerId: player.id, targetPlayerId: selectedTargetId, askingPrice });
                      setShowSellToPlayer(false);
                    }}
                  >
                    Offer Deal
                  </button>
                  <button
                    style={{ ...styles.passButton, flex: 1 }}
                    onClick={() => setShowSellToPlayer(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMarketCard = () => {
    if (activeCard.type !== 'market') return null;
    const card = activeCard.card;
    const effect = card.effect;

    // Determine which player assets are eligible for selling
    const eligibleAssets = player.financialStatement.assets.filter((asset) => {
      if (effect.type === 'stockPriceChange') {
        return 'symbol' in asset && asset.symbol === effect.symbol;
      }
      if (effect.type === 'realEstateOffer' || effect.type === 'realEstateOfferFlat') {
        return 'type' in asset && effect.subTypes.includes((asset as { type: string }).type);
      }
      return false;
    });

    return (
      <div>
        <div style={{ ...styles.cardType, background: 'rgba(230, 126, 34, 0.2)', color: '#e67e22' }}>
          Market Card
        </div>
        <h2 style={styles.cardTitle}>{card.title}</h2>
        <p style={styles.description}>{card.description}</p>

        {effect.type === 'stockPriceChange' && (
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Stock</span>
              <span style={styles.detailValue}>{effect.symbol}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>New Price</span>
              <span style={styles.detailValue}>{formatMoney(effect.newPrice)}</span>
            </div>
          </div>
        )}

        {eligibleAssets.length > 0 && (
          <div style={styles.sellSection}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#aaa' }}>
              Your eligible assets:
            </h4>
            {eligibleAssets.map((asset) => (
              <div key={asset.id} style={styles.sellRow}>
                <span style={{ color: '#e0e0e0' }}>{asset.name}</span>
                <button
                  style={styles.sellButton}
                  onClick={() => handleSellToMarket(asset.id)}
                >
                  Sell
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={styles.buttonRow}>
          <button style={styles.declineButton} onClick={handleDeclineMarket}>
            {eligibleAssets.length > 0 ? 'Done / Decline' : 'Decline'}
          </button>
        </div>
      </div>
    );
  };

  const renderDoodadCard = () => {
    if (activeCard.type !== 'doodad') return null;
    const card = activeCard.card;

    let actualCost = card.cost;
    let costLabel = formatMoney(actualCost);
    if (card.isPercentOfIncome) {
      const totalIncome = calculateTotalIncome(player.financialStatement);
      actualCost = Math.floor(totalIncome * (card.cost / 100));
      costLabel = `${formatMoney(actualCost)} (${card.cost}% of income)`;
    }

    return (
      <div>
        <div style={{ ...styles.cardType, background: 'rgba(192, 57, 43, 0.2)', color: '#e74c3c' }}>
          Doodad
        </div>
        <h2 style={styles.cardTitle}>{card.title}</h2>
        <p style={styles.description}>{card.description}</p>

        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Cost</span>
            <span style={{ ...styles.detailValue, color: '#e74c3c' }}>{costLabel}</span>
          </div>
        </div>

        <div style={styles.cashDisplay}>
          Your Cash: {formatMoney(player.cash)}
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.payButton} onClick={handlePayExpense}>
            Pay {formatMoney(actualCost)}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {(activeCard.type === 'smallDeal' || activeCard.type === 'bigDeal') && renderDealCard()}
        {activeCard.type === 'market' && renderMarketCard()}
        {activeCard.type === 'doodad' && renderDoodadCard()}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#1e2a3a',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  cardType: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '12px',
    background: 'rgba(41, 128, 185, 0.2)',
    color: '#3498db',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '0.95rem',
    color: '#aaa',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  rule: {
    fontSize: '0.85rem',
    color: '#888',
    fontStyle: 'italic',
    marginBottom: '16px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '6px',
    borderLeft: '3px solid rgba(255,255,255,0.1)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: '#888',
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  sharesInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  sharesLabel: {
    fontSize: '0.9rem',
    color: '#aaa',
  },
  numberInput: {
    width: '80px',
    padding: '8px 12px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    textAlign: 'center',
  },
  totalCost: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  cantAfford: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#e74c3c',
  },
  cantAffordBanner: {
    padding: '10px 14px',
    marginBottom: '12px',
    borderRadius: '8px',
    background: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    color: '#e74c3c',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  cashDisplay: {
    padding: '8px 14px',
    marginBottom: '16px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    fontSize: '0.9rem',
    color: '#aaa',
    fontWeight: 600,
    textAlign: 'center',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  buyButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
  },
  passButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#ccc',
    cursor: 'pointer',
  },
  payButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    color: '#fff',
    cursor: 'pointer',
  },
  declineButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#ccc',
    cursor: 'pointer',
  },
  sellButton: {
    padding: '6px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    background: 'linear-gradient(135deg, #e67e22, #d35400)',
    color: '#fff',
    cursor: 'pointer',
  },
  sellSection: {
    padding: '12px',
    marginBottom: '16px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  sellRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
};
