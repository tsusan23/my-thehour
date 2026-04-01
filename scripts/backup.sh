#!/bin/bash

# 定期バックアップ用スクリプト
# cronに登録して使用することを目的としています。
# 例: 毎日深夜2時に実行する場合:
# 0 2 * * * /path/to/clinic-management-app/scripts/backup.sh

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
BACKUP_DIR="${APP_DIR}/backups"
DB_FILE="${APP_DIR}/prisma/dev.db"

# バックアップディレクトリが存在しない場合は作成
mkdir -p "$BACKUP_DIR"

# タイムスタンプの生成 (例: 20260401_020000)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dev_backup_${TIMESTAMP}.db"

# DBファイルが存在するか確認してからコピー
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "[$(date)] ✅ バックアップ成功: ${BACKUP_FILE}"
    
    # 任意: 古いバックアップを削除（例: 30日以上前のものを削除）
    find "$BACKUP_DIR" -name "dev_backup_*.db" -type f -mtime +30 -exec rm {} \;
    echo "[$(date)] 🧹 30日より古いバックアップをクリーンアップしました。"
else
    echo "[$(date)] ❌ エラー: DBファイルが見つかりません (${DB_FILE})"
    exit 1
fi
