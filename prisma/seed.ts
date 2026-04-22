import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Organization (singleton) ──────────────────────────────────────────────
  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    await prisma.organization.create({
      data: {
        name: "DG Smart",
        legalName: "DG Smart Μονοπρόσωπη ΙΚΕ",
        country: "Ελλάδα",
        phones: [{ label: "Κεντρικό", number: "+30 210 0000000" }],
        emails: [{ label: "Info", address: "info@dgsmart.gr" }],
        domains: ["dgsmart.gr"],
        website: "https://dgsmart.gr",
        description: "Software Houses & ERP Integrators",
      },
    });
    console.log("✓ Organization seeded");
  }

  // ── Positions library ─────────────────────────────────────────────────────
  const positions = [
    { code: "DPO", title: "Υπεύθυνος Προστασίας Δεδομένων (DPO)", isKeyRole: true, description: "Άρθρο 37-39 GDPR" },
    { code: "SEC_OFFICER", title: "Υπεύθυνος Ασφαλείας Πληροφοριών (CISO)", isKeyRole: true, description: "ISO 27001 / NIS2" },
    { code: "COMP_OFFICER", title: "Υπεύθυνος Συμμόρφωσης", isKeyRole: true },
    { code: "IT_MGR", title: "IT Manager", isKeyRole: false },
    { code: "HR_MGR", title: "HR Manager", isKeyRole: false },
    { code: "LEGAL", title: "Νομικός Σύμβουλος", isKeyRole: false },
    { code: "DEV_SR", title: "Senior Developer", isKeyRole: false },
    { code: "DEV", title: "Developer", isKeyRole: false },
    { code: "SUPPORT", title: "Τεχνική Υποστήριξη", isKeyRole: false },
    { code: "SALES", title: "Πωλητής", isKeyRole: false },
    { code: "CONSULTANT", title: "Σύμβουλος Εφαρμογών", isKeyRole: false },
    { code: "ACCOUNTANT", title: "Λογιστής", isKeyRole: false },
    { code: "MARKETING", title: "Marketing Specialist", isKeyRole: false },
    { code: "CEO", title: "Διευθύνων Σύμβουλος", isKeyRole: false },
  ];
  for (const p of positions) {
    await prisma.position.upsert({ where: { code: p.code }, update: p, create: p });
  }
  console.log(`✓ Positions seeded (${positions.length})`);

  // ── Departments (hierarchy) ───────────────────────────────────────────────
  const mgmt = await prisma.department.upsert({
    where: { code: "MGMT" },
    update: { name: "Διοίκηση" },
    create: { code: "MGMT", name: "Διοίκηση", description: "Ανώτατη διοίκηση" },
  });
  const tech = await prisma.department.upsert({
    where: { code: "TECH" },
    update: { name: "Τεχνολογία & Ανάπτυξη", parentId: mgmt.id },
    create: { code: "TECH", name: "Τεχνολογία & Ανάπτυξη", parentId: mgmt.id },
  });
  await prisma.department.upsert({
    where: { code: "DEV" },
    update: { name: "Ανάπτυξη Λογισμικού", parentId: tech.id },
    create: { code: "DEV", name: "Ανάπτυξη Λογισμικού", parentId: tech.id },
  });
  await prisma.department.upsert({
    where: { code: "SUPPORT" },
    update: { name: "Τεχνική Υποστήριξη & VoIP", parentId: tech.id },
    create: { code: "SUPPORT", name: "Τεχνική Υποστήριξη & VoIP", parentId: tech.id },
  });
  await prisma.department.upsert({
    where: { code: "HR" },
    update: { name: "Ανθρώπινο Δυναμικό", parentId: mgmt.id },
    create: { code: "HR", name: "Ανθρώπινο Δυναμικό", parentId: mgmt.id },
  });
  await prisma.department.upsert({
    where: { code: "FIN" },
    update: { name: "Λογιστήριο & Οικονομικά", parentId: mgmt.id },
    create: { code: "FIN", name: "Λογιστήριο & Οικονομικά", parentId: mgmt.id },
  });
  await prisma.department.upsert({
    where: { code: "SALES" },
    update: { name: "Πωλήσεις & CRM", parentId: mgmt.id },
    create: { code: "SALES", name: "Πωλήσεις & CRM", parentId: mgmt.id },
  });
  await prisma.department.upsert({
    where: { code: "MKT" },
    update: { name: "Marketing & Επικοινωνία", parentId: mgmt.id },
    create: { code: "MKT", name: "Marketing & Επικοινωνία", parentId: mgmt.id },
  });
  await prisma.department.upsert({
    where: { code: "LEGAL" },
    update: { name: "Νομικό Τμήμα", parentId: mgmt.id },
    create: { code: "LEGAL", name: "Νομικό Τμήμα", parentId: mgmt.id },
  });
  console.log("✓ Departments seeded (hierarchical)");

  // ── Super Admin user ──────────────────────────────────────────────────────
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "1f1femsk";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const dpoPosition = await prisma.position.findUnique({ where: { code: "DPO" } });

  const admin = await prisma.user.upsert({
    where: { email: "gkozyris@i4ria.com" },
    update: {
      role: "ADMIN",
      name: "George Kozyris",
      password: hashedPassword,
      departmentId: mgmt.id,
      positionId: dpoPosition?.id ?? null,
    },
    create: {
      email: "gkozyris@i4ria.com",
      name: "George Kozyris",
      role: "ADMIN",
      password: hashedPassword,
      departmentId: mgmt.id,
      positionId: dpoPosition?.id ?? null,
    },
  });
  console.log(`✓ Super Admin: ${admin.email} (${admin.id})`);

  // ── Policies (starter pack) ───────────────────────────────────────────────
  const policies: Array<{
    id: string;
    title: string;
    type:
      | "SECURITY_POLICY"
      | "DATA_RETENTION"
      | "INCIDENT_RESPONSE"
      | "PASSWORD_POLICY"
      | "ACCEPTABLE_USE"
      | "PRIVACY_NOTICE"
      | "COOKIE_POLICY"
      | "BACKUP"
      | "REMOTE_WORK"
      | "VENDOR_MANAGEMENT";
    version: string;
    status: "DRAFT" | "ACTIVE";
    content: string;
  }> = [
    {
      id: "pol-security",
      title: "Πολιτική Ασφάλειας Πληροφοριών",
      type: "SECURITY_POLICY",
      version: "1.0",
      status: "DRAFT",
      content: "# Πολιτική Ασφάλειας Πληροφοριών\n\nΣκοπός, πεδίο εφαρμογής, ευθύνες, μέτρα ασφαλείας...",
    },
    {
      id: "pol-retention",
      title: "Πολιτική Διατήρησης Δεδομένων",
      type: "DATA_RETENTION",
      version: "1.0",
      status: "DRAFT",
      content: "# Πολιτική Διατήρησης\n\nΧρόνοι διατήρησης ανά κατηγορία δεδομένων (Άρθρο 5(1)(e) GDPR)...",
    },
    {
      id: "pol-incident",
      title: "Διαχείριση Περιστατικών Ασφαλείας & Παραβιάσεων",
      type: "INCIDENT_RESPONSE",
      version: "1.0",
      status: "DRAFT",
      content: "# Incident Response\n\nΕιδοποίηση ΑΠΔΠΧ εντός 72 ωρών (Άρθρο 33 GDPR)...",
    },
    {
      id: "pol-password",
      title: "Πολιτική Κωδικών Πρόσβασης",
      type: "PASSWORD_POLICY",
      version: "1.0",
      status: "DRAFT",
      content: "# Password Policy\n\nΕλάχ. 12 χαρ., MFA υποχρεωτικό, rotation 90 ημ...",
    },
    {
      id: "pol-aup",
      title: "Πολιτική Αποδεκτής Χρήσης",
      type: "ACCEPTABLE_USE",
      version: "1.0",
      status: "DRAFT",
      content: "# Acceptable Use\n\nΕπιτρεπτές και απαγορευμένες χρήσεις των πληροφοριακών πόρων...",
    },
    {
      id: "pol-privacy",
      title: "Ενημέρωση Ιδιωτικότητας (Privacy Notice)",
      type: "PRIVACY_NOTICE",
      version: "1.0",
      status: "DRAFT",
      content: "# Privacy Notice\n\nΠληροφορίες προς υποκείμενα δεδομένων (Άρθρα 13-14 GDPR)...",
    },
    {
      id: "pol-cookies",
      title: "Πολιτική Cookies",
      type: "COOKIE_POLICY",
      version: "1.0",
      status: "DRAFT",
      content: "# Cookie Policy\n\nΚατηγορίες cookies, συγκατάθεση (ePrivacy + Άρθρο 6 GDPR)...",
    },
    {
      id: "pol-backup",
      title: "Πολιτική Backup & Αποκατάστασης",
      type: "BACKUP",
      version: "1.0",
      status: "DRAFT",
      content: "# Backup & Recovery\n\n3-2-1 rule, RTO/RPO, encrypted off-site copies...",
    },
    {
      id: "pol-remote",
      title: "Πολιτική Τηλεργασίας",
      type: "REMOTE_WORK",
      version: "1.0",
      status: "DRAFT",
      content: "# Remote Work\n\nVPN, endpoint security, clean desk...",
    },
    {
      id: "pol-vendor",
      title: "Διαχείριση Προμηθευτών & Τρίτων",
      type: "VENDOR_MANAGEMENT",
      version: "1.0",
      status: "DRAFT",
      content: "# Vendor Management\n\nDPA, due diligence, onboarding/offboarding τρίτων...",
    },
  ];
  for (const p of policies) {
    await prisma.policyDocument.upsert({
      where: { id: p.id },
      update: { title: p.title, content: p.content, version: p.version, type: p.type as any, status: p.status as any, ownerId: admin.id },
      create: { ...p, ownerId: admin.id },
    });
  }
  console.log(`✓ Policies seeded (${policies.length})`);

  // ── Training modules with sections + materials + questions ────────────────
  // Clean old children first (idempotent wipe of training content)
  await prisma.trainingQuestion.deleteMany({});
  await prisma.trainingMaterial.deleteMany({});
  await prisma.trainingSection.deleteMany({});

  const mod1 = await prisma.trainingModule.upsert({
    where: { id: "module-gdpr-basics" },
    update: { title: "Βασικές Αρχές GDPR", description: "Εισαγωγή στον Κανονισμό 2016/679", passingScore: 70, durationMin: 20 },
    create: {
      id: "module-gdpr-basics",
      title: "Βασικές Αρχές GDPR",
      description: "Εισαγωγή στον Κανονισμό 2016/679",
      passingScore: 70,
      durationMin: 20,
    },
  });
  await prisma.trainingSection.create({
    data: {
      moduleId: mod1.id,
      order: 1,
      title: "Τι είναι το GDPR",
      body: "Ο Γενικός Κανονισμός Προστασίας Δεδομένων (ΕΕ 2016/679) τέθηκε σε ισχύ τον Μάιο 2018 και εφαρμόζεται σε κάθε επιχείρηση που επεξεργάζεται προσωπικά δεδομένα πολιτών της ΕΕ.",
      materials: {
        create: [
          { order: 1, type: "ARTICLE", title: "Επίσημο κείμενο του Κανονισμού (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" },
          { order: 2, type: "LINK", title: "Ιστοσελίδα ΑΠΔΠΧ", url: "https://www.dpa.gr" },
        ],
      },
    },
  });
  await prisma.trainingSection.create({
    data: {
      moduleId: mod1.id,
      order: 2,
      title: "Οι 6 Αρχές Επεξεργασίας (Άρθρο 5)",
      body: "Νομιμότητα/δικαιοσύνη/διαφάνεια · Περιορισμός σκοπού · Ελαχιστοποίηση · Ακρίβεια · Περιορισμός αποθήκευσης · Ακεραιότητα & Εμπιστευτικότητα.",
      materials: {
        create: [
          { order: 1, type: "ARTICLE", title: "Άρθρο 5 GDPR — αναλυτικά", url: "https://gdpr-info.eu/art-5-gdpr/" },
        ],
      },
    },
  });
  await prisma.trainingQuestion.createMany({
    data: [
      { moduleId: mod1.id, order: 1, question: "Ποιος είναι ο κύριος σκοπός του GDPR;", options: JSON.stringify(["Φορολογία επιχειρήσεων", "Προστασία προσωπικών δεδομένων", "Ψηφιακή φορολογία", "Κυβερνοασφάλεια"]), correctAnswer: 1, explanation: "Το GDPR προστατεύει τα θεμελιώδη δικαιώματα και ελευθερίες των φυσικών προσώπων.", weight: 1 },
      { moduleId: mod1.id, order: 2, question: "Πόσες βασικές αρχές επεξεργασίας ορίζει το Άρθρο 5 GDPR;", options: JSON.stringify(["4", "5", "6", "8"]), correctAnswer: 2, explanation: "Το Άρθρο 5 ορίζει 6 αρχές.", weight: 1 },
      { moduleId: mod1.id, order: 3, question: "Τι σημαίνει 'Privacy by Design';", options: JSON.stringify(["Σχεδιασμός UI", "Ενσωμάτωση προστασίας δεδομένων από τον σχεδιασμό", "Ασφάλεια δικτύου", "Διαχείριση κωδικών"]), correctAnswer: 1, explanation: "Άρθρο 25 GDPR — ενσωμάτωση μέτρων εξ αρχής.", weight: 2 },
      { moduleId: mod1.id, order: 4, question: "Εντός πόσων ωρών πρέπει να ειδοποιηθεί η εποπτική αρχή σε περίπτωση data breach;", options: JSON.stringify(["24", "48", "72", "168"]), correctAnswer: 2, explanation: "Άρθρο 33 GDPR — 72 ώρες.", weight: 2 },
      { moduleId: mod1.id, order: 5, question: "Ποιο είναι το δικαίωμα λήθης;", options: JSON.stringify(["Διαγραφή δεδομένων υπό προϋποθέσεις", "Αλλαγή ονόματος", "Ανωνυμοποίηση IP", "Κατάργηση cookies"]), correctAnswer: 0, explanation: "Άρθρο 17 GDPR — δικαίωμα διαγραφής.", weight: 2 },
    ],
  });

  const mod2 = await prisma.trainingModule.upsert({
    where: { id: "module-dev-gdpr" },
    update: { title: "GDPR για Προγραμματιστές", description: "Ασφαλής ανάπτυξη λογισμικού", passingScore: 75, durationMin: 30, targetRole: "DEVELOPER" },
    create: {
      id: "module-dev-gdpr",
      title: "GDPR για Προγραμματιστές",
      description: "Ασφαλής ανάπτυξη λογισμικού",
      passingScore: 75,
      durationMin: 30,
      targetRole: "DEVELOPER",
    },
  });
  await prisma.trainingSection.create({
    data: {
      moduleId: mod2.id,
      order: 1,
      title: "Ασφαλής Κώδικας (OWASP Top 10)",
      body: "SQL Injection, XSS, CSRF, Broken Access Control, Insecure Deserialization...",
      materials: {
        create: [
          { order: 1, type: "ARTICLE", title: "OWASP Top 10 (2021)", url: "https://owasp.org/Top10/" },
          { order: 2, type: "VIDEO", title: "OWASP Intro (YouTube)", url: "https://www.youtube.com/results?search_query=owasp+top+10" },
        ],
      },
    },
  });
  await prisma.trainingSection.create({
    data: {
      moduleId: mod2.id,
      order: 2,
      title: "Κρυπτογράφηση & Αποθήκευση",
      body: "AES-256 at rest, TLS 1.3 in transit, bcrypt/argon2 για passwords, key rotation.",
    },
  });
  await prisma.trainingQuestion.createMany({
    data: [
      { moduleId: mod2.id, order: 1, question: "Ποια κρυπτογράφηση απαιτείται για δεδομένα σε ανάπαυση;", options: JSON.stringify(["MD5", "SHA-1", "AES-256", "Base64"]), correctAnswer: 2, explanation: "AES-256 είναι το ελάχιστο GDPR-compliant.", weight: 2 },
      { moduleId: mod2.id, order: 2, question: "Τι πρέπει πριν από πρόσβαση σε παραγωγική ΒΔ πελάτη;", options: JSON.stringify(["Τίποτα", "Καταγραφή πρόσβασης & έγκριση", "Email", "Απλή σύνδεση"]), correctAnswer: 1, explanation: "Άρθρα 5, 29, 32 GDPR.", weight: 2 },
      { moduleId: mod2.id, order: 3, question: "Ποιο hashing είναι κατάλληλο για passwords;", options: JSON.stringify(["MD5", "SHA-1", "bcrypt/argon2", "CRC32"]), correctAnswer: 2, explanation: "Slow hashes με salt — bcrypt/argon2.", weight: 2 },
    ],
  });

  const mod3 = await prisma.trainingModule.upsert({
    where: { id: "module-voip-gdpr" },
    update: { title: "Συμμόρφωση VoIP & Ηχογραφήσεων", description: "Νομικές απαιτήσεις", passingScore: 80, durationMin: 25 },
    create: {
      id: "module-voip-gdpr",
      title: "Συμμόρφωση VoIP & Ηχογραφήσεων",
      description: "Νομικές απαιτήσεις",
      passingScore: 80,
      durationMin: 25,
    },
  });
  await prisma.trainingSection.create({
    data: {
      moduleId: mod3.id,
      order: 1,
      title: "Νομικές Βάσεις Ηχογράφησης",
      body: "Συγκατάθεση, Εκτέλεση σύμβασης, Νομική υποχρέωση (Άρθρο 6 GDPR).",
    },
  });
  await prisma.trainingQuestion.createMany({
    data: [
      { moduleId: mod3.id, order: 1, question: "Πότε είναι νόμιμη η ηχογράφηση χωρίς συγκατάθεση;", options: JSON.stringify(["Πάντα", "Μόνο με συγκατάθεση", "Για εκτέλεση σύμβασης ή νομική υποχρέωση", "Ποτέ"]), correctAnswer: 2, explanation: "Άρθρο 6(1)(b)/(c) GDPR.", weight: 2 },
      { moduleId: mod3.id, order: 2, question: "Ποιο έγγραφο απαιτείται με τρίτο πάροχο VoIP;", options: JSON.stringify(["DPIA", "DPA", "NDA", "SLA"]), correctAnswer: 1, explanation: "Άρθρο 28 GDPR — γραπτή DPA.", weight: 3 },
    ],
  });

  console.log(`✓ Training modules seeded with sections, materials, questions`);
  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
