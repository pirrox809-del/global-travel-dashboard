#!/usr/bin/env bash
# Adaptive brief-generation loop for the live cron route.
# One country per call; honours Groq's TPD/TPM retry hints; after every
# successful generation waits for the Vercel deploy of the committed DB
# to finish before firing the next call (avoids duplicate work started
# from a stale deployment).
# Usage: REFRESH_KEY=... GH_TOKEN=... bash scripts/brief-loop.sh <max_runs>
set -u
KEY="${REFRESH_KEY:?set REFRESH_KEY}"
TOKEN="${GH_TOKEN:?set GH_TOKEN}"
REPO="pirrox809-del/global-travel-dashboard"
BASE="https://global-travel-dashboard.vercel.app/api/cron/refresh"
MAX_RUNS="${1:-8}"
LOG="${LOGFILE:-/tmp/brief-loop.log}"

# Wait until the Vercel check runs for the current HEAD are all completed
# (max 12 tries x 20s). Never fails the loop on timeout.
wait_deploy() {
  for i in $(seq 1 12); do
    OUT=$(curl -s -H "Authorization: Bearer $TOKEN" \
      "https://api.github.com/repos/$REPO/commits/main/check-runs?per_page=20" --max-time 20)
    if printf '%s' "$OUT" | grep -q '"check_runs"'; then
      DONE=$(printf '%s' "$OUT" | node -e "
        let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
          try{const j=JSON.parse(d);const rs=(j.check_runs||[]).filter(r=>/vercel/i.test(r.name));
          if(rs.length===0){console.log('none');return;}
          const busy=rs.some(r=>r.status!=='completed');
          const ok=rs.every(r=>r.conclusion==='success'||r.conclusion==='skipped');
          console.log(busy?'busy':(ok?'done':'failed'));
          }catch(e){console.log('unknown')}" 2>/dev/null)
      case "$DONE" in
        done|none|failed) echo "deploy:$DONE"; return ;;
      esac
    fi
    sleep 20
  done
  echo "deploy:timeout"
}

for run in $(seq 1 "$MAX_RUNS"); do
  R=$(curl -s "${BASE}?key=${KEY}&batch=1" --max-time 115)
  LINE=$(printf '%s' "$R" | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c).on('end',()=>{
      try {
        const j=JSON.parse(d);
        const r=(j.refreshed&&j.refreshed[0])||{};
        const tot=j.status?.withContent??'?';
        const msg=r.ok?'ok':((r.error||'unknown').replace(/\\\\n/g,' ').slice(0,120));
        console.log(r.code+' '+(r.ok?'ok:true':'ok:false')+' tot='+tot+' | '+msg);
      } catch(e) { console.log('parse-fail: '+d.slice(0,120)); }
    });" 2>/dev/null)
  STAMP=$(date +%H:%M:%S)
  echo "[$STAMP] run $run/$MAX_RUNS: $LINE" | tee -a "$LOG"

  case "$LINE" in
    *"ok:true"*)
      D=$(wait_deploy)
      echo "[$(date +%H:%M:%S)] $D" | tee -a "$LOG"
      case "$D" in
        deploy:done) sleep 8 ;;
        *) sleep 40 ;;
      esac
      ;;
    *"ok:false"*)
      WAIT=$(printf '%s' "$R" | grep -oE 'try again in [0-9]+m[0-9.]+s|try again in [0-9.]+s' | head -1)
      case "$WAIT" in
        *"m"*"s")
          M=$(printf '%s' "$WAIT" | sed -E 's/.*in ([0-9]+)m.*/\1/')
          S=$(printf '%s' "$WAIT" | sed -E 's/.*m([0-9.]+)s/\1/')
          TOTAL=$(awk "BEGIN{print int($M*60+$S+15)}")
          ;;
        *"s")
          S=$(printf '%s' "$WAIT" | sed -E 's/.*in ([0-9.]+)s/\1/')
          TOTAL=$(awk "BEGIN{print int($S+15)}")
          ;;
        *)
          TOTAL=60
          ;;
      esac
      if [ "$TOTAL" -gt 240 ]; then TOTAL=240; fi
      sleep "$TOTAL"
      ;;
    *)
      sleep 45
      ;;
  esac
done
echo "loop finished ($MAX_RUNS runs)" | tee -a "$LOG"
