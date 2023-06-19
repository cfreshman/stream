. env.sh

echo configure $STREAM_DOT_URL from $(pwd)/deploy/nginx to $STREAM_DOT_ADMIN_HOST:$STREAM_DOT_ADMIN_PATH

ssh-copy-id $STREAM_DOT_ADMIN_HOST
rsync -avz --rsh="ssh -p22" $(pwd)/deploy/nginx/ $STREAM_DOT_ADMIN_HOST:$STREAM_DOT_ADMIN_PATH --delete

echo "$STREAM_DOT_ADMIN_PATH/ -> /etc/nginx/sites-available/stream"
ssh -t $STREAM_DOT_ADMIN_HOST "sudo rm -rf /etc/nginx/sites-available/stream && sudo cp -rf $STREAM_DOT_ADMIN_PATH /etc/nginx/sites-available/ && sudo ln -s /etc/nginx/sites-available/stream/index /etc/nginx/sites-enabled/stream; sudo nginx -t"

ssh-copy-id $STREAM_DOT_USER_HOST || ssh -t $STREAM_DOT_ADMIN_HOST "sudo mkdir -p /home/stream/.ssh && sudo cp .ssh/authorized_keys /home/stream/.ssh/authorized_keys && sudo chown stream:stream /home/stream/.ssh && sudo chown stream:stream /home/stream/.ssh/authorized_keys"
ssh -t $STREAM_DOT_ADMIN_HOST bash -ilc "\"cd $STREAM_DOT_REMOTE_PATH && sudo npx yarn && sudo npx yarn pm2\""
