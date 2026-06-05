import { ArrowLeft } from "lucide-react";
import styles from "./kosmocar.module.css";

export default function KosmocarTheme({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <a href="/" className={styles.back}><ArrowLeft className="h-3.5 w-3.5" /> Επιστροφή στο κεντρικό</a>
        {children}
      </div>
    </div>
  );
}
