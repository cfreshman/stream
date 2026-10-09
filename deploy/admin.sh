. env.sh

echo configure $CMD_URL from $(pwd)/deploy/nginx to $CMD_ADMIN_HOST:$CMD_ADMIN_PATH

ssh-copy-id $CMD_ADMIN_HOST
rsync -avz --rsh="ssh -p22" $(pwd)/deploy/nginx/ $CMD_ADMIN_HOST:$CMD_ADMIN_PATH --delete

echo "$CMD_ADMIN_PATH/ -> /etc/nginx/sites-available/cmd"
ssh -t $CMD_ADMIN_HOST "sudo rm -rf /etc/nginx/sites-available/cmd && sudo cp -rf $CMD_ADMIN_PATH /etc/nginx/sites-available/ && sudo ln -s /etc/nginx/sites-available/cmd/index /etc/nginx/sites-enabled/cmd; sudo nginx -t"

ssh-copy-id $CMD_USER_HOST || ssh -t $CMD_ADMIN_HOST "sudo mkdir -p /home/cmd/.ssh && sudo cp .ssh/authorized_keys /home/cmd/.ssh/authorized_keys && sudo chown cmd:cmd /home/cmd/.ssh && sudo chown cmd:cmd /home/cmd/.ssh/authorized_keys"
ssh -t $CMD_ADMIN_HOST bash -ilc "\"cd $CMD_REMOTE_PATH && sudo npx yarn && sudo npx yarn pm2\""
