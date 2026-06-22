const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP :: ready. Creating directory...');
    
    // ignore error if exists
    sftp.mkdir('/root/xianxia', (err) => {
      console.log('Directory ensured. Uploading file...');
      
      const readStream = fs.createReadStream('deploy.zip');
      const writeStream = sftp.createWriteStream('/root/xianxia/deploy.zip');
      
      writeStream.on('close', () => {
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
            stream.on('close', (code) => {
                console.log('Deployment stream closed with code: ' + code);
                conn.end();
            }).on('data', (data) => {
                process.stdout.write(data.toString());
            }).stderr.on('data', (data) => {
                process.stderr.write(data.toString());
            });
        });
      });
      
      writeStream.on('error', (err) => {
         console.error('SFTP Write Error:', err);
         conn.end();
      });
      
      readStream.pipe(writeStream);
    });
  });
}).connect({
  host: '180.97.221.225',
  port: 2222,
  username: 'root',
  password: 'jUOr9jM709qx'
});

conn.on('error', (err) => {
    console.error('Connection error:', err.message);
});
