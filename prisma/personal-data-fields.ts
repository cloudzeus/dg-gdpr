// Curated seed data for the PersonalDataField library.
// Each entry carries EL/EN translations + GDPR documentation (suggested legal basis
// per Art. 6, and special-category flag per Art. 9 / Art. 10).
// Hand-authored so the seed is deterministic (no runtime DeepSeek dependency);
// the in-app "Suggest legal basis" / "Translate" buttons remain for new fields.

export type SeedCategory = "IDENTITY" | "CONTACT" | "FINANCIAL" | "HEALTH" | "ONLINE" | "OTHER";
export type SeedInputType = "TEXT" | "EMAIL" | "PHONE" | "DATE" | "NUMBER" | "TEXTAREA";
export type SeedBasis =
  | "CONSENT"
  | "CONTRACT"
  | "LEGAL_OBLIGATION"
  | "VITAL_INTEREST"
  | "PUBLIC_TASK"
  | "LEGITIMATE_INTEREST";

export interface SeedField {
  key: string;
  labelEl: string;
  labelEn: string;
  descEl: string;
  descEn: string;
  category: SeedCategory;
  inputType: SeedInputType;
  isSpecialCategory?: boolean;
  legalBasis: Array<{ basis: SeedBasis; el: string; en: string }>;
}

export const PERSONAL_DATA_FIELDS: SeedField[] = [
  // ── Ταυτότητα / Identity ───────────────────────────────────────────────
  {
    key: "full_name",
    labelEl: "Ονοματεπώνυμο", labelEn: "Full name",
    descEl: "Το πλήρες όνομα (όνομα και επώνυμο) του φυσικού προσώπου.",
    descEn: "The data subject's full name (first and last name).",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [
      { basis: "CONTRACT", el: "Απαραίτητο για τη σύναψη/εκτέλεση σύμβασης με το υποκείμενο (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to enter into or perform a contract with the data subject (Art. 6(1)(b))." },
      { basis: "CONSENT", el: "Όταν δεν υπάρχει σύμβαση, η επεξεργασία βασίζεται στη συγκατάθεση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Where no contract applies, processing relies on consent (Art. 6(1)(a))." },
    ],
  },
  {
    key: "first_name",
    labelEl: "Όνομα", labelEn: "First name",
    descEl: "Το κύριο όνομα του φυσικού προσώπου.",
    descEn: "The data subject's given (first) name.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητο για την ταυτοποίηση στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Needed for identification within a contractual relationship (Art. 6(1)(b))." }],
  },
  {
    key: "last_name",
    labelEl: "Επώνυμο", labelEn: "Last name",
    descEl: "Το οικογενειακό όνομα του φυσικού προσώπου.",
    descEn: "The data subject's family (last) name.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητο για την ταυτοποίηση στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Needed for identification within a contractual relationship (Art. 6(1)(b))." }],
  },
  {
    key: "father_name",
    labelEl: "Πατρώνυμο", labelEn: "Father's name",
    descEl: "Το όνομα του πατέρα, που συχνά απαιτείται για επίσημη ταυτοποίηση στην Ελλάδα.",
    descEn: "The father's name, often required for official identification in Greece.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Συχνά απαιτείται από φορολογική/ασφαλιστική νομοθεσία (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Often required by tax/social-security law (Art. 6(1)(c))." }],
  },
  {
    key: "mother_name",
    labelEl: "Μητρώνυμο", labelEn: "Mother's name",
    descEl: "Το όνομα της μητέρας, που χρησιμοποιείται για επίσημη ταυτοποίηση.",
    descEn: "The mother's name, used for official identification.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Συχνά απαιτείται από φορολογική/ασφαλιστική νομοθεσία (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Often required by tax/social-security law (Art. 6(1)(c))." }],
  },
  {
    key: "date_of_birth",
    labelEl: "Ημερομηνία γέννησης", labelEn: "Date of birth",
    descEl: "Η ημερομηνία γέννησης του φυσικού προσώπου.",
    descEn: "The data subject's date of birth.",
    category: "IDENTITY", inputType: "DATE",
    legalBasis: [
      { basis: "LEGAL_OBLIGATION", el: "Απαιτείται για επαλήθευση ηλικίας ή φορολογικές/ασφαλιστικές υποχρεώσεις (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for age verification or tax/social-security obligations (Art. 6(1)(c))." },
      { basis: "CONTRACT", el: "Απαραίτητη όταν η ηλικία αποτελεί προϋπόθεση της σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary where age is a precondition of the contract (Art. 6(1)(b))." },
    ],
  },
  {
    key: "place_of_birth",
    labelEl: "Τόπος γέννησης", labelEn: "Place of birth",
    descEl: "Ο τόπος (πόλη/χώρα) γέννησης του φυσικού προσώπου.",
    descEn: "The data subject's place (city/country) of birth.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για ορισμένα επίσημα έγγραφα ταυτοποίησης (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for certain official identification documents (Art. 6(1)(c))." }],
  },
  {
    key: "gender",
    labelEl: "Φύλο", labelEn: "Gender",
    descEl: "Το φύλο όπως δηλώνεται από το υποκείμενο των δεδομένων.",
    descEn: "Gender as declared by the data subject.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "CONSENT", el: "Συλλέγεται κατόπιν συγκατάθεσης, εκτός αν υπάρχει νόμιμη υποχρέωση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Collected with consent unless a legal obligation applies (Art. 6(1)(a))." }],
  },
  {
    key: "nationality",
    labelEl: "Υπηκοότητα", labelEn: "Nationality",
    descEl: "Η υπηκοότητα/ιθαγένεια του φυσικού προσώπου.",
    descEn: "The data subject's nationality/citizenship.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για συμμόρφωση με μεταναστευτική/εργατική νομοθεσία (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required to comply with immigration/employment law (Art. 6(1)(c))." }],
  },
  {
    key: "id_card_number",
    labelEl: "Αριθμός Δελτίου Ταυτότητας (ΑΔΤ)", labelEn: "National ID card number",
    descEl: "Ο αριθμός του δελτίου αστυνομικής ταυτότητας.",
    descEn: "The national identity card number.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για ταυτοποίηση βάσει νόμου (π.χ. AML, φορολογικά) (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for legally mandated identification (e.g. AML, tax) (Art. 6(1)(c))." }],
  },
  {
    key: "passport_number",
    labelEl: "Αριθμός διαβατηρίου", labelEn: "Passport number",
    descEl: "Ο αριθμός διαβατηρίου του φυσικού προσώπου.",
    descEn: "The data subject's passport number.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για διασυνοριακή ταυτοποίηση ή νομικές υποχρεώσεις (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for cross-border identification or legal obligations (Art. 6(1)(c))." }],
  },
  {
    key: "amka",
    labelEl: "ΑΜΚΑ", labelEn: "Social Security Number (AMKA)",
    descEl: "Ο Αριθμός Μητρώου Κοινωνικής Ασφάλισης.",
    descEn: "The Greek social-security registration number (AMKA).",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για ασφαλιστικές/εργατικές υποχρεώσεις (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for social-security/employment obligations (Art. 6(1)(c))." }],
  },
  {
    key: "driving_license",
    labelEl: "Αριθμός άδειας οδήγησης", labelEn: "Driving licence number",
    descEl: "Ο αριθμός της άδειας οδήγησης.",
    descEn: "The driving licence number.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητο όταν η οδήγηση αφορά την παροχή υπηρεσίας (π.χ. ενοικίαση οχήματος) (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary where driving is part of the service (e.g. car rental) (Art. 6(1)(b))." }],
  },
  {
    key: "signature",
    labelEl: "Υπογραφή", labelEn: "Signature",
    descEl: "Η ιδιόχειρη ή ηλεκτρονική υπογραφή του υποκειμένου.",
    descEn: "The data subject's handwritten or electronic signature.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητη για την επικύρωση συμβατικών εγγράφων (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to validate contractual documents (Art. 6(1)(b))." }],
  },
  {
    key: "photo",
    labelEl: "Φωτογραφία", labelEn: "Photograph",
    descEl: "Φωτογραφία προσώπου που δεν χρησιμοποιείται για βιομετρική ταυτοποίηση.",
    descEn: "A facial photograph not used for biometric identification.",
    category: "IDENTITY", inputType: "TEXT",
    legalBasis: [{ basis: "CONSENT", el: "Συλλέγεται κατόπιν ρητής συγκατάθεσης του υποκειμένου (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Collected with the data subject's explicit consent (Art. 6(1)(a))." }],
  },

  // ── Επικοινωνία / Contact ──────────────────────────────────────────────
  {
    key: "email",
    labelEl: "Email", labelEn: "Email",
    descEl: "Διεύθυνση ηλεκτρονικού ταχυδρομείου επικοινωνίας.",
    descEn: "Contact email address.",
    category: "CONTACT", inputType: "EMAIL",
    legalBasis: [
      { basis: "CONTRACT", el: "Απαραίτητο για επικοινωνία στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for communication within a contract (Art. 6(1)(b))." },
      { basis: "CONSENT", el: "Για ενημερωτικά/marketing απαιτείται συγκατάθεση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Newsletters/marketing require consent (Art. 6(1)(a))." },
    ],
  },
  {
    key: "phone",
    labelEl: "Σταθερό τηλέφωνο", labelEn: "Landline phone",
    descEl: "Αριθμός σταθερού τηλεφώνου επικοινωνίας.",
    descEn: "Landline contact phone number.",
    category: "CONTACT", inputType: "PHONE",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητο για επικοινωνία στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for communication within a contract (Art. 6(1)(b))." }],
  },
  {
    key: "mobile",
    labelEl: "Κινητό τηλέφωνο", labelEn: "Mobile phone",
    descEl: "Αριθμός κινητού τηλεφώνου επικοινωνίας.",
    descEn: "Mobile contact phone number.",
    category: "CONTACT", inputType: "PHONE",
    legalBasis: [
      { basis: "CONTRACT", el: "Απαραίτητο για επικοινωνία στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for communication within a contract (Art. 6(1)(b))." },
      { basis: "CONSENT", el: "Για ειδοποιήσεις SMS/marketing απαιτείται συγκατάθεση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "SMS notifications/marketing require consent (Art. 6(1)(a))." },
    ],
  },
  {
    key: "address",
    labelEl: "Διεύθυνση", labelEn: "Address",
    descEl: "Ταχυδρομική διεύθυνση κατοικίας ή επικοινωνίας.",
    descEn: "Residential or contact postal address.",
    category: "CONTACT", inputType: "TEXTAREA",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητη για παράδοση/τιμολόγηση στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for delivery/billing within a contract (Art. 6(1)(b))." }],
  },
  {
    key: "postal_code",
    labelEl: "Ταχυδρομικός κώδικας", labelEn: "Postal code",
    descEl: "Ο ταχυδρομικός κώδικας της διεύθυνσης.",
    descEn: "The postal code of the address.",
    category: "CONTACT", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητος για παράδοση/τιμολόγηση (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for delivery/billing (Art. 6(1)(b))." }],
  },
  {
    key: "city",
    labelEl: "Πόλη", labelEn: "City",
    descEl: "Η πόλη της διεύθυνσης κατοικίας ή επικοινωνίας.",
    descEn: "The city of the residential or contact address.",
    category: "CONTACT", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητη για παράδοση/τιμολόγηση (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for delivery/billing (Art. 6(1)(b))." }],
  },
  {
    key: "country",
    labelEl: "Χώρα", labelEn: "Country",
    descEl: "Η χώρα της διεύθυνσης ή υπηκοότητας επικοινωνίας.",
    descEn: "The country of the address or contact.",
    category: "CONTACT", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητη για παράδοση και προσδιορισμό εφαρμοστέου δικαίου (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary for delivery and determining applicable law (Art. 6(1)(b))." }],
  },

  // ── Οικονομικά / Financial ─────────────────────────────────────────────
  {
    key: "afm",
    labelEl: "ΑΦΜ", labelEn: "Tax ID (AFM)",
    descEl: "Αριθμός Φορολογικού Μητρώου του υποκειμένου.",
    descEn: "The data subject's tax registration number (AFM).",
    category: "FINANCIAL", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για τιμολόγηση και φορολογική συμμόρφωση (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for invoicing and tax compliance (Art. 6(1)(c))." }],
  },
  {
    key: "doy",
    labelEl: "ΔΟΥ", labelEn: "Tax office (DOY)",
    descEl: "Η αρμόδια Δημόσια Οικονομική Υπηρεσία του υποκειμένου.",
    descEn: "The data subject's competent tax office.",
    category: "FINANCIAL", inputType: "TEXT",
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Απαιτείται για έκδοση παραστατικών (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Required for issuing tax documents (Art. 6(1)(c))." }],
  },
  {
    key: "iban",
    labelEl: "IBAN τραπεζικού λογαριασμού", labelEn: "Bank account (IBAN)",
    descEl: "Ο διεθνής αριθμός τραπεζικού λογαριασμού για πληρωμές/επιστροφές.",
    descEn: "International bank account number for payments/refunds.",
    category: "FINANCIAL", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητο για εκτέλεση πληρωμών στο πλαίσιο σύμβασης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to process payments within a contract (Art. 6(1)(b))." }],
  },
  {
    key: "payment_card",
    labelEl: "Αριθμός κάρτας πληρωμής", labelEn: "Payment card number",
    descEl: "Στοιχεία κάρτας πληρωμής (να αποθηκεύεται μόνο tokenized, κατά PCI-DSS).",
    descEn: "Payment card details (store only tokenized, per PCI-DSS).",
    category: "FINANCIAL", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητος για την εκτέλεση συναλλαγής (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to execute the transaction (Art. 6(1)(b))." }],
  },
  {
    key: "income",
    labelEl: "Εισόδημα", labelEn: "Income",
    descEl: "Το δηλωθέν εισόδημα του υποκειμένου (π.χ. για αξιολόγηση πιστοληπτικής ικανότητας).",
    descEn: "The data subject's declared income (e.g. for creditworthiness checks).",
    category: "FINANCIAL", inputType: "NUMBER",
    legalBasis: [
      { basis: "CONSENT", el: "Συλλέγεται κατόπιν συγκατάθεσης για αξιολόγηση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Collected with consent for assessment (Art. 6(1)(a))." },
      { basis: "LEGAL_OBLIGATION", el: "Όταν απαιτείται από νομοθεσία κατά της νομιμοποίησης εσόδων (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "Where required by anti-money-laundering law (Art. 6(1)(c))." },
    ],
  },

  // ── Διαδικτυακά αναγνωριστικά / Online ──────────────────────────────────
  {
    key: "ip_address",
    labelEl: "Διεύθυνση IP", labelEn: "IP address",
    descEl: "Η διεύθυνση IP από την οποία συνδέεται ο χρήστης.",
    descEn: "The IP address from which the user connects.",
    category: "ONLINE", inputType: "TEXT",
    legalBasis: [{ basis: "LEGITIMATE_INTEREST", el: "Για ασφάλεια συστημάτων και πρόληψη απάτης (Άρθρο 6 παρ. 1 στοιχ. στ).", en: "For system security and fraud prevention (Art. 6(1)(f))." }],
  },
  {
    key: "username",
    labelEl: "Όνομα χρήστη", labelEn: "Username",
    descEl: "Το αναγνωριστικό λογαριασμού του χρήστη στην υπηρεσία.",
    descEn: "The user's account identifier on the service.",
    category: "ONLINE", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητο για την παροχή του λογαριασμού/υπηρεσίας (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to provide the account/service (Art. 6(1)(b))." }],
  },
  {
    key: "cookies_id",
    labelEl: "Αναγνωριστικό cookie", labelEn: "Cookie identifier",
    descEl: "Αναγνωριστικό που αποθηκεύεται σε cookie για παρακολούθηση/προτιμήσεις.",
    descEn: "An identifier stored in a cookie for tracking/preferences.",
    category: "ONLINE", inputType: "TEXT",
    legalBasis: [{ basis: "CONSENT", el: "Για μη απαραίτητα cookies απαιτείται συγκατάθεση (Άρθρο 6 παρ. 1 στοιχ. α & ePrivacy).", en: "Non-essential cookies require consent (Art. 6(1)(a) & ePrivacy)." }],
  },
  {
    key: "device_id",
    labelEl: "Αναγνωριστικό συσκευής", labelEn: "Device identifier",
    descEl: "Μοναδικό αναγνωριστικό συσκευής (π.χ. mobile advertising ID).",
    descEn: "A unique device identifier (e.g. mobile advertising ID).",
    category: "ONLINE", inputType: "TEXT",
    legalBasis: [{ basis: "CONSENT", el: "Η παρακολούθηση συσκευής απαιτεί συγκατάθεση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Device tracking requires consent (Art. 6(1)(a))." }],
  },
  {
    key: "location_data",
    labelEl: "Δεδομένα γεωγραφικής θέσης", labelEn: "Geolocation data",
    descEl: "Δεδομένα ακριβούς ή κατά προσέγγιση γεωγραφικής θέσης του χρήστη.",
    descEn: "Precise or approximate geolocation data of the user.",
    category: "ONLINE", inputType: "TEXT",
    legalBasis: [{ basis: "CONSENT", el: "Η επεξεργασία τοποθεσίας απαιτεί ρητή συγκατάθεση (Άρθρο 6 παρ. 1 στοιχ. α).", en: "Location processing requires explicit consent (Art. 6(1)(a))." }],
  },

  // ── Εργασιακά / Employment (OTHER) ──────────────────────────────────────
  {
    key: "job_title",
    labelEl: "Θέση εργασίας", labelEn: "Job title",
    descEl: "Ο τίτλος της θέσης εργασίας του υποκειμένου.",
    descEn: "The data subject's job title.",
    category: "OTHER", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητη στο πλαίσιο εργασιακής σχέσης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary within the employment relationship (Art. 6(1)(b))." }],
  },
  {
    key: "employer",
    labelEl: "Εργοδότης", labelEn: "Employer",
    descEl: "Η επωνυμία του εργοδότη του υποκειμένου.",
    descEn: "The name of the data subject's employer.",
    category: "OTHER", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητος για επαλήθευση επαγγελματικής ιδιότητας (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to verify professional capacity (Art. 6(1)(b))." }],
  },
  {
    key: "employee_id",
    labelEl: "Αριθμός μητρώου εργαζομένου", labelEn: "Employee number",
    descEl: "Ο εσωτερικός αριθμός μητρώου του εργαζομένου.",
    descEn: "The internal employee registration number.",
    category: "OTHER", inputType: "TEXT",
    legalBasis: [{ basis: "CONTRACT", el: "Απαραίτητος για τη διαχείριση της εργασιακής σχέσης (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to manage the employment relationship (Art. 6(1)(b))." }],
  },
  {
    key: "salary",
    labelEl: "Μισθός", labelEn: "Salary",
    descEl: "Οι αποδοχές του εργαζομένου.",
    descEn: "The employee's remuneration.",
    category: "OTHER", inputType: "NUMBER",
    legalBasis: [
      { basis: "CONTRACT", el: "Απαραίτητος για την εκτέλεση της σύμβασης εργασίας (Άρθρο 6 παρ. 1 στοιχ. β).", en: "Necessary to perform the employment contract (Art. 6(1)(b))." },
      { basis: "LEGAL_OBLIGATION", el: "Για μισθοδοσία και ασφαλιστικές εισφορές (Άρθρο 6 παρ. 1 στοιχ. γ).", en: "For payroll and social-security contributions (Art. 6(1)(c))." },
    ],
  },

  // ── Ειδικές κατηγορίες / Special categories (Άρθρο 9) ───────────────────
  {
    key: "health_data",
    labelEl: "Δεδομένα υγείας", labelEn: "Health data",
    descEl: "Δεδομένα που αφορούν τη σωματική ή ψυχική υγεία (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data concerning physical or mental health (special category, Art. 9).",
    category: "HEALTH", inputType: "TEXTAREA", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση κατά το Άρθρο 9 παρ. 2 στοιχ. α.", en: "Requires explicit consent under Art. 9(2)(a)." }],
  },
  {
    key: "disability",
    labelEl: "Αναπηρία", labelEn: "Disability",
    descEl: "Πληροφορίες σχετικά με αναπηρία (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Information about a disability (special category, Art. 9).",
    category: "HEALTH", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [
      { basis: "CONSENT", el: "Ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Explicit consent (Art. 9(2)(a))." },
      { basis: "LEGAL_OBLIGATION", el: "Όταν επιβάλλεται από εργατικό/ασφαλιστικό δίκαιο (Άρθρο 9 παρ. 2 στοιχ. β).", en: "Where mandated by employment/social-security law (Art. 9(2)(b))." },
    ],
  },
  {
    key: "biometric_data",
    labelEl: "Βιομετρικά δεδομένα", labelEn: "Biometric data",
    descEl: "Βιομετρικά δεδομένα για μοναδική ταυτοποίηση (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Biometric data for unique identification (special category, Art. 9).",
    category: "HEALTH", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "genetic_data",
    labelEl: "Γενετικά δεδομένα", labelEn: "Genetic data",
    descEl: "Δεδομένα κληρονομικών ή επίκτητων γενετικών χαρακτηριστικών (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data on inherited or acquired genetic characteristics (special category, Art. 9).",
    category: "HEALTH", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "racial_ethnic_origin",
    labelEl: "Φυλετική ή εθνοτική καταγωγή", labelEn: "Racial or ethnic origin",
    descEl: "Δεδομένα φυλετικής ή εθνοτικής καταγωγής (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data on racial or ethnic origin (special category, Art. 9).",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "religious_beliefs",
    labelEl: "Θρησκευτικές πεποιθήσεις", labelEn: "Religious beliefs",
    descEl: "Δεδομένα θρησκευτικών ή φιλοσοφικών πεποιθήσεων (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data on religious or philosophical beliefs (special category, Art. 9).",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "political_opinions",
    labelEl: "Πολιτικές απόψεις", labelEn: "Political opinions",
    descEl: "Δεδομένα πολιτικών φρονημάτων (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data on political opinions (special category, Art. 9).",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "trade_union",
    labelEl: "Συμμετοχή σε συνδικαλιστική οργάνωση", labelEn: "Trade union membership",
    descEl: "Δεδομένα συμμετοχής σε συνδικάτο (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data on trade-union membership (special category, Art. 9).",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "sexual_orientation",
    labelEl: "Σεξουαλικός προσανατολισμός", labelEn: "Sexual orientation",
    descEl: "Δεδομένα σχετικά με τη σεξουαλική ζωή ή τον σεξουαλικό προσανατολισμό (ειδική κατηγορία, Άρθρο 9).",
    descEn: "Data concerning sex life or sexual orientation (special category, Art. 9).",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "CONSENT", el: "Απαιτείται ρητή συγκατάθεση (Άρθρο 9 παρ. 2 στοιχ. α).", en: "Requires explicit consent (Art. 9(2)(a))." }],
  },
  {
    key: "criminal_record",
    labelEl: "Ποινικό μητρώο", labelEn: "Criminal record",
    descEl: "Δεδομένα ποινικών καταδικών και αδικημάτων (Άρθρο 10 — αυξημένη προστασία).",
    descEn: "Data on criminal convictions and offences (Art. 10 — heightened protection).",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: true,
    legalBasis: [{ basis: "LEGAL_OBLIGATION", el: "Επιτρέπεται μόνο υπό τον έλεγχο επίσημης αρχής ή όταν προβλέπεται από τον νόμο (Άρθρο 10).", en: "Permitted only under control of official authority or where authorised by law (Art. 10)." }],
  },
];
