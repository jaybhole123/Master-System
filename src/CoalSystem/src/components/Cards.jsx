import { display } from "../utils/format";

/** A single label → value row inside a card */
function Field({ label, value }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{display(value)}</span>
    </div>
  );
}

/** Generic info card with a title and a list of fields */
export function InfoCard({ title, fields, wide = false }) {
  return (
    <div className={`card${wide ? " wide" : ""}`}>
      <h2 className="card-title">{title}</h2>
      {fields.map(([label, value]) => (
        <Field key={label} label={label} value={value} />
      ))}
    </div>
  );
}

/** Material line-item card with a 5-column grid layout */
export function MaterialCard({ material }) {
  if (!material) return null;
  return (
    <div className="card wide">
      <h2 className="card-title">Material</h2>
      <div className="material-row">
        <div className="field">
          <span className="field-label">Code</span>
          <span className="field-value">{display(material.materialCode)}</span>
        </div>
        <div className="field">
          <span className="field-label">Description</span>
          <span className="field-value">{display(material.description)}</span>
        </div>
        <div className="field">
          <span className="field-label">HSN</span>
          <span className="field-value">{display(material.hsnCode)}</span>
        </div>
        <div className="field">
          <span className="field-label">Quantity</span>
          <span className="field-value">
            {material.quantity} {material.unit}
          </span>
        </div>
        <div className="field">
          <span className="field-label">Amount</span>
          <span className="field-value">
            ₹{" "}
            {material.amount === null
              ? "—"
              : new Intl.NumberFormat("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(material.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
