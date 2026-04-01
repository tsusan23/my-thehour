"use client";
import { useState } from 'react';
import styles from './EditReportModal.module.css';

interface ReportData {
  id: number;
  userId: number;
  dateLabel: string; // "4月1日" display label
  newVisitors: number;
  newNextReservations: number;
  newTicketPurchasers: number;
  newRevenue: number;
  existingRevenue: number;
  newDigestionRevenue: number;
  existingDigestionRevenue: number;
  ticketFinishers: number;
  continuedUsers: number;
  totalSessions: number;
  newSessions: number;
  existingSessions: number;
  welfareSessions: number;
}

interface Props {
  report: ReportData;
  onClose: () => void;
  onSaved: () => void;
}

const FIELDS = [
  { key: 'newRevenue',               label: '新規売上',          isCurrency: true },
  { key: 'existingRevenue',          label: '既存売上',          isCurrency: true },
  { key: 'newDigestionRevenue',      label: '新規消化',          isCurrency: true },
  { key: 'existingDigestionRevenue', label: '既存消化',          isCurrency: true },
  { key: 'newVisitors',              label: '新規客数',          suffix: '名' },
  { key: 'newNextReservations',      label: '新規リピート数',    suffix: '名' },
  { key: 'newTicketPurchasers',      label: '回数券購入数',      suffix: '名' },
  { key: 'ticketFinishers',          label: '回数券終了数',      suffix: '名' },
  { key: 'continuedUsers',           label: '継続者数',          suffix: '名' },
  { key: 'totalSessions',            label: '総施術数',          suffix: '件' },
  { key: 'newSessions',              label: '新規施術数',        suffix: '件' },
  { key: 'existingSessions',         label: '既存施術数',        suffix: '件' },
  { key: 'welfareSessions',          label: '福祉施術数',        suffix: '件' },
];

export default function EditReportModal({ report, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, number>>({
    newVisitors:              report.newVisitors,
    newNextReservations:      report.newNextReservations,
    newTicketPurchasers:      report.newTicketPurchasers,
    newRevenue:               report.newRevenue,
    existingRevenue:          report.existingRevenue,
    newDigestionRevenue:      report.newDigestionRevenue,
    existingDigestionRevenue: report.existingDigestionRevenue,
    ticketFinishers:          report.ticketFinishers,
    continuedUsers:           report.continuedUsers,
    totalSessions:            report.totalSessions,
    newSessions:              report.newSessions,
    existingSessions:         report.existingSessions,
    welfareSessions:          report.welfareSessions,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    setForm(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          userId: report.userId,
          ...form
        })
      });

      const json = await res.json();
      if (json.success) {
        onSaved();
        onClose();
      } else {
        setError(json.error || '保存に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>📝 日次数字の修正</h2>
            <p className={styles.modalDate}>{report.dateLabel}のデータを編集します</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.formGrid}>
          {FIELDS.map(field => (
            <div key={field.key} className={styles.formRow}>
              <label className={styles.fieldLabel}>
                {field.label}
                {field.isCurrency && <span className={styles.unit}>（円）</span>}
                {field.suffix && <span className={styles.unit}>（{field.suffix}）</span>}
              </label>
              <input
                type="number"
                className={styles.fieldInput}
                value={form[field.key]}
                min={0}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Computed preview */}
        <div className={styles.preview}>
          <div className={styles.previewItem}>
            <span>合計売上（新規＋既存）</span>
            <strong>¥{((form.newRevenue || 0) + (form.existingRevenue || 0)).toLocaleString()}</strong>
          </div>
          <div className={styles.previewItem}>
            <span>回数券購入率</span>
            <strong>
              {form.newVisitors > 0
                ? `${Math.round((form.newTicketPurchasers / form.newVisitors) * 100)}%`
                : '--'}
            </strong>
          </div>
        </div>

        {error && <p className={styles.errorMsg}>❌ {error}</p>}

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelBtn} disabled={isSaving}>
            キャンセル
          </button>
          <button onClick={handleSave} className={styles.saveBtn} disabled={isSaving}>
            {isSaving ? '保存中...' : '修正を保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
