. env.sh

echo deploy $(pwd) to $STREAM_DOT_URL at $STREAM_DOT_REMOTE

ssh-copy-id $STREAM_DOT_USER_HOST
ssh -t $STREAM_DOT_USER_HOST "mkdir -p $STREAM_DOT_REMOTE_PATH"
rsync -avz --rsh="ssh -p22" $(pwd)/ $STREAM_DOT_REMOTE --delete

ssh -t $STREAM_DOT_ADMIN_HOST bash -ilc "\"cd $STREAM_DOT_REMOTE_PATH && npx pm2 restart stream && npx yarn logs\""
