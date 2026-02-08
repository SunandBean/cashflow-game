import type { Player } from '@cashflow/shared';
import {
  calculatePassiveIncome,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCashFlow,
  calculateBankLoanPayment,
  isStockAsset,
  isRealEstateAsset,
  isBusinessAsset,
  canEscapeRatRace,
} from '@cashflow/shared';
import { useUIStore } from '../../stores/uiStore';
import { formatMoney } from '../../utils/formatters.js';

interface FinancialStatementProps {
  player: Player;
}

export function FinancialStatement({ player }: FinancialStatementProps) {
  const toggleFinancialStatement = useUIStore((s) => s.toggleFinancialStatement);
  const fs = player.financialStatement;
  const passiveIncome = calculatePassiveIncome(fs);
  const totalIncome = calculateTotalIncome(fs);
  const totalExpenses = calculateTotalExpenses(player);
  const cashFlow = calculateCashFlow(player);
  const bankLoanPayment = calculateBankLoanPayment(player);
  const escaped = canEscapeRatRace(player);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Financial Statement - {player.name}</h3>
        <button style={styles.closeButton} onClick={toggleFinancialStatement}>
          Close
        </button>
      </div>

      {escaped && (
        <div style={styles.escapeBanner}>
          Passive Income exceeds Expenses! Eligible to escape the Rat Race!
        </div>
      )}

      {/* Income Section */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Income</h4>
        <div style={styles.row}>
          <span>Salary</span>
          <span>{formatMoney(fs.income.salary)}</span>
        </div>
        <div style={styles.row}>
          <span>Passive Income</span>
          <span style={{ color: passiveIncome > 0 ? '#2ecc71' : '#aaa' }}>
            {formatMoney(passiveIncome)}
          </span>
        </div>
        <div style={styles.totalRow}>
          <span>Total Income</span>
          <span>{formatMoney(totalIncome)}</span>
        </div>
      </div>

      {/* Expenses Section */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Expenses</h4>
        <div style={styles.row}>
          <span>Taxes</span>
          <span>{formatMoney(fs.expenses.taxes)}</span>
        </div>
        <div style={styles.row}>
          <span>Home Mortgage</span>
          <span>{formatMoney(fs.expenses.homeMortgagePayment)}</span>
        </div>
        {fs.expenses.schoolLoanPayment > 0 && (
          <div style={styles.row}>
            <span>School Loan</span>
            <span>{formatMoney(fs.expenses.schoolLoanPayment)}</span>
          </div>
        )}
        <div style={styles.row}>
          <span>Car Loan</span>
          <span>{formatMoney(fs.expenses.carLoanPayment)}</span>
        </div>
        <div style={styles.row}>
          <span>Credit Card</span>
          <span>{formatMoney(fs.expenses.creditCardPayment)}</span>
        </div>
        <div style={styles.row}>
          <span>Other Expenses</span>
          <span>{formatMoney(fs.expenses.otherExpenses)}</span>
        </div>
        {fs.expenses.childCount > 0 && (
          <div style={styles.row}>
            <span>Children ({fs.expenses.childCount} x {formatMoney(fs.expenses.perChildExpense)})</span>
            <span>{formatMoney(fs.expenses.perChildExpense * fs.expenses.childCount)}</span>
          </div>
        )}
        {player.bankLoanAmount > 0 && (
          <div style={styles.row}>
            <span>Bank Loan Payment</span>
            <span>{formatMoney(bankLoanPayment)}</span>
          </div>
        )}
        <div style={styles.totalRow}>
          <span>Total Expenses</span>
          <span>{formatMoney(totalExpenses)}</span>
        </div>
      </div>

      {/* Cash Flow */}
      <div style={{ ...styles.section, ...styles.cashFlowSection }}>
        <div style={styles.cashFlowRow}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Monthly Cash Flow</span>
          <span
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: cashFlow >= 0 ? '#2ecc71' : '#e74c3c',
            }}
          >
            {formatMoney(cashFlow)}
          </span>
        </div>
        <div style={styles.row}>
          <span>Cash on Hand</span>
          <span style={{ color: player.cash >= 0 ? '#e0e0e0' : '#e74c3c', fontWeight: 600 }}>
            {formatMoney(player.cash)}
          </span>
        </div>
      </div>

      {/* Assets Section */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Assets</h4>
        {fs.assets.length === 0 ? (
          <div style={styles.emptyText}>No assets</div>
        ) : (
          fs.assets.map((asset) => (
            <div key={asset.id} style={styles.assetRow}>
              {isStockAsset(asset) && (
                <>
                  <span>{asset.name} ({asset.symbol})</span>
                  <span>
                    {asset.shares} shares @ {formatMoney(asset.costPerShare)}
                    {asset.dividendPerShare > 0 && ` (div: ${formatMoney(asset.dividendPerShare)})`}
                  </span>
                </>
              )}
              {isRealEstateAsset(asset) && (
                <>
                  <span>{asset.name}</span>
                  <span>CF: {formatMoney(asset.cashFlow)}/mo</span>
                </>
              )}
              {isBusinessAsset(asset) && (
                <>
                  <span>{asset.name}</span>
                  <span>CF: {formatMoney(asset.cashFlow)}/mo</span>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Liabilities Section */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Liabilities</h4>
        {fs.liabilities.length === 0 && player.bankLoanAmount === 0 ? (
          <div style={styles.emptyText}>No liabilities</div>
        ) : (
          <>
            {fs.liabilities.map((liability, i) => (
              <div key={i} style={styles.row}>
                <span>{liability.name}</span>
                <span>{formatMoney(liability.balance)}</span>
              </div>
            ))}
            {player.bankLoanAmount > 0 && (
              <div style={styles.row}>
                <span>Bank Loan</span>
                <span>{formatMoney(player.bankLoanAmount)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: 0,
  },
  closeButton: {
    padding: '4px 12px',
    fontSize: '0.8rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
  },
  escapeBanner: {
    padding: '8px 12px',
    marginBottom: '12px',
    borderRadius: '8px',
    background: 'rgba(46, 204, 113, 0.15)',
    border: '1px solid rgba(46, 204, 113, 0.3)',
    color: '#2ecc71',
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  section: {
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '6px',
    margin: '0 0 6px 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontSize: '0.85rem',
    color: '#ccc',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0 2px',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#e0e0e0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: '4px',
  },
  cashFlowSection: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '12px',
  },
  cashFlowRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  assetRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '0.83rem',
    color: '#ccc',
  },
  emptyText: {
    fontSize: '0.83rem',
    color: '#666',
    fontStyle: 'italic',
    padding: '4px 0',
  },
};
