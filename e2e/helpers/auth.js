async function loginAsHQ(page) {
  await page.goto('about:blank');
}

async function loginAsCustomer(page) {
  await page.goto('about:blank');
}

module.exports = {
  loginAsHQ,
  loginAsCustomer,
};
