[freshman.dev/raw/stream-landing](https://freshman.dev/raw/stream-landing)

It's like html VSCO

Tell me if you start using it!

Create your own without a server using Glitch: [remix me](https://glitch.com/~far-melted-stork)

# dev
```
yarn dev
```

![](https://freshman.dev/api/file/public-stream.png)

# prod
- find a computer that'll stay on all the time (or use VirtualBox) and install Ubuntu 22
- figure out the IP and edit .env
```
STREAM_DOT_HOST=<IP>
```
```
yarn ssh
```
```
sudo apt update
sudo apt install nginx
sudo $(ufw enable && ufw allow 22 && ufw allow 80 && ufw allow 443)
sudo adduser stream
exit
```
```
yarn admin
yarn deploy
```
add IP to deploy/nginx/index
if you have a domain, add 'A' record for stream.<domain> with IP

```
... idk I'll finish this later. you'll at least need to install Node.js v20
```
