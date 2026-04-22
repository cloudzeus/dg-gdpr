export type AnswerValue = "yes" | "partial" | "no" | null;

export interface AssessmentQuestion {
  id: string;
  text: string;
  weight: 1 | 2 | 3; // 1=standard, 2=important, 3=critical
  article: string;
  hint?: string;
  actionIfNo: string;   // Τι πρέπει να γίνει αν "Όχι"
  actionIfPartial: string; // Τι πρέπει να γίνει αν "Μερικώς"
  priority: "low" | "medium" | "high" | "critical";
}

export interface AssessmentCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  articles: string[];
  questions: AssessmentQuestion[];
}

export const ASSESSMENT_CATEGORIES: AssessmentCategory[] = [
  {
    id: "general_principles",
    title: "Γενικές Αρχές GDPR",
    description: "Συμμόρφωση με τις 6 βασικές αρχές επεξεργασίας δεδομένων",
    icon: "Scale",
    articles: ["5", "5(2)"],
    questions: [
      {
        id: "gp_01",
        text: "Υπάρχει καταγεγραμμένο Αρχείο Δραστηριοτήτων Επεξεργασίας (RoPA - Άρθρο 30);",
        weight: 3,
        article: "30",
        hint: "Το RoPA πρέπει να περιλαμβάνει: σκοπό, κατηγορίες δεδομένων, αποδέκτες, χρόνους διατήρησης",
        actionIfNo: "Δημιουργήστε άμεσα το RoPA. Χρησιμοποιήστε τη Χαρτογράφηση Δεδομένων για να αποτυπώσετε όλες τις ροές.",
        actionIfPartial: "Συμπληρώστε το RoPA με τους σκοπούς επεξεργασίας και τους χρόνους διατήρησης που λείπουν.",
        priority: "critical",
      },
      {
        id: "gp_02",
        text: "Εφαρμόζεται η αρχή ελαχιστοποίησης δεδομένων (συλλέγετε μόνο τα απαραίτητα);",
        weight: 2,
        article: "5(1)(c)",
        actionIfNo: "Ελέγξτε κάθε φόρμα/σύστημα και αφαιρέστε πεδία που δεν είναι απαραίτητα για τον σκοπό επεξεργασίας.",
        actionIfPartial: "Τεκμηριώστε για κάθε πεδίο/δεδομένο γιατί είναι απαραίτητο.",
        priority: "high",
      },
      {
        id: "gp_03",
        text: "Υπάρχουν καθορισμένες πολιτικές διατήρησης δεδομένων (πόσο καιρό κρατάτε τι);",
        weight: 2,
        article: "5(1)(e)",
        actionIfNo: "Καθορίστε χρόνους διατήρησης για κάθε κατηγορία δεδομένων. Υλοποιήστε αυτοματισμό διαγραφής.",
        actionIfPartial: "Ορίστε χρόνους για τις κατηγορίες που λείπουν και τεκμηριώστε τη νομική βάση κάθε περιόδου.",
        priority: "high",
      },
      {
        id: "gp_04",
        text: "Τα δεδομένα είναι ακριβή και ενημερωμένα (υπάρχει διαδικασία διόρθωσης);",
        weight: 1,
        article: "5(1)(d)",
        actionIfNo: "Θεσπίστε διαδικασία τακτικής επαλήθευσης ακρίβειας και αναφοράς ανακρίβειας από τα υποκείμενα.",
        actionIfPartial: "Βελτιώστε τη διαδικασία ώστε τα υποκείμενα να μπορούν εύκολα να διορθώσουν τα δεδομένα τους.",
        priority: "medium",
      },
      {
        id: "gp_05",
        text: "Υπάρχει τεκμηριωμένη πολιτική λογοδοσίας (accountability policy);",
        weight: 2,
        article: "5(2)",
        actionIfNo: "Συντάξτε πολιτική λογοδοσίας που περιγράφει ρόλους, αρμοδιότητες και μέτρα συμμόρφωσης.",
        actionIfPartial: "Εξειδικεύστε ρόλους και αρμοδιότητες για κάθε δραστηριότητα επεξεργασίας.",
        priority: "high",
      },
      {
        id: "gp_06",
        text: "Γνωρίζουν όλοι οι εργαζόμενοι τις υποχρεώσεις τους για προστασία δεδομένων;",
        weight: 2,
        article: "5(2)",
        actionIfNo: "Οργανώστε υποχρεωτική εκπαίδευση GDPR για όλο το προσωπικό. Χρησιμοποιήστε τη Compliance Academy.",
        actionIfPartial: "Βεβαιωθείτε ότι όλο το νέο προσωπικό εκπαιδεύεται κατά την πρόσληψη.",
        priority: "high",
      },
    ],
  },
  {
    id: "legal_basis",
    title: "Νομική Βάση Επεξεργασίας",
    description: "Ύπαρξη και τεκμηρίωση νόμιμης βάσης για κάθε επεξεργασία",
    icon: "FileCheck",
    articles: ["6", "7", "9"],
    questions: [
      {
        id: "lb_01",
        text: "Κάθε επεξεργασία δεδομένων βασίζεται σε μία από τις 6 νόμιμες βάσεις του Άρθρου 6;",
        weight: 3,
        article: "6",
        actionIfNo: "Αξιολογήστε κάθε επεξεργασία και καθορίστε νομική βάση. Χωρίς νομική βάση η επεξεργασία είναι παράνομη.",
        actionIfPartial: "Ολοκληρώστε την καταγραφή νομικής βάσης για όλες τις επεξεργασίες που δεν έχουν τεκμηριωθεί.",
        priority: "critical",
      },
      {
        id: "lb_02",
        text: "Όταν βασίζεστε στη συγκατάθεση, είναι ελεύθερη, συγκεκριμένη, ρητή και αποδεδειγμένη;",
        weight: 3,
        article: "7",
        actionIfNo: "Ελέγξτε όλες τις φόρμες συγκατάθεσης. Αφαιρέστε προεπιλεγμένα checkbox. Προσθέστε granular επιλογές.",
        actionIfPartial: "Βεβαιωθείτε ότι κρατάτε αρχείο κάθε συγκατάθεσης (ποιος, πότε, για τι).",
        priority: "critical",
      },
      {
        id: "lb_03",
        text: "Επεξεργάζεστε ειδικές κατηγορίες δεδομένων (υγεία, θρησκεία, βιομετρικά κ.λπ.);",
        weight: 3,
        article: "9",
        hint: "Αν ΝΑΙ, χρειάζεστε βάση από το Άρθρο 9(2) και DPIA",
        actionIfNo: "Δεν απαιτείται ενέργεια αν δεν επεξεργάζεστε τέτοια δεδομένα.",
        actionIfPartial: "Βεβαιωθείτε ότι υπάρχει βάση Άρθρου 9(2), DPA με εκτελεστές και DPIA.",
        priority: "critical",
      },
      {
        id: "lb_04",
        text: "Οι Πολιτικές Απορρήτου (Privacy Notices) ενημερώνουν για τη νομική βάση επεξεργασίας;",
        weight: 2,
        article: "13",
        actionIfNo: "Ενημερώστε τις Privacy Notices ώστε να αναφέρουν για κάθε σκοπό: νομική βάση, χρόνο διατήρησης, δικαιώματα.",
        actionIfPartial: "Προσθέστε τις πληροφορίες που λείπουν (νομική βάση ή χρόνος διατήρησης).",
        priority: "high",
      },
      {
        id: "lb_05",
        text: "Αν χρησιμοποιείτε 'έννομο συμφέρον', έχει γίνει Legitimate Interest Assessment (LIA);",
        weight: 2,
        article: "6(1)(f)",
        actionIfNo: "Εκτελέστε LIA για κάθε επεξεργασία που βασίζεται σε έννομο συμφέρον. Τεκμηριώστε την ισορροπία.",
        actionIfPartial: "Ολοκληρώστε το LIA για τις εκκρεμείς επεξεργασίες.",
        priority: "high",
      },
    ],
  },
  {
    id: "data_subject_rights",
    title: "Δικαιώματα Υποκειμένων",
    description: "Εκπλήρωση δικαιωμάτων πρόσβασης, διόρθωσης, διαγραφής κ.λπ.",
    icon: "Users",
    articles: ["12", "13", "14", "15", "16", "17", "18", "20", "21", "22"],
    questions: [
      {
        id: "dsr_01",
        text: "Υπάρχει τεκμηριωμένη διαδικασία για αιτήματα πρόσβασης (SAR - Subject Access Request);",
        weight: 3,
        article: "15",
        actionIfNo: "Δημιουργήστε SOP για αιτήματα πρόσβασης: λήψη, επαλήθευση ταυτότητας, απάντηση εντός 30 ημερών.",
        actionIfPartial: "Βελτιστοποιήστε τη διαδικασία ώστε να τηρείται η προθεσμία των 30 ημερών.",
        priority: "critical",
      },
      {
        id: "dsr_02",
        text: "Μπορείτε να ανταποκριθείτε σε αίτημα διαγραφής ('δικαίωμα λήθης') εντός 30 ημερών;",
        weight: 3,
        article: "17",
        actionIfNo: "Αναπτύξτε τεχνική λύση για ολοκληρωτική διαγραφή από όλα τα συστήματα (συμπ. backups μετά λήξη).",
        actionIfPartial: "Τεκμηριώστε τεχνικούς περιορισμούς (π.χ. backups) και εφαρμόστε ψευδωνυμοποίηση όπου δεν μπορεί πλήρης διαγραφή.",
        priority: "critical",
      },
      {
        id: "dsr_03",
        text: "Παρέχεται δικαίωμα φορητότητας δεδομένων σε machine-readable μορφή (JSON/CSV);",
        weight: 2,
        article: "20",
        actionIfNo: "Υλοποιήστε εξαγωγή δεδομένων σε δομημένη μορφή (JSON ή CSV) για κάθε χρήστη.",
        actionIfPartial: "Βελτιώστε το format εξαγωγής ώστε να είναι πλήρες και machine-readable.",
        priority: "medium",
      },
      {
        id: "dsr_04",
        text: "Υπάρχει διαδικασία εξέτασης αντιρρήσεων (Άρθρο 21) εντός εύλογου χρόνου;",
        weight: 2,
        article: "21",
        actionIfNo: "Ορίστε SOP για αντιρρήσεις επεξεργασίας. Καθορίστε ποιος αποφασίζει και εντός ποιας προθεσμίας.",
        actionIfPartial: "Βελτιώστε ώστε η αντίρρηση να εξετάζεται ουσιαστικά (όχι αυτόματη άρνηση).",
        priority: "high",
      },
      {
        id: "dsr_05",
        text: "Τα υποκείμενα ενημερώνονται για τα δικαιώματά τους κατά τη συλλογή δεδομένων;",
        weight: 2,
        article: "13",
        actionIfNo: "Προσθέστε σε κάθε σημείο συλλογής δεδομένων ενημέρωση για τα δικαιώματα (πρόσβαση, διόρθωση, διαγραφή, αντίρρηση).",
        actionIfPartial: "Βεβαιωθείτε ότι η ενημέρωση είναι κατανοητή, σύντομη και προσβάσιμη.",
        priority: "high",
      },
      {
        id: "dsr_06",
        text: "Τηρείται αρχείο αιτημάτων υποκειμένων (ημερομηνία, είδος, απάντηση);",
        weight: 2,
        article: "12(5)",
        actionIfNo: "Δημιουργήστε register αιτημάτων για να αποδεικνύεται η εμπρόθεσμη ανταπόκριση.",
        actionIfPartial: "Εξασφαλίστε ότι καταγράφεται η ημερομηνία λήψης και η απάντηση για κάθε αίτημα.",
        priority: "medium",
      },
    ],
  },
  {
    id: "security",
    title: "Ασφάλεια Δεδομένων",
    description: "Τεχνικά και οργανωτικά μέτρα ασφάλειας επεξεργασίας",
    icon: "Shield",
    articles: ["32", "33", "34"],
    questions: [
      {
        id: "sec_01",
        text: "Χρησιμοποιείται κρυπτογράφηση για δεδομένα σε ανάπαυση (at rest) και μεταφορά (in transit);",
        weight: 3,
        article: "32(1)(a)",
        actionIfNo: "Εφαρμόστε άμεσα AES-256 για αποθήκευση και TLS 1.2+ για μεταφορά. Αποτελεί ελάχιστη απαίτηση.",
        actionIfPartial: "Κρυπτογραφήστε τις βάσεις δεδομένων που δεν έχουν ακόμη κρυπτογράφηση.",
        priority: "critical",
      },
      {
        id: "sec_02",
        text: "Εφαρμόζεται αρχή ελάχιστης πρόσβασης (least privilege) — κάθε χρήστης έχει μόνο τα δικαιώματα που χρειάζεται;",
        weight: 3,
        article: "32(1)(b)",
        actionIfNo: "Ορίστε ρόλους (RBAC) και αναθεωρήστε δικαιώματα. Αφαιρέστε περιττά admin δικαιώματα.",
        actionIfPartial: "Ολοκληρώστε ανασκόπηση δικαιωμάτων και εφαρμόστε audit access reviews τριμηνιαία.",
        priority: "critical",
      },
      {
        id: "sec_03",
        text: "Γίνεται τακτικά penetration testing και vulnerability assessment;",
        weight: 2,
        article: "32(1)(d)",
        actionIfNo: "Προγραμματίστε ετήσιο pentest από accredited εταιρεία. Υλοποιήστε vulnerability scanning τουλάχιστον τριμηνιαία.",
        actionIfPartial: "Αυξήστε τη συχνότητα testing ή διευρύνετε το scope (web apps, infrastructure, APIs).",
        priority: "high",
      },
      {
        id: "sec_04",
        text: "Υπάρχει σχέδιο ανάκαμψης από καταστροφές (Disaster Recovery Plan) με δοκιμές;",
        weight: 2,
        article: "32(1)(c)",
        actionIfNo: "Συντάξτε DRP που περιλαμβάνει: RTO, RPO, backup strategy, ευθύνες, επικοινωνία. Δοκιμάστε ετησίως.",
        actionIfPartial: "Εκτελέστε disaster recovery drill και αξιολογήστε αν το RTO/RPO επιτυγχάνεται.",
        priority: "high",
      },
      {
        id: "sec_05",
        text: "Εφαρμόζεται MFA (Multi-Factor Authentication) για πρόσβαση σε συστήματα με προσωπικά δεδομένα;",
        weight: 2,
        article: "32",
        actionIfNo: "Ενεργοποιήστε MFA για όλα τα συστήματα που επεξεργάζονται προσωπικά δεδομένα. Ξεκινήστε από admin λογαριασμούς.",
        actionIfPartial: "Επεκτείνετε MFA σε όλους τους χρήστες, όχι μόνο administrators.",
        priority: "critical",
      },
      {
        id: "sec_06",
        text: "Τηρούνται αρχεία καταγραφής (logs) πρόσβασης σε συστήματα με προσωπικά δεδομένα;",
        weight: 2,
        article: "32",
        actionIfNo: "Ενεργοποιήστε audit logging σε όλες τις βάσεις δεδομένων και εφαρμογές. Αποθηκεύστε logs για τουλάχιστον 1 χρόνο.",
        actionIfPartial: "Εξασφαλίστε ότι τα logs περιλαμβάνουν: ποιος, πότε, τι δεδομένα προσπέλασε.",
        priority: "high",
      },
      {
        id: "sec_07",
        text: "Έχετε εκτελέσει και τεκμηριώσει Αξιολόγηση Κινδύνου Ασφάλειας (Security Risk Assessment);",
        weight: 2,
        article: "32(2)",
        actionIfNo: "Εκτελέστε Security Risk Assessment (π.χ. ISO 27001 methodology). Τεκμηριώστε κινδύνους και μέτρα αντιμετώπισης.",
        actionIfPartial: "Ενημερώστε το Risk Assessment ετησίως ή μετά σημαντικές αλλαγές στα συστήματα.",
        priority: "high",
      },
      {
        id: "sec_08",
        text: "Τα endpoints (laptops, κινητά) που χειρίζονται δεδομένα προστατεύονται με MDM/antivirus/encryption;",
        weight: 2,
        article: "32",
        actionIfNo: "Εγκαταστήστε MDM (π.χ. Microsoft Intune), antivirus και full-disk encryption σε όλα τα εταιρικά devices.",
        actionIfPartial: "Βεβαιωθείτε ότι η πολιτική καλύπτει και τα BYOD devices.",
        priority: "high",
      },
    ],
  },
  {
    id: "privacy_by_design",
    title: "Privacy by Design & Default",
    description: "Ενσωμάτωση προστασίας δεδομένων στο σχεδιασμό συστημάτων",
    icon: "Code2",
    articles: ["25"],
    questions: [
      {
        id: "pbd_01",
        text: "Κάθε νέο σύστημα/εφαρμογή αξιολογείται για GDPR συμμόρφωση πριν την ανάπτυξη;",
        weight: 3,
        article: "25",
        actionIfNo: "Θεσπίστε υποχρεωτική Privacy by Design review πριν έναρξη κάθε νέου project (χρησιμοποιήστε τη Λίστα Ελέγχου).",
        actionIfPartial: "Τυποποιήστε τη διαδικασία ώστε να μην παρακάμπτεται υπό πίεση χρόνου.",
        priority: "critical",
      },
      {
        id: "pbd_02",
        text: "Εφαρμόζεται ψευδωνυμοποίηση ή ανωνυμοποίηση δεδομένων όπου είναι εφικτό;",
        weight: 2,
        article: "25(1)",
        actionIfNo: "Εντοπίστε περιπτώσεις όπου η ψευδωνυμοποίηση είναι τεχνικά εφικτή (π.χ. analytics, testing environments).",
        actionIfPartial: "Επεκτείνετε ψευδωνυμοποίηση σε test environments — ΠΟΤΕ real data σε dev/test.",
        priority: "high",
      },
      {
        id: "pbd_03",
        text: "Τα APIs και endpoints επαληθεύουν και εξουσιοδοτούν κάθε αίτημα (auth + authz);",
        weight: 3,
        article: "32",
        actionIfNo: "Εφαρμόστε OAuth2/JWT authentication σε όλα τα APIs. Χωρίς authentication, τα δεδομένα είναι εκτεθειμένα.",
        actionIfPartial: "Εντοπίστε endpoints χωρίς authorization checks και διορθώστε τα προτεραιότητα.",
        priority: "critical",
      },
      {
        id: "pbd_04",
        text: "Τα production δεδομένα δεν χρησιμοποιούνται ποτέ σε development/test περιβάλλοντα;",
        weight: 3,
        article: "25",
        actionIfNo: "Θεσπίστε πολιτική: ΑΠΑΓΟΡΕΥΕΤΑΙ η χρήση production data σε non-production περιβάλλοντα. Δημιουργήστε synthetic data.",
        actionIfPartial: "Εξασφαλίστε ότι τα production δεδομένα ανωνυμοποιούνται πλήρως πριν χρησιμοποιηθούν σε testing.",
        priority: "critical",
      },
      {
        id: "pbd_05",
        text: "Εφαρμόζονται security headers (CSP, HSTS, X-Frame-Options) στις web εφαρμογές;",
        weight: 2,
        article: "32",
        actionIfNo: "Ρυθμίστε security headers στον web server/reverse proxy. Ελέγξτε με securityheaders.com.",
        actionIfPartial: "Αυστηροποιήστε το Content-Security-Policy για να αποτραπεί XSS.",
        priority: "high",
      },
    ],
  },
  {
    id: "data_processors",
    title: "Εκτελεστές & Τρίτοι Πάροχοι",
    description: "Διαχείριση σχέσεων με εκτελεστές επεξεργασίας (Άρθρο 28)",
    icon: "Building2",
    articles: ["28", "29", "44", "46"],
    questions: [
      {
        id: "dp_01",
        text: "Υπάρχει υπογεγραμμένη Σύμβαση DPA (Άρθρο 28) με κάθε εκτελεστή επεξεργασίας;",
        weight: 3,
        article: "28",
        actionIfNo: "Αποστείλτε άμεσα DPA σε όλους τους παρόχους/συνεργάτες που επεξεργάζονται δεδομένα για λογαριασμό σας.",
        actionIfPartial: "Ολοκληρώστε τις εκκρεμείς υπογραφές DPA. Χωρίς DPA, η σχέση δεν είναι GDPR-compliant.",
        priority: "critical",
      },
      {
        id: "dp_02",
        text: "Έχει γίνει due diligence (αξιολόγηση) για κάθε εκτελεστή επεξεργασίας (ασφάλεια, πιστοποιήσεις);",
        weight: 2,
        article: "28(1)",
        actionIfNo: "Δημιουργήστε vendor assessment process: ελέγξτε ISO 27001, SOC2, GDPR-compliant πολιτικές παρόχων.",
        actionIfPartial: "Ολοκληρώστε αξιολόγηση για τους παρόχους χωρίς documentation.",
        priority: "high",
      },
      {
        id: "dp_03",
        text: "Γνωρίζετε ποιοι υπό-εκτελεστές (sub-processors) χρησιμοποιούν οι εκτελεστές σας;",
        weight: 2,
        article: "28(2)",
        actionIfNo: "Ζητήστε από κάθε εκτελεστή λίστα sub-processors. Βεβαιωθείτε ότι ενημερώνεστε για αλλαγές.",
        actionIfPartial: "Ενημερώστε το μητρώο sub-processors για τους εκτελεστές που δεν έχετε τεκμηριώσει.",
        priority: "high",
      },
      {
        id: "dp_04",
        text: "Αν χρησιμοποιείτε cloud services εκτός ΕΕ, υπάρχουν Standard Contractual Clauses (SCCs);",
        weight: 3,
        article: "46",
        actionIfNo: "Εντοπίστε transfers εκτός ΕΕ. Εφαρμόστε SCCs (2021 EU SCCs) ή επαληθεύστε Privacy Shield/adequacy decisions.",
        actionIfPartial: "Βεβαιωθείτε ότι τα SCCs καλύπτουν όλες τις μεταφορές και είναι ενημερωμένα (post-Schrems II).",
        priority: "critical",
      },
      {
        id: "dp_05",
        text: "Τηρείται μητρώο τρίτων παρόχων/εκτελεστών με κατάσταση DPA και ανανέωση;",
        weight: 2,
        article: "28",
        actionIfNo: "Δημιουργήστε μητρώο εκτελεστών με: όνομα, σκοπό, DPA status, ημ. λήξης, χώρα επεξεργασίας.",
        actionIfPartial: "Ενημερώστε το μητρώο και ορίστε υπεύθυνο για παρακολούθηση λήξεων DPA.",
        priority: "high",
      },
    ],
  },
  {
    id: "breach_dpia",
    title: "Παραβίαση Δεδομένων & DPIA",
    description: "Διαδικασίες αντιμετώπισης παραβιάσεων και εκτιμήσεις αντικτύπου",
    icon: "AlertTriangle",
    articles: ["33", "34", "35", "36"],
    questions: [
      {
        id: "bd_01",
        text: "Υπάρχει τεκμηριωμένη διαδικασία αντιμετώπισης παραβίασης δεδομένων (Incident Response Plan);",
        weight: 3,
        article: "33",
        actionIfNo: "Συντάξτε IRP που ορίζει: πώς εντοπίζεται παραβίαση, ποιος ενημερώνεται, πότε γνωστοποιείται στην ΑΠΔΠΧ (72 ώρες).",
        actionIfPartial: "Ελέγξτε αν το IRP καλύπτει τη 72-ωρη προθεσμία γνωστοποίησης στην ΑΠΔΠΧ.",
        priority: "critical",
      },
      {
        id: "bd_02",
        text: "Μπορείτε να γνωστοποιήσετε παραβίαση στην ΑΠΔΠΧ εντός 72 ωρών από την ανακάλυψη;",
        weight: 3,
        article: "33(1)",
        actionIfNo: "Ορίστε υπεύθυνο (DPO ή GDPR lead), ετοιμάστε template γνωστοποίησης, δοκιμάστε με tabletop exercise.",
        actionIfPartial: "Διεξάγετε tabletop exercise για να ελέγξετε αν η 72-ωρη προθεσμία είναι εφικτή.",
        priority: "critical",
      },
      {
        id: "bd_03",
        text: "Τηρείται αρχείο παραβιάσεων (ακόμα και ήσσονος σημασίας που δεν γνωστοποιήθηκαν);",
        weight: 2,
        article: "33(5)",
        actionIfNo: "Δημιουργήστε breach register: καταγράφετε ΟΛΕΣ τις παραβιάσεις, ακόμα και αυτές που δεν απαιτούν γνωστοποίηση.",
        actionIfPartial: "Βεβαιωθείτε ότι το register περιλαμβάνει: ημ. ανακάλυψης, φύση, επιπτώσεις, μέτρα αντιμετώπισης.",
        priority: "high",
      },
      {
        id: "bd_04",
        text: "Εκτελείται DPIA για νέες/τροποποιημένες επεξεργασίες υψηλού κινδύνου;",
        weight: 3,
        article: "35",
        actionIfNo: "Καθορίστε κριτήρια για 'υψηλό κίνδυνο' και θεσπίστε υποχρεωτική DPIA πριν έναρξη τέτοιων επεξεργασιών.",
        actionIfPartial: "Βεβαιωθείτε ότι η DPIA γίνεται ΠΡΙΝ (όχι μετά) την έναρξη επεξεργασίας.",
        priority: "critical",
      },
      {
        id: "bd_05",
        text: "Αν DPIA εντόπισε υψηλό κίνδυνο που δεν μπορεί να μετριαστεί, ενημερώθηκε η ΑΠΔΠΧ;",
        weight: 3,
        article: "36",
        actionIfNo: "Ελέγξτε αποτελέσματα υπαρχουσών DPIA. Αν υπάρχει υψηλός αμείωτος κίνδυνος, ξεκινήστε διαβούλευση με ΑΠΔΠΧ.",
        actionIfPartial: "Ολοκληρώστε τη διαδικασία προηγούμενης διαβούλευσης για τις εκκρεμείς περιπτώσεις.",
        priority: "critical",
      },
    ],
  },
  {
    id: "training_organization",
    title: "Εκπαίδευση & Οργάνωση",
    description: "Εκπαίδευση προσωπικού, ορισμός DPO και οργανωτική δομή GDPR",
    icon: "GraduationCap",
    articles: ["37", "38", "39"],
    questions: [
      {
        id: "to_01",
        text: "Έχει οριστεί Υπεύθυνος Προστασίας Δεδομένων (DPO) αν απαιτείται;",
        weight: 3,
        article: "37",
        hint: "DPO απαιτείται για δημόσιους φορείς, μεγάλης κλίμακας παρακολούθηση, ή ειδικές κατηγορίες δεδομένων",
        actionIfNo: "Αξιολογήστε αν υποχρεούστε σε DPO. Αν ναι, ορίστε ή εξωτερικεύστε σε GDPR εμπειρογνώμονα.",
        actionIfPartial: "Βεβαιωθείτε ότι ο DPO έχει επαρκείς πόρους και ανεξαρτησία.",
        priority: "critical",
      },
      {
        id: "to_02",
        text: "Όλο το προσωπικό έχει εκπαιδευτεί σε GDPR βασικές αρχές (τουλάχιστον ετησίως);",
        weight: 2,
        article: "39(1)(b)",
        actionIfNo: "Οργανώστε υποχρεωτική εκπαίδευση. Χρησιμοποιήστε τη Compliance Academy της πλατφόρμας.",
        actionIfPartial: "Εξασφαλίστε ότι ΟΛΟΙ ολοκληρώνουν την εκπαίδευση (100% completion rate).",
        priority: "high",
      },
      {
        id: "to_03",
        text: "Υπάρχει GDPR policy (πολιτική προστασίας δεδομένων) εγκεκριμένη από τη διοίκηση;",
        weight: 2,
        article: "24",
        actionIfNo: "Συντάξτε και εγκρίνετε GDPR policy. Ανανεώνετε ετησίως. Διανείμετε σε όλους.",
        actionIfPartial: "Βεβαιωθείτε ότι η policy είναι ενημερωμένη και αντανακλά τις τρέχουσες πρακτικές.",
        priority: "high",
      },
      {
        id: "to_04",
        text: "Γίνεται ετήσιος GDPR compliance review/audit εσωτερικά ή από τρίτο;",
        weight: 2,
        article: "24",
        actionIfNo: "Προγραμματίστε ετήσιο GDPR audit. Χρησιμοποιήστε αυτή την αξιολόγηση ως baseline.",
        actionIfPartial: "Βεβαιωθείτε ότι τα ευρήματα του audit μετατρέπονται σε corrective actions με deadlines.",
        priority: "medium",
      },
      {
        id: "to_05",
        text: "Οι εργαζόμενοι γνωρίζουν σε ποιον αναφέρουν ύποπτα incidents ή παραβιάσεις;",
        weight: 2,
        article: "39(1)(e)",
        actionIfNo: "Ορίστε και κοινοποιήστε σαφές κανάλι αναφοράς (email, εσωτερική φόρμα) για data incidents.",
        actionIfPartial: "Διασφαλίστε ότι το κανάλι αναφοράς είναι διαθέσιμο 24/7 και η αναφορά γίνεται χωρίς αντίποινα.",
        priority: "high",
      },
    ],
  },
];

// Score calculation
export function calculateCategoryScore(
  questions: AssessmentQuestion[],
  answers: Record<string, AnswerValue>
): { score: number; maxScore: number; percentage: number } {
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    const w = q.weight;
    maxScore += w * 2; // max points per question = weight * 2
    const answer = answers[q.id];
    if (answer === "yes") score += w * 2;
    else if (answer === "partial") score += w * 1;
    // "no" or null = 0
  }

  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
  };
}

export function getComplianceLevel(pct: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  text: string;
  icon: string;
} {
  if (pct >= 80) return {
    label: "Συμμορφούμενο",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-300 dark:border-green-700",
    ring: "ring-green-500",
    text: "Η επιχείρηση πληροί τις απαιτήσεις σε αυτόν τον τομέα. Διατηρήστε και βελτιώστε τις πρακτικές σας.",
    icon: "🟢",
  };
  if (pct >= 50) return {
    label: "Μερικώς Συμμορφούμενο",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-300 dark:border-orange-700",
    ring: "ring-orange-500",
    text: "Υπάρχουν κενά συμμόρφωσης που πρέπει να αντιμετωπιστούν. Εστιάστε στα 'Όχι' και 'Μερικώς'.",
    icon: "🟠",
  };
  return {
    label: "Μη Συμμορφούμενο",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-700",
    ring: "ring-red-500",
    text: "Σοβαρά κενά συμμόρφωσης. Άμεση ανάγκη διορθωτικών ενεργειών για αποφυγή προστίμων GDPR.",
    icon: "🔴",
  };
}

export function getOverallScore(
  categoryAnswers: Record<string, Record<string, AnswerValue>>
): number {
  let total = 0;
  let count = 0;
  for (const cat of ASSESSMENT_CATEGORIES) {
    const answers = categoryAnswers[cat.id] ?? {};
    const { percentage } = calculateCategoryScore(cat.questions, answers);
    total += percentage;
    count++;
  }
  return count > 0 ? Math.round(total / count) : 0;
}
