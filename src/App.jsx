import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExchangeRates from './components/ExchangeRates';
import 'bootstrap/dist/css/bootstrap.min.css';

const EXCHANGES = [
  {
    name: 'Binance',
    api: 'https://api.binance.com/api/v3/ticker/price',
    pairs: { BTC: 'BTCUSDT', ETH: 'ETHUSDT', USDT: 'BUSDUSDT', LTC: 'LTCUSDT', XRP: 'XRPUSDT', DOT: 'DOTUSDT' },
    parser: data => parseFloat(data.price)
  },
  {
    name: 'Bybit',
    api: 'https://api.bybit.com/v5/market/tickers',
    params: { category: 'spot' },
    pairs: { BTC: 'BTCUSDT', ETH: 'ETHUSDT', USDT: 'USDCUSDT', LTC: 'LTCUSDT', XRP: 'XRPUSDT', DOT: 'DOTUSDT' },
    parser: (data, symbol) => {
      if (!data.result || !data.result.list) {
        console.error(`Bybit API response error:`, data);
        return 0;
      }
      const ticker = data.result.list.find(t => t.symbol === symbol);
      return ticker ? parseFloat(ticker.lastPrice) : 0;
    }
  }
];

const CRYPTOS = ['BTC', 'ETH', 'USDT', 'LTC', 'XRP', 'DOT'];

const App = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExchangeData = async (exchange) => {
    try {
      const results = await Promise.all(
        CRYPTOS.map(async (crypto) => {
          const symbol = exchange.pairs[crypto];
          try {
            const response = await axios({
              method: 'get',
              url: exchange.api,
              params: { ...exchange.params, symbol },
              timeout: 5000
            });

            if (response.status !== 200) return { crypto, price: 0 };
            
            const price = exchange.parser(response.data, symbol);
            return { crypto, price: isNaN(price) ? 0 : price };
            
          } catch (error) {
            console.error(`${exchange.name} ${crypto} error:`, error.message);
            return { crypto, price: 0 };
          }
        })
      );

      return results.reduce((acc, { crypto, price }) => ({
        ...acc,
        [crypto]: { price, note: crypto === 'USDT' ? 'Stablecoin pair' : '' }
      }), { name: exchange.name });

    } catch (error) {
      console.error(`${exchange.name} global error:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await Promise.all(
          EXCHANGES.map(ex => fetchExchangeData(ex))
        );
        setRates(data.filter(Boolean));
      } catch (error) {
        console.error('Global error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container py-4">
      <h1 className="text-center mb-4">Crypto Exchange Rates</h1>
      <ExchangeRates rates={rates} loading={loading} cryptos={CRYPTOS} />
    </div>
  );
};

export default App;