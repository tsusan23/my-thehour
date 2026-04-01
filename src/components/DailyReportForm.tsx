"use client";
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LogoutBtn from '@/components/LogoutBtn';
import styles from './DailyReportForm.module.css';

interface Props {
  userId: number;
  userName: string;
  kgiTarget: number;
  monthToDateRevenue: number;
  avatarUrl?: string | null;
}

export default function DailyReportForm({ userId, userName, kgiTarget, monthToDateRevenue, avatarUrl }: Props) {
  const [newVisitors, setNewVisitors] = useState<number | ''>('');
  const [nextRes, setNextRes] = useState<number | ''>('');
  const [tickets, setTickets] = useState<number | ''>('');

  const todayStr = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  // Submission Status
  const [submissionStatus, setSubmissionStatus] = useState<'入力中' | '提出済'>('入力中');

  // Action Plan
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [actionPlanText, setActionPlanText] = useState('新規のお客様への丁寧なヒアリングを徹底し、次回予約率を上げる。');
  const [planSalesGoal, setPlanSalesGoal] = useState<number>(30000);
  const [planNewGoal, setPlanNewGoal] = useState<number>(2);
  const [planNextResGoal, setPlanNextResGoal] = useState<number>(2);

  // Tasks
  const [tasks, setTasks] = useState([
    { id: 1, text: 'カルテ入力', completed: true },
    { id: 2, text: 'LINE返信', completed: false },
    { id: 3, text: 'SNS投稿', completed: false }
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskInput.trim(), completed: false }]);
    setNewTaskInput('');
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        userId: userId, 
        targetDate: new Date().toISOString().split('T')[0] + "T00:00:00.000Z",
        newVisitors: newVisitors || 0,
        newNextReservations: nextRes || 0,
        newTicketPurchasers: tickets || 0,
        newRevenue: newRevenue || 0,
        existingRevenue: existingRevenue || 0,
        newDigestionRevenue: newDigestion || 0,
        existingDigestionRevenue: existingDigestion || 0,
        ticketFinishers: ticketFinishers || 0,
        continuedUsers: continuedUsers || 0,
        totalSessions: totalSessions || 0,
        newSessions: newSessions || 0,
        existingSessions: existingSessions || 0,
        welfareSessions: welfareSessions || 0,
        hasTourAccompaniment: tourAccompanied,
        submissionStatus: '提出済',
        actionPlan: {
          plan: actionPlanText,
          salesGoal: planSalesGoal,
          newVisitorGoal: planNewGoal,
          nextReservationGoal: planNextResGoal
        },
        tasks: tasks
      };

      const res = await fetch('/api/staff/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('API Error');

      setSubmissionStatus('提出済');
      alert('日次報告を提出しました！');
    } catch (error) {
      console.error(error);
      alert('提出に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newRevenueInput, setNewRevenueInput] = useState<string>('');
  const [existingRevenueInput, setExistingRevenueInput] = useState<string>('');
  const [newDigestionInput, setNewDigestionInput] = useState<string>('');
  const [existingDigestionInput, setExistingDigestionInput] = useState<string>('');

  const [newRevFocused, setNewRevFocused] = useState(false);
  const [exRevFocused, setExRevFocused] = useState(false);
  const [newDigFocused, setNewDigFocused] = useState(false);
  const [exDigFocused, setExDigFocused] = useState(false);

  const [ticketFinishers, setTicketFinishers] = useState<number | ''>('');
  const [continuedUsers, setContinuedUsers] = useState<number | ''>('');

  const [totalSessions, setTotalSessions] = useState<number | ''>('');
  const [newSessions, setNewSessions] = useState<number | ''>('');
  const [existingSessions, setExistingSessions] = useState<number | ''>('');
  const [welfareSessions, setWelfareSessions] = useState<number | ''>('');
  const [tourAccompanied, setTourAccompanied] = useState<boolean>(false);

  const calcRate = (numerator: number | '', denominator: number | '') => {
    if (denominator === '' || denominator === 0 || numerator === '') return '-- %';
    return `${Math.round((numerator / denominator) * 100)} %`;
  };

  const evaluateMath = (expr: string): number | '' => {
    if (!expr) return '';
    
    // Convert full-width numbers/symbols to half-width, and symbols like '×' to '*'
    let clean = expr.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/＋/g, '+')
                    .replace(/[ー−]/g, '-')
                    .replace(/＊/g, '*')
                    .replace(/＝/g, '=')
                    .replace(/^=/, '')
                    .replace(/\s+/g, '');
                    
    // Allow numbers, basic operators, and parenthesis
    if (!/^[0-9+\-*/.()]+$/.test(clean)) return '';
    
    try {
      // Evaluate the math expression
      const res = new Function(`return ${clean}`)();
      // Ensure the result is valid
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Math.round(res);
      }
      return '';
    } catch {
      return '';
    }
  };

  const newRevenue = evaluateMath(newRevenueInput);
  const existingRevenue = evaluateMath(existingRevenueInput);
  const newDigestion = evaluateMath(newDigestionInput);
  const existingDigestion = evaluateMath(existingDigestionInput);

  const totalRevenue = (newRevenue || 0) + (existingRevenue || 0);
  const totalDigestion = (newDigestion || 0) + (existingDigestion || 0);

  const calcLTV = (revenue: number | '', count: number | '') => {
    if (count === '' || count === 0 || revenue === '') return '-- 円';
    return `${Math.round(revenue / count).toLocaleString()} 円`;
  };

  const repeatRate = calcRate(nextRes, newVisitors);
  const ticketRate = calcRate(tickets, newVisitors);
  const newLTV = calcLTV(newRevenue, newVisitors);
  const continueRate = calcRate(continuedUsers, ticketFinishers);

  // Validation
  const sumSessions = (newSessions || 0) + (existingSessions || 0) + (welfareSessions || 0);
  const isSessionMismatch = totalSessions !== '' && sumSessions > 0 && totalSessions !== sumSessions;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1>マイページ</h1>
          <div className={styles.userInfo}>
            <span className={`${styles.statusBadge} ${submissionStatus === '提出済' ? styles.statusSubmitted : ''}`}>
              {submissionStatus}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link href="/staff/settings" title="プロフィール設定" className={styles.avatarLink}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={userName} width={36} height={36} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarSmall}>{userName.charAt(0)}</div>
                )}
              </Link>
              <span style={{ fontWeight: '600' }}>{userName}さん</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Link href="/staff/settings" style={{ fontSize: '0.8rem', color: 'var(--secondary-foreground)', textDecoration: 'underline' }}>
                  ⚙️ アカウント設定
                </Link>
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                  <LogoutBtn />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* KGI Progress */}
        <div className={styles.kgiProgress}>
          <div className={styles.kgiHeader}>
            <span className={styles.kgiTitle}>今月のKGI進捗</span>
            <span className={styles.kgiNumbers}>{monthToDateRevenue.toLocaleString()} / {kgiTarget.toLocaleString()} 円</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.min(100, Math.round((monthToDateRevenue / (kgiTarget || 1)) * 100))}%` }}></div>
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        {/* Left Column: Action Plan & Tasks */}
        <section className={styles.leftCol}>
          <div className={`glass-panel ${styles.sectionBox}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.fluidHeading}>{todayStr} のアクションプラン</h2>
              <button className={styles.editBtn} onClick={() => setIsEditingPlan(!isEditingPlan)}>
                {isEditingPlan ? '保存' : '編集'}
              </button>
            </div>
            <div className={styles.planCard}>
              {isEditingPlan ? (
                <textarea 
                  className={styles.planEditor} 
                  value={actionPlanText} 
                  onChange={(e) => setActionPlanText(e.target.value)}
                  rows={3}
                />
              ) : (
                <p className={styles.planText}>{actionPlanText}</p>
              )}
              
              <div className={styles.goalsList}>
                <div className={styles.goalItem}>
                  <span>売上目標</span>
                  {isEditingPlan ? (
                    <input type="number" value={planSalesGoal} onChange={(e) => setPlanSalesGoal(Number(e.target.value))} className={styles.goalEditor} />
                  ) : (
                    <strong>{planSalesGoal.toLocaleString()}円</strong>
                  )}
                </div>
                <div className={styles.goalItem}>
                  <span>新規目標</span>
                  {isEditingPlan ? (
                    <input type="number" value={planNewGoal} onChange={(e) => setPlanNewGoal(Number(e.target.value))} className={styles.goalEditor} />
                  ) : (
                    <strong>{planNewGoal}名</strong>
                  )}
                </div>
                <div className={styles.goalItem}>
                  <span>次回予約目標</span>
                  {isEditingPlan ? (
                    <input type="number" value={planNextResGoal} onChange={(e) => setPlanNextResGoal(Number(e.target.value))} className={styles.goalEditor} />
                  ) : (
                    <strong>{planNextResGoal}名</strong>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={`glass-panel ${styles.sectionBox}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.fluidHeading}>今日のタスク</h2>
              <span className={styles.taskProgressLabel}>
                {tasks.filter(t => t.completed).length} / {tasks.length} 完了
              </span>
            </div>
            <ul className={styles.taskList}>
              {tasks.map(task => (
                <li key={task.id} className={`${styles.taskItem} ${task.completed ? styles.taskItemCompleted : ''}`}>
                  <input 
                    type="checkbox" 
                    id={`t-${task.id}`} 
                    checked={task.completed} 
                    onChange={() => toggleTask(task.id)} 
                  />
                  <label htmlFor={`t-${task.id}`} className={task.completed ? styles.completed : ''}>
                    {task.text}
                  </label>
                  <button className={styles.deleteTaskBtn} onClick={() => handleDeleteTask(task.id)} title="削除">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.addTaskBox}>
              <input 
                type="text" 
                placeholder="新しいタスクを入力..." 
                value={newTaskInput} 
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleAddTask();
                  }
                }}
              />
              <button className={styles.addBtnSolid} onClick={handleAddTask}>追加</button>
            </div>
          </div>
        </section>

        {/* Right Column: Daily Report */}
        <section className={styles.rightCol}>
          <div className={`glass-panel ${styles.sectionBox}`}>
            <div className={styles.sectionHeaderCol}>
              <h2 className={styles.fluidHeading}>{todayStr} の日次数字入力</h2>
              <a href="/staff/history" className={styles.historyLink}>今月の合計・過去履歴を見る &gt;</a>
            </div>
            
            <form className={styles.reportForm}>
              
              <div className={styles.formGroupArea}>
                <h3>新規・リピート</h3>
                <div className={styles.formRow}>
                  <label>今日来店した新規数</label>
                  <input type="number" min="0" placeholder="0" value={newVisitors} onChange={(e) => setNewVisitors(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.formRow}>
                  <label>新規の次回予約人数</label>
                  <input type="number" min="0" placeholder="0" value={nextRes} onChange={(e) => setNextRes(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.formRow}>
                  <label>新規の回数券購入人数</label>
                  <input type="number" min="0" placeholder="0" value={tickets} onChange={(e) => setTickets(e.target.value ? Number(e.target.value) : '')} />
                </div>
                {/* 自動計算プレビュー */}
                <div className={styles.autoCalcBox}>
                  リピート率: <span className={styles.calcHighlight}>{repeatRate}</span> / 
                  回数券購入率: <span className={styles.calcHighlight}>{ticketRate}</span> /
                  新規LTV: <span className={styles.calcHighlight}>{newLTV}</span>
                </div>
              </div>

              <div className={styles.formGroupArea}>
                <h3>売上・消化 <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>(数式 ex: 5000*3+2000)</span></h3>
                
                <div className={styles.formRow}>
                  <label>新規からの売上</label>
                  <div className={styles.calcInputWrapper}>
                    <input type="text" placeholder="=10000+5000" 
                           value={newRevFocused ? newRevenueInput : (newRevenue !== '' ? newRevenue : newRevenueInput)} 
                           onChange={(e) => setNewRevenueInput(e.target.value)} 
                           onFocus={() => setNewRevFocused(true)} 
                           onBlur={() => setNewRevFocused(false)} 
                           className={styles.calcInput} />
                  </div>
                </div>
                
                <div className={styles.formRow}>
                  <label>既存からの売上</label>
                  <div className={styles.calcInputWrapper}>
                    <input type="text" placeholder="=10000+5000" 
                           value={exRevFocused ? existingRevenueInput : (existingRevenue !== '' ? existingRevenue : existingRevenueInput)} 
                           onChange={(e) => setExistingRevenueInput(e.target.value)} 
                           onFocus={() => setExRevFocused(true)} 
                           onBlur={() => setExRevFocused(false)} 
                           className={styles.calcInput} />
                  </div>
                </div>
                
                <div className={styles.formRow}>
                  <label>新規からの消化売上</label>
                  <div className={styles.calcInputWrapper}>
                    <input type="text" placeholder="0" 
                           value={newDigFocused ? newDigestionInput : (newDigestion !== '' ? newDigestion : newDigestionInput)} 
                           onChange={(e) => setNewDigestionInput(e.target.value)} 
                           onFocus={() => setNewDigFocused(true)} 
                           onBlur={() => setNewDigFocused(false)} 
                           className={styles.calcInput} />
                  </div>
                </div>
                
                <div className={styles.formRow}>
                  <label>既存からの消化売上</label>
                  <div className={styles.calcInputWrapper}>
                    <input type="text" placeholder="0" 
                           value={exDigFocused ? existingDigestionInput : (existingDigestion !== '' ? existingDigestion : existingDigestionInput)} 
                           onChange={(e) => setExistingDigestionInput(e.target.value)} 
                           onFocus={() => setExDigFocused(true)} 
                           onBlur={() => setExDigFocused(false)} 
                           className={styles.calcInput} />
                  </div>
                </div>

                <div className={styles.autoCalcBox}>
                  売上合計: <span className={styles.calcHighlight}>{totalRevenue.toLocaleString() || '--'} 円</span> / 
                  消化合計: <span className={styles.calcHighlight}>{totalDigestion.toLocaleString() || '--'} 円</span>
                </div>
              </div>
              
              <div className={styles.formGroupArea}>
                <h3>継続関連</h3>
                <div className={styles.formRow}>
                  <label>回数券終了者数</label>
                  <input type="number" min="0" placeholder="0" value={ticketFinishers} onChange={(e) => setTicketFinishers(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.formRow}>
                  <label>継続数</label>
                  <input type="number" min="0" placeholder="0" value={continuedUsers} onChange={(e) => setContinuedUsers(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.autoCalcBox}>
                  回数券継続率: <span className={styles.calcHighlight}>{continueRate}</span>
                </div>
              </div>

              <div className={styles.formGroupArea}>
                <h3>施術関連</h3>
                <div className={styles.formRow}>
                  <label>今日の総施術数</label>
                  <input type="number" min="0" placeholder="0" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.formRow}>
                  <label>∟ 新規施術数</label>
                  <input type="number" min="0" placeholder="0" value={newSessions} onChange={(e) => setNewSessions(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.formRow}>
                  <label>∟ 既存施術数</label>
                  <input type="number" min="0" placeholder="0" value={existingSessions} onChange={(e) => setExistingSessions(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className={styles.formRow}>
                  <label>∟ 福利厚生施術数</label>
                  <input type="number" min="0" placeholder="0" value={welfareSessions} onChange={(e) => setWelfareSessions(e.target.value ? Number(e.target.value) : '')} />
                </div>
                {isSessionMismatch && (
                  <div style={{ color: 'var(--destructive)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'right' }}>
                    ⚠️ 総施術数と内訳（新規+既存+福利厚生）の合計が一致しません。
                  </div>
                )}
              </div>

              <div className={styles.formGroupArea}>
                <h3>その他</h3>
                <div className={styles.formRow}>
                  <label>ツアー帯同</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="tourChecked" checked={tourAccompanied} onChange={(e) => setTourAccompanied(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                    <label htmlFor="tourChecked" style={{ cursor: 'pointer' }}>帯同した</label>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.saveDraftBtn}>一時保存</button>
                <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? '送信中...' : '提出する'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
