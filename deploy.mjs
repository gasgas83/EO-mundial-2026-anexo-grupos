import SftpClient from 'ssh2-sftp-client';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const keyPath = process.env.DEPLOY_KEY_PATH || './strapi.pem';

const config = {
  host: process.env.DEPLOY_HOST || '34.207.144.34',
  port: 22,
  username: process.env.DEPLOY_USER || 'ubuntu',
  privateKey: readFileSync(keyPath),
};

const REMOTE_DIR = process.env.DEPLOY_REMOTE_DIR || '/home/ubuntu/strapi-EO-aws/public/eo-widgets/eo-mundial/eo-anexo-grupos/';
const PUBLIC_BASE_URL = 'https://strapi.elobservador.com.uy/eo-widgets/eo-mundial/eo-anexo-grupos';
const EXCLUDED = ['index.html', 'vite.svg'];

// Buscar el entry JS generado en la raiz de dist y escribir snippet.txt
const jsFile = readdirSync('./dist').find((file) => file.endsWith('.js'));
if (!jsFile) {
  console.error('No se encontró el archivo JS en dist/');
  process.exit(1);
}

const snippet = `<script type="module" src="${PUBLIC_BASE_URL}/${jsFile}"></script>
<eo-grupos-mundial td-allow></eo-grupos-mundial>`;
writeFileSync('./snippet.txt', snippet);
console.log(`snippet.txt generado:\n${snippet}\n`);

// Deploy
const sftp = new SftpClient();

console.log(`Conectando a ${config.host}...`);

try {
  await sftp.connect(config);
  console.log('Conectado. Subiendo archivos de ./dist ...');
  await sftp.uploadDir('./dist', REMOTE_DIR, {
    filter: (localPath) => !EXCLUDED.some(f => localPath.endsWith(f)),
  });
  console.log('Deploy completado.');
} catch (err) {
  console.error('Error en el deploy:', err.message);
  process.exit(1);
} finally {
  try {
    await sftp.end();
  } catch {
    // Ignorar errores al cerrar si la conexión no llegó a abrirse.
  }
}
