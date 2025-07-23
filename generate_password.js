const bcrypt = require('bcrypt');

async function generateHash() {
    const password = '123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Mật khẩu đã mã hóa:', hash);
}

generateHash(); 