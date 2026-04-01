import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 700 }}>MY THE HOUR</h1>
          <p style={{ color: 'var(--secondary-foreground)', marginBottom: '2rem' }}>
            Next.js MVP Setup Complete
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/login" className={styles.primaryButton}>
              Login / スタッフマイページへ
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
