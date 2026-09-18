import { INR } from "../utils/format";

/**
 * Payment stub — the decorative "cheque stub" at the bottom.
 * Props: totals, totalValueWords
 */
export default function PaymentStub({ totals, totalValueWords }) {
  const { grandTotal, emdDeduction, requisitePayment } = totals;

  return (
    <div className="stub">
      <div className="stub-notch" aria-hidden="true" />
      <div className="stub-inner">
        <div className="stub-label">Requisite Payment</div>
        <div className="stub-amount" id="stubAmount">
          ₹ {INR(requisitePayment)}
        </div>
        {totalValueWords && (
          <div className="stub-words" id="stubWords">
            {totalValueWords}
          </div>
        )}
        <div className="stub-meta">
          <span id="stubGrand">Grand Total incl. EMD: ₹ {INR(grandTotal)}</span>
          <span id="stubEmd">Less EMD: ₹ {INR(emdDeduction)}</span>
        </div>
      </div>
      <div className="stub-notch" aria-hidden="true" />
    </div>
  );
}
