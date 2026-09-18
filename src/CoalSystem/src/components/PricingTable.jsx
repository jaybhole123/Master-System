import { INR } from "../utils/format";

/**
 * Pricing particulars table card.
 * Props: particulars — array of { label, rate, amount }
 */
export default function PricingTable({ particulars }) {
  if (!particulars || particulars.length === 0) return null;

  return (
    <div className="card wide">
      <h2 className="card-title">Pricing Particulars</h2>
      <table className="ptable">
        <thead>
          <tr>
            <th>Description</th>
            <th>Rate / TE (INR)</th>
            <th>Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          {particulars.map((p, idx) => (
            <tr
              key={idx}
              className={p.label.startsWith("Requisite") ? "highlight" : ""}
            >
              <td>{p.label}</td>
              <td className="num">{p.rate === null ? "—" : INR(p.rate)}</td>
              <td className="num">{INR(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
