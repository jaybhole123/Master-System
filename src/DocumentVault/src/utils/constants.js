// ── Document categories & type-specific field schemas ──

export const CATS = [
  "Driving Licence", "Property Document", "Aadhaar Card", "PAN Card",
  "Passport", "Voter ID", "Vehicle RC", "Insurance", "Bank Document",
  "Agreement / Contract", "Tax / GST", "Other"
];

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// Field helpers
const T = (k, l, o) => ({ k, l, t: "text", ...o });
const D = (k, l) => ({ k, l, t: "date" });
const SL = (k, l, opts) => ({ k, l, t: "select", opts });
const TA = (k, l) => ({ k, l, t: "textarea" });

export const TYPES = {
  "Driving Licence": {
    n: "Licence number",
    needIssue: true,
    needExpiry: true,
    f: [T("name", "Holder name"), D("dob", "Date of birth"), T("cls", "Vehicle classes (LMV, MCWG...)"), T("rto", "Issuing RTO / authority"), SL("bg", "Blood group", ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]), TA("addr", "Address on licence")]
  },
  "Property Document": {
    n: "Registry / document number",
    needIssue: false,
    needExpiry: false,
    f: [SL("ptype", "Property type", ["Plot", "House", "Flat / Apartment", "Agricultural land", "Commercial", "Other"]), T("owner", "Owner name(s)"), T("survey", "Survey / Khasra / Plot no."), T("area", "Area (sq ft / acre)"), D("regdate", "Registration date"), T("office", "Sub-registrar office"), T("value", "Registered / market value (₹)"), TA("loc", "Property address / location")]
  },
  "Aadhaar Card": {
    n: "Aadhaar number",
    needIssue: false,
    needExpiry: false,
    f: [T("name", "Name on card"), D("dob", "Date of birth"), SL("gender", "Gender", ["Male", "Female", "Other"]), T("mobile", "Linked mobile"), TA("addr", "Address")]
  },
  "PAN Card": {
    n: "PAN number", pat: /^[A-Z]{5}[0-9]{4}[A-Z]$/, pm: "PAN must look like ABCDE1234F.",
    needIssue: false,
    needExpiry: false,
    f: [T("name", "Name on card"), T("father", "Father's name"), D("dob", "Date of birth")]
  },
  "Passport": {
    n: "Passport number",
    needIssue: true,
    needExpiry: true,
    f: [T("name", "Name on passport"), T("nat", "Nationality"), D("dob", "Date of birth"), T("place", "Place of issue"), T("file", "File number")]
  },
  "Voter ID": {
    n: "EPIC number",
    needIssue: false,
    needExpiry: false,
    f: [T("name", "Name on card"), T("father", "Father / husband name"), T("ac", "Assembly constituency"), T("part", "Part / serial no.")]
  },
  "Vehicle RC": {
    n: "Registration number",
    needIssue: true,
    needExpiry: true,
    f: [T("owner", "Owner name"), T("model", "Make / model"), SL("fuel", "Fuel type", ["Petrol", "Diesel", "CNG", "Electric", "Other"]), T("chassis", "Chassis number"), T("engine", "Engine number"), D("regdate", "Registration date"), T("rto", "Registering RTO")]
  },
  "Insurance": {
    n: "Policy number",
    needIssue: true,
    needExpiry: true,
    f: [T("insurer", "Insurance company"), SL("ptype", "Policy type", ["Life", "Health", "Vehicle", "Property", "Business", "Other"]), T("holder", "Policyholder name"), T("sum", "Sum assured / IDV (₹)"), T("premium", "Premium amount (₹)"), SL("freq", "Premium frequency", ["Monthly", "Quarterly", "Half-yearly", "Yearly", "Single"]), T("nominee", "Nominee"), T("asset", "Vehicle / asset covered")]
  },
  "Bank Document": {
    n: "Account number",
    needIssue: false,
    needExpiry: false,
    f: [T("bank", "Bank name"), T("ifsc", "IFSC code", { up: 1, pat: /^[A-Z]{4}0[A-Z0-9]{6}$/, pm: "IFSC must be 11 characters, like SBIN0001234." }), T("branch", "Branch name"), T("holder", "Account holder name"), SL("atype", "Account type", ["Savings", "Current", "Fixed deposit", "Recurring deposit", "Loan", "Other"]), T("micr", "MICR code"), SL("kind", "Document kind", ["Passbook", "Statement", "Cancelled cheque", "Loan sanction letter", "FD receipt", "Other"]), TA("baddr", "Branch address")]
  },
  "Agreement / Contract": {
    n: "Agreement number",
    needIssue: true,
    needExpiry: true,
    f: [SL("atype", "Agreement type", ["Rent / lease", "Sale deed", "Loan", "Service", "Partnership", "Other"]), T("pa", "First party"), T("pb", "Second party"), T("amount", "Amount / value (₹)"), T("term", "Duration / term"), T("stamp", "Stamp duty / registration no.")]
  },
  "Tax / GST": {
    n: "GSTIN / registration number",
    needIssue: false,
    needExpiry: false,
    f: [SL("ttype", "Tax type", ["GST", "Income tax", "TDS", "Professional tax", "Other"]), T("pan", "PAN"), T("fy", "Financial year / period"), T("ret", "Return / form type"), T("ack", "Acknowledgement no."), T("amount", "Tax payable / paid (₹)")]
  },
  "Other": {
    n: "Document number",
    needIssue: true,
    needExpiry: true,
    f: [T("title", "Title / description"), TA("notes", "Details")]
  }
};

export const PERSONAL = [
  "Driving Licence", "Aadhaar Card", "PAN Card", "Passport", "Voter ID",
  "Vehicle RC", "Property Document", "Insurance", "Bank Document",
  "Agreement / Contract", "Tax / GST", "Other"
];

// GSTIN / PAN / CIN regex and client-type schemas
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

const GS = T("gstin", "GSTIN", { up: 1, pat: GSTIN_RE, pm: "GSTIN must be 15 characters, like 22AAAAA0000A1Z5." });
const PN = T("pan", "PAN", { up: 1, pat: PAN_RE, pm: "PAN must look like ABCDE1234F." });

export const CLIENT_TYPES = {
  Individual: { nl: "Full name", f: [] },
  Firm: {
    nl: "Firm name",
    f: [GS, PN, SL("ftype", "Firm type", ["Proprietorship", "Partnership", "LLP", "HUF", "Other"]), T("owner", "Proprietor / partners"), T("udyam", "Udyam number"), T("reg", "Registration no.")]
  },
  Company: {
    nl: "Company name",
    f: [T("cin", "CIN", { up: 1, pat: CIN_RE, pm: "CIN must be 21 characters, like U12345CT2020PTC012345." }), GS, PN, T("tan", "TAN", { up: 1 }), T("dir", "Directors / authorised signatory"), T("roc", "Registered with (ROC)"), D("inc", "Date of incorporation"), TA("regoff", "Registered office")]
  },
  Plant: {
    nl: "Plant / unit name",
    f: [T("parent", "Parent company / firm"), GS, PN, T("lic", "Factory / plant licence no."), SL("ind", "Industry", ["Coal & mining", "Manufacturing", "Power", "Steel", "Cement", "Other"]), T("manager", "Plant head / contact person"), TA("loc", "Plant location")]
  }
};

export const CLIENT_TYPE_OPTIONS = [
  { value: "Individual", label: "Individual" },
  { value: "Firm", label: "Firm" },
  { value: "Company", label: "Company" },
  { value: "Plant", label: "Plant / Unit" }
];
