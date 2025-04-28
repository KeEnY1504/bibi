import ExchangeRates from '../../components/ExchangeRates'
import { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const EXCHANGES = [
    {
      name: 'Binance',
      api: 'https://api.binance.com/api/v3/ticker/price',
      pairs: {
        BTC: 'BTCUSDT',
        ETH: 'ETHUSDT',
        USDT: 'BUSDUSDT',
        LTC: 'LTCUSDT',
        XRP: 'XRPUSDT',
        TON: 'TONUSDT',
        SOLANA: 'SOLUSDT',
      },
      parser: (data) => parseFloat(data.price),
    },
    {
      name: 'Bybit',
      api: 'https://api.bybit.com/v5/market/tickers',
      params: { category: 'spot' },
      pairs: {
        BTC: 'BTCUSDT',
        ETH: 'ETHUSDT',
        USDT: 'USDCUSDT',
        LTC: 'LTCUSDT',
        XRP: 'XRPUSDT',
        TON: 'TONUSDT',
        SOLANA: 'SOLUSDT',
      },
      parser: (data, symbol) => {
        if (!data.result || !data.result.list) {
          console.error(`Bybit API response error:`, data);
          return 0;
        }
        const ticker = data.result.list.find((t) => t.symbol === symbol);
        return ticker ? parseFloat(ticker.lastPrice) : 0;
      },
    },
    {
      name: 'HTX (Huobi)',
      api: 'https://api.huobi.pro/market/tickers/',
      pairs: {
        BTC: 'btcusdt',
        ETH: 'ethusdt',
        USDT: 'usdtusd',
        LTC: 'ltcusdt',
        XRP: 'xrpusdt',
        TON: 'tonusdt',
        SOLANA: 'solusdt',
      },
      parser: (data) => {
        if (!data?.data) {
          console.error('HTX API Error:', data);
          return () => 0;
        }
        return (symbol) => {
          const ticker = data.data.find((t) => t.symbol.toLowerCase() === symbol);
          return ticker ? ticker.close : 0;
        };
      },
    },
    {
      name: 'Telegram Wallet (TON)',
      api: 'https://tonapi.io/v2/rates',
      params: {
        tokens: 'ton',
        currencies: 'usd',
      },
      pairs: {
        TON: 'ton',
        SOLANA: 'solana',
        BTC: 'btc',
        ETH: 'eth',
        USDT: 'usdt',
        LTC: 'ltc',
        XRP: 'xrp',
      },
      parser: (data) => {
        if (!data?.rates?.TON?.prices?.USD) {
          console.error('TON API Error:', data);
          return () => 0;
        }
        return () => data.rates.TON.prices.USD;
      },
    },
  ];
  const CRYPTOS = ['BTC', 'ETH', 'USDT', 'SOLANA', 'TON', 'XRP', 'LTC'];
export default function Page1() {
      const [rates, setRates] = useState([]);
      const [loading, setLoading] = useState(true);
    
      const fetchExchangeData = async (exchange) => {
        try {
          const results = await Promise.all(
            CRYPTOS.map(async (crypto) => {
              if (!exchange.pairs[crypto]) {
                return { crypto, price: 0 };
              }
    
              const symbol = exchange.pairs[crypto];
              try {
                const response = await axios({
                  method: 'get',
                  url: exchange.api,
                  params: exchange.params || { symbol },
                  timeout: 5000,
                });
    
                if (!response?.data || response.status !== 200) {
                  console.error(`${exchange.name} ${crypto} invalid response:`, response);
                  return { crypto, price: 0 };
                }
    
                let price;
                if (typeof exchange.parser(response.data) === 'function') {
                  price = exchange.parser(response.data)(symbol);
                } else {
                  price = exchange.parser(response.data, symbol);
                }
    
                return { crypto, price: isNaN(price) ? 0 : price };
              } catch (error) {
                console.error(`${exchange.name} ${crypto} error:`, error.message);
                return { crypto, price: 0 };
              }
            }),
          );
    
          return results.reduce(
            (acc, { crypto, price }) => ({
              ...acc,
              [crypto]: { price, note: crypto === 'USDT' ? 'Stablecoin pair' : '' },
            }),
            { name: exchange.name },
          );
        } catch (error) {
          console.error(`${exchange.name} global error:`, error);
          return null;
        }
      };
    
      useEffect(() => {
        let isMounted = true;
    
        const fetchData = async () => {
          try {
            const data = await Promise.all(EXCHANGES.map((ex) => fetchExchangeData(ex)));
            if (isMounted) {
              setRates(data.filter(Boolean));
            }
          } catch (error) {
            console.error('Global error:', error);
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        };
    
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => {
          isMounted = false;
          clearInterval(interval);
        };
      }, []);
    
      return (
        <div className="container py-4">
          <h1 className="text-center mb-4">Crypto Exchange Rates</h1>
          <ExchangeRates rates={rates} loading={loading} cryptos={CRYPTOS} />
        </div>
      );
}