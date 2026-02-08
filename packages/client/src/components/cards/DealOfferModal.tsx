import type { GameState } from '@cashflow/shared';

interface DealOfferModalProps {
  gameState: GameState;
  localPlayerId: string;
  onDispatch: (action: import('@cashflow/shared').GameAction) => void;
}

export function DealOfferModal({ gameState, localPlayerId, onDispatch }: DealOfferModalProps) {
  const deal = gameState.pendingPlayerDeal;
  if (!deal || deal.buyerId !== localPlayerId) return null;

  const seller = gameState.players.find((p) => p.id === deal.sellerId);
  const card = gameState.activeCard;
  if (!card || (card.type !== 'smallDeal' && card.type !== 'bigDeal')) return null;

  const handleAccept = () => {
    onDispatch({ type: 'ACCEPT_PLAYER_DEAL', playerId: localPlayerId });
  };

  const handleDecline = () => {
    onDispatch({ type: 'DECLINE_PLAYER_DEAL', playerId: localPlayerId });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Deal Offer from {seller?.name || 'Player'}</h2>
        <div style={styles.cardInfo}>
          <h3 style={styles.cardTitle}>{card.card.title}</h3>
          <p style={styles.description}>{card.card.deal.description}</p>
          <div style={styles.priceRow}>
            <span>Asking Price:</span>
            <span style={styles.price}>${deal.askingPrice.toLocaleString()}</span>
          </div>
          {card.card.deal.type === 'realEstate' || card.card.deal.type === 'business' ? (
            <div style={styles.details}>
              <div>Cost: ${card.card.deal.cost.toLocaleString()}</div>
              <div>Down Payment: ${card.card.deal.downPayment.toLocaleString()}</div>
              <div>Cash Flow: ${card.card.deal.cashFlow}/mo</div>
            </div>
          ) : card.card.deal.type === 'stock' ? (
            <div style={styles.details}>
              <div>Price/Share: ${card.card.deal.costPerShare}</div>
              <div>Dividend: ${card.card.deal.dividendPerShare}/share</div>
            </div>
          ) : null}
        </div>
        <div style={styles.buttonRow}>
          <button style={styles.acceptButton} onClick={handleAccept}>
            Accept (Pay ${deal.askingPrice.toLocaleString()})
          </button>
          <button style={styles.declineButton} onClick={handleDecline}>
            Decline
          </button>
        </div>
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
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '1.1rem',
    color: '#f1c40f',
    textAlign: 'center',
  },
  cardInfo: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: '1rem',
    color: '#fff',
  },
  description: {
    margin: '0 0 12px',
    fontSize: '0.85rem',
    color: '#aaa',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    fontSize: '0.95rem',
    color: '#fff',
  },
  price: {
    fontWeight: 700,
    color: '#2ecc71',
    fontSize: '1.1rem',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.85rem',
    color: '#bbb',
    marginTop: '8px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
  },
  acceptButton: {
    flex: 1,
    padding: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
  },
  declineButton: {
    flex: 1,
    padding: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: '#999',
    cursor: 'pointer',
  },
};
