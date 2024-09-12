#!/bin/sh

USERNAME=root
HOST=foliospot.io
REMOTE=$USERNAME@$HOST
CLIENT_DIR=/var/www/public
SERVER_DIR=/root/server-build

echo "Deploying to $IP"

cd client
npm run build
rsync -urv build/ $REMOTE:$CLIENT_DIR
cd ..

scp server/main.go server/go.mod server/go.sum $REMOTE:$SERVER_DIR
ssh -l $USERNAME $HOST "cd $SERVER_DIR ; go build"