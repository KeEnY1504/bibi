const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/bybit-api',
    createProxyMiddleware({
      target: 'https://api.bybit.com',
      changeOrigin: true,
      pathRewrite: { '^/bybit-api': '' },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET'
      }
    })
  );
};