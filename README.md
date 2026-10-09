[cmd-landing.uh.software](https://uh.software/raw/cmd-landing)

# dev
```
yarn dev
```

# prod
- find a computer that'll stay on all the time (or use VirtualBox) and install Ubuntu 22
- figure out the IP and edit .env
```
CMD_HOST=<IP>
```
```
yarn ssh
```
```
sudo apt update
sudo apt install nginx
sudo $(ufw enable && ufw allow 22 && ufw allow 80 && ufw allow 443)
sudo adduser cmd
exit
```
