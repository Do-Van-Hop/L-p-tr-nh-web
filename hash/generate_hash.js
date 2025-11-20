// generate-hash.js
const bcrypt = require('bcrypt');

bcrypt.hash('Admin@123', 12).then(hash => {
  console.log('Copy hash này:');
  console.log(hash);
  console.log('\nSQL query:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'manager';`);
});