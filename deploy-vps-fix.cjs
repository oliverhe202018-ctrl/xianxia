const { Client } = require('ssh2');

const deployScript = `
echo 'Killing hanging git processes...'
killall git || true
rm -rf /root/xianxia

vpsProjectPath="/root/xianxia"
echo "=================================================="
echo "Cloning repository directly from github..."
echo "=================================================="
git clone https://github.com/oliverhe202018-ctrl/xianxia.git $vpsProjectPath || exit 1

cd $vpsProjectPath || exit 1

echo 'Installing dependencies and building...'
npm ci --legacy-peer-deps || npm install --legacy-peer-deps
chmod -R 777 node_modules/.bin || true
npm run build || npx vite build

echo 'Restarting PM2 service...'
pm2 describe xianxia-preview > /dev/null
if [ $? -eq 0 ]; then
    pm2 delete xianxia-preview
fi
echo 'Starting new PM2 instance...'
pm2 start npm --name "xianxia-preview" -- run preview -- --host 0.0.0.0 --port 8080
pm2 save

echo 'Deployment complete! App should be running on port 8080'
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready, starting deployment without ghproxy...');
  conn.exec(deployScript, { pty: true }, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '180.97.221.225',
  port: 2222,
  username: 'root',
  password: 'jUOr9jM709qx'
});
conn.on('error', (err) => {
    console.error('Connection error with port 2222:', err.message);
});
