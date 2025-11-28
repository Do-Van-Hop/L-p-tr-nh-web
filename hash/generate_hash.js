// generate-hash.js
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Nhập username: ', (username) => {
  rl.question('Nhập password: ', async (password) => {
    try {
      const hash = await bcrypt.hash(password, 12);
      
      console.log('\n✅ Kết quả:');
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('Hash:', hash);
      console.log('\n📋 SQL query:');
      console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = '${username}';`);
      
    } catch (error) {
      console.error('❌ Lỗi:', error);
    } finally {
      rl.close();
    }
  });
  });