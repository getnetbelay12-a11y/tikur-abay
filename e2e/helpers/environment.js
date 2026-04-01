const adminBaseUrl = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:6010';
const customerBaseUrl = process.env.CUSTOMER_BASE_URL || 'http://127.0.0.1:6011';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';

module.exports = {
  adminBaseUrl,
  customerBaseUrl,
  apiBaseUrl,
};
