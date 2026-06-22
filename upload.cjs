const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP :: ready. Uploading deploy.zip...');
    
    // First ensure the directory exists
    conn.exec('mkdir -p /root/xianxia', (err, stream) => {
        stream.on('close', () => {
            sftp.fastPut('deploy.zip', '/root/xianxia/deploy.zip', (err) => {
              if (err) throw err;
              console.log('Upload complete. Extracting and starting server...');
              
              const deployScript = `
              cd /root/xianxia
              apt-get update && apt-get install -y unzip
              unzip -o deploy.zip
              npm install --legacy-peer-deps
              
              pm2 describe xianxia-preview > /dev/null
              if [ $? -eq 0 ]; then
                  pm2 delete xianxia-preview
              fi
              pm2 start npm --name "xianxia-preview" -- run preview -- --host 0.0.0.0 --port 8080
              pm2 save
              echo "Deployment successful!"
              `;
              
              conn.exec(deployScript, { pty: true }, (err, stream) => {
                  if (err) throw err;
                  stream.on('close', (code, signal) => {
                      console.log('Stream :: close :: code: ' + code);
                      conn.end();
                  }).on('data', (data) => {
                      process.stdout.write(data.toString());
                  }).stderr.on('data', (data) => {
                      process.stderr.write(data.toString());
                  });
              });
            });
        });
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
