// Format integers as Chilean peso (CLP). Bicom-api returns all monetary
// fields as int (no decimals — CLP convention).
//
// Examples:
//   formatCLP(0)         -> "$0"
//   formatCLP(2500)      -> "$2.500"
//   formatCLP(1234567)   -> "$1.234.567"
//   formatCLP(-5000)     -> "-$5.000"

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(amount: number): string {
  return CLP.format(amount);
}

// Plain integer formatting with thousands separator (es-CL: "1.234.567").
const INT = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

export function formatInt(n: number): string {
  return INT.format(n);
}
