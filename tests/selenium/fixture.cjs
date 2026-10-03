// Prepara una cuenta exclusiva para la prueba; nunca modifica cuentas existentes.
const path = require('path');
const root = path.resolve(__dirname, '../..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const pool = require(path.join(root,'backend/src/config/db'));
const bcrypt = require(path.join(root,'backend/node_modules/bcryptjs'));
(async()=>{try{
 const email=process.env.E2E_EMAIL;
 if(!/^selenium-[a-f0-9-]+@example\.invalid$/.test(email||'')) throw Error('Cuenta temporal invalida');
 if(process.argv[2]==='cleanup') {
   await pool.query('DELETE FROM usuarios WHERE email=$1',[email]);
 } else {
   await pool.query("INSERT INTO usuarios(nombre,email,password,rol,activo) VALUES ($1,$2,$3,'admin',TRUE)",['Prueba Selenium',email,await bcrypt.hash(process.env.E2E_PASSWORD,10)]);
 }
}finally{await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1});
