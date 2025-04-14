const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Прокси для HTX (Huobi)
  app.use(
    '/huobi-api',
    createProxyMiddleware({
      target: 'https://api.huobi.pro',
      changeOrigin: true,
      pathRewrite: { '^/huobi-api': '' },
    }),
  );

  // Остальные прокси (Bybit, TON API и т.д.)
  app.use(
    '/bybit-api',
    createProxyMiddleware({
      target: 'https://api.bybit.com',
      changeOrigin: true,
      pathRewrite: { '^/bybit-api': '' },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    }),
  );

  // Добавьте это в файл setupProxy.js
  app.use(
    '/ton-api',
    createProxyMiddleware({
      target: 'https://tonapi.io',
      changeOrigin: true,
      pathRewrite: {
        '^/ton-api': '/v2', // ← Исправленный путь
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
  );
};
