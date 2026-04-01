function attachRuntimeMonitor(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('/_next/webpack-hmr')) return;
    consoleErrors.push(text);
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      errorText: failure?.errorText || 'Unknown network failure',
    });
  });

  return {
    consoleErrors,
    pageErrors,
    failedRequests,
  };
}

module.exports = {
  attachRuntimeMonitor,
};
