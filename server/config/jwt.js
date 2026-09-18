module.exports = {
  secret: process.env.JWT_SECRET || "freight_contract_jwt_secret",
  expiresIn: process.env.JWT_EXPIRES_IN || "1d",
};
