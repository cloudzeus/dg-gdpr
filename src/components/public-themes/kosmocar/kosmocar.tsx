import { ShieldCheck } from "lucide-react";
import styles from "./kosmocar.module.css";

export default function KosmocarTheme({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.logo}><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <p className={styles.brandName}>Συναίνεση Δεδομένων</p>
            <p className={styles.brandSub}>Προστασία Προσωπικών Δεδομένων · GDPR</p>
          </div>
        </div>
        {children}
        <p className={styles.footer}>
          Τα δεδομένα σας υποβάλλονται σε επεξεργασία σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679 (GDPR).
        </p>
      </div>
    </div>
  );
}
