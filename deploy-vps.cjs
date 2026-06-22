const { Client } = require('ssh2');

const deployScript = `
if ! command -v node > /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 > /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

if ! command -v git > /dev/null; then
    echo "Installing Git..."
    apt-get update && apt-get install -y git
fi

vpsProjectPath="/root/xianxia"
if [ ! -d "$vpsProjectPath" ]; then
    echo "=================================================="
    echo "Cloning repository into $vpsProjectPath..."
    echo "=================================================="
    git clone https://mirror.ghproxy.com/https://github.com/oliverhe202018-ctrl/xianxia.git $vpsProjectPath || exit 1
fi

cd $vpsProjectPath || exit 1
git remote set-url origin https://mirror.ghproxy.com/https://github.com/oliverhe202018-ctrl/xianxia.git
echo 'Pulling latest code...'
git pull origin main

echo 'Installing dependencies and building...'
npm install
npm run build

echo 'Restarting PM2 service...'
pm2 describe xianxia-preview > /dev/null
if [ $? -eq 0 ]; then
    pm2 restart xianxia-preview
else
    echo 'Starting new PM2 instance...'
    pm2 start npm --name "xianxia-preview" -- run preview -- --host 0.0.0.0 --port 8080
    pm2 save
fi

echo 'Deployment complete! App should be running on port 8080'
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready, starting deployment...');
  conn.exec(deployScript, { pty: true }, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '180.97.221.225',
  port: 2222, // Trying 2222 first based on city-lord's deploy-vps.ps1
  username: 'root',
  password: 'jUOr9jM709qx'
});
// Handle error (e.g. wrong port)
conn.on('error', (err) => {
    console.error('Connection error with port 2222:', err.message);
    console.log('Retrying with port 22...');
    const conn2 = new Client();
    conn2.on('ready', () => {
      console.log('Client2 :: ready, starting deployment...');
      conn2.exec(deployScript, { pty: true }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
          conn2.end();
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    }).connect({
      host: '180.97.221.225',
      port: 22,
      username: 'root',
      password: 'jUOr9jM709qx'
    });
});
