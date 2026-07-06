const bcrypt = require('bcryptjs');

const hashPassword = (password) => bcrypt.hashSync(password, 12);
const comparePassword = (password, hash) => bcrypt.compareSync(password, hash);
const generateAvatar = (name) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
};

module.exports = { hashPassword, comparePassword, generateAvatar };