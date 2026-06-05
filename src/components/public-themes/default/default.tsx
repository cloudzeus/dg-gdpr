import { ShieldCheck } from "lucide-react";
import styles from "./default.module.css";

export default function DefaultTheme({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.logo}><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <p className={styles.brandName}>GDPR Compliance OS</p>
            <p className={styles.brandSub}>DG Smart · Προστασία Δεδομένων Προσωπικού Χαρακτήρα</p>
          </div>
        </div>
        {children}
        <p className={styles.footer}>
          Τα δεδομένα σας υποβάλλονται σε επεξεργασία σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679 (GDPR).
          <br />© DG Smart — με την επιφύλαξη παντός δικαιώματος.
        </p>
      </div>
    </div>
  );
}
