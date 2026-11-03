const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

const generateToken = (payload, expiresIn = jwtConfig.expiresIn) => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
