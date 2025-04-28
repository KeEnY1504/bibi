import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Table, Spinner, Alert, Button, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

// Конфигурация
const CONFIG = {
  API: {
    UPBIT: 'https://api.upbit.com/v1',
    BINANCE: 'https://api.binance.com/api/v3',
  },
  UPDATE_INTERVAL: 5000, // Интервал обновления в миллисекундах (30 секунд)
  ARBITRAGE_THRESHOLD: 1, // Порог арбитража в %
  COMMISSION: {
    UPBIT: 0.05, // Комиссия Upbit (в процентах)
    BINANCE: 0.1, // Комиссия Binance (в процентах)
  },
  DEFAULT_KRW_RATE: 1350, // Курс KRW по умолчанию
};

const UpbitBinanceArbitrageScanner = () => {
  // Состояния
  const [state, setState] = useState({
    data: [],
    loading: true,
    error: null,
    krwRate: CONFIG.DEFAULT_KRW_RATE,
    pairs: [],
    showModal: false,
    selectedPair: null,
  });

  // Мемоизированные функции
  const fetchUpbitMarkets = useCallback(async () => {
    try {
      const { data } = await axios.get(`${CONFIG.API.UPBIT}/market/all`);
      return data
        .filter((market) => market.market.startsWith('KRW-'))
        .map((market) => market.market);
    } catch (error) {
      console.error('Не удалось получить список рынков Upbit:', error);
      throw error;
    }
  }, []);

  const fetchKrwRate = useCallback(async () => {
    try {
      const [btcUsdt, btcKrw] = await Promise.all([
        axios.get(`${CONFIG.API.BINANCE}/ticker/price?symbol=BTCUSDT`),
        axios.get(`${CONFIG.API.UPBIT}/ticker?markets=KRW-BTC`),
      ]);

      return parseFloat(btcKrw.data[0].trade_price) / parseFloat(btcUsdt.data.price);
    } catch (error) {
      console.error('Не удалось получить курс KRW:', error);
      return CONFIG.DEFAULT_KRW_RATE;
    }
  }, []);

  const fetchPrices = useCallback(async (pairs, rate) => {
    try {
      const [upbitRes, binanceRes] = await Promise.all([
        axios.get(`${CONFIG.API.UPBIT}/ticker?markets=${pairs.join(',')}`),
        axios.get(
          `${CONFIG.API.BINANCE}/ticker/price?symbols=${JSON.stringify(
            pairs.map((p) => p.replace('KRW-', '') + 'USDT'),
          )}`,
        ),
      ]);

      return upbitRes.data
        .map((item) => {
          const symbol = item.market.replace('KRW-', '') + 'USDT';
          const binanceItem = binanceRes.data.find((b) => b.symbol === symbol);
          if (!binanceItem) return null;

          const upbitPrice = item.trade_price / rate;
          const binancePrice = parseFloat(binanceItem.price);
          const netDifference = calculateNetDifference(upbitPrice, binancePrice);

          return {
            symbol,
            upbitPrice,
            binancePrice,
            difference: netDifference.rawDifference.toFixed(2),
            netDifference: netDifference.netDifference.toFixed(2),
            isProfitable: netDifference.isProfitable,
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Не удалось получить цены:', error);
      throw error;
    }
  }, []);

  // Расчет чистой разницы с учетом комиссий
  const calculateNetDifference = (upbitPrice, binancePrice) => {
    const rawDifference = ((upbitPrice - binancePrice) / binancePrice) * 100;

    // Учитываем комиссии при арбитраже
    const buyCommission = CONFIG.COMMISSION.BINANCE / 100;
    const sellCommission = CONFIG.COMMISSION.UPBIT / 100;
    const totalCommission = buyCommission + sellCommission;

    const netDifference = rawDifference - totalCommission;
    const isProfitable = Math.abs(netDifference) > CONFIG.ARBITRAGE_THRESHOLD;

    return { rawDifference, netDifference, isProfitable };
  };

  // Основная функция обновления данных
  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [markets, rate] = await Promise.all([fetchUpbitMarkets(), fetchKrwRate()]);

      // Фильтруем только популярные пары
      const pairs = markets.filter((pair) =>
        ['KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-SOL'].includes(pair),
      );

      if (pairs.length === 0) {
        throw new Error('Не найдено действующих торговых пар');
      }

      const data = await fetchPrices(pairs, rate);

      setState((prev) => ({
        ...prev,
        data,
        pairs,
        krwRate: rate,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
    }
  }, [fetchUpbitMarkets, fetchKrwRate, fetchPrices]);

  // Эффекты
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, CONFIG.UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Обработчики
  const handleTradeClick = (pair) => {
    setState((prev) => ({
      ...prev,
      showModal: true,
      selectedPair: pair,
    }));
  };

  const handleCloseModal = () => {
    setState((prev) => ({
      ...prev,
      showModal: false,
      selectedPair: null,
    }));
  };

  // Рендер
  return (
    <div className="container py-4">
      <h2 className="text-center mb-4">Сканер арбитража Upbit/Binance</h2>

      <div className="d-flex justify-content-between mb-3">
        <div>
          <span className="badge bg-primary me-2">KRW/USDT: {state.krwRate.toFixed(2)}</span>
          <span className="badge bg-secondary me-2">
            Комиссия: Binance {CONFIG.COMMISSION.BINANCE}% / Upbit {CONFIG.COMMISSION.UPBIT}%
          </span>
          <span className="badge bg-info">Порог: {CONFIG.ARBITRAGE_THRESHOLD}%</span>
        </div>
        <Button variant="outline-primary" size="sm" onClick={fetchData} disabled={state.loading}>
          {state.loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <i className="bi bi-arrow-clockwise"></i>
          )}{' '}
          Обновить
        </Button>
      </div>

      {state.loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Загрузка данных...</p>
        </div>
      ) : state.error ? (
        <Alert variant="danger" className="mt-3">
          <i className="bi bi-exclamation-triangle-fill"></i> Ошибка: {state.error}
          <Button variant="outline-danger" size="sm" className="ms-3" onClick={fetchData}>
            Повторить
          </Button>
        </Alert>
      ) : (
        <>
          <Table striped bordered hover responsive className="mt-3">
            <thead className="table-dark">
              <tr>
                <th>Пара</th>
                <th>Цена на Upbit (USDT)</th>
                <th>Цена на Binance (USDT)</th>
                <th>Грубая разница</th>
                <th>Чистая разница</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((item, index) => (
                <tr key={index} className={item.isProfitable ? 'table-warning' : ''}>
                  <td>{item.symbol}</td>
                  <td>${item.upbitPrice.toFixed(2)}</td>
                  <td>${item.binancePrice.toFixed(2)}</td>
                  <td className={item.difference > 0 ? 'text-success' : 'text-danger'}>
                    {item.difference}%
                  </td>
                  <td className={item.netDifference > 0 ? 'text-success' : 'text-danger'}>
                    {item.netDifference}%
                  </td>
                  <td>
                    {item.isProfitable && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleTradeClick(item)}
                        disabled={state.loading}>
                        Выполнить арбитраж
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
      <div className="mt-4 p-3 bg-light rounded">
        <h5>
          <i className="bi bi-info-circle"></i> Как использовать:
        </h5>
        <ul>
          <li>
            <strong>Положительный %</strong> - Цена выше на Upbit (продавайте на Upbit, покупайте на
            Binance)
          </li>
          <li>
            <strong>Отрицательный %</strong> - Цена выше на Binance (покупайте на Upbit, продавайте
            на Binance)
          </li>
          <li>
            <strong>Чистая разница</strong> учитывает торговые комиссии (Binance:{' '}
            {CONFIG.COMMISSION.BINANCE}%, Upbit: {CONFIG.COMMISSION.UPBIT}%)
          </li>
          <li>
            Возможности арбитража выделены, когда чистая разница превышает
            {CONFIG.ARBITRAGE_THRESHOLD}%
          </li>
        </ul>
      </div>

      {/* Модальное окно для торговли */}
      <Modal show={state.showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Выполнение арбитражной сделки</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {state.selectedPair && (
            <div>
              <h5>Пара: {state.selectedPair.symbol}</h5>
              <p>
                <strong>Возможность:</strong> {state.selectedPair.netDifference}% после учета
                комиссии
              </p>
              <p>
                <strong>Рекомендуемое действие:</strong>
                {state.selectedPair.netDifference > 0 ? (
                  <span className="text-success">Продавать на Upbit, покупать на Binance</span>
                ) : (
                  <span className="text-danger">Покупать на Upbit, продавать на Binance</span>
                )}
              </p>
              <Alert variant="warning">
                <i className="bi bi-exclamation-triangle"></i> Это симуляция. Реальная торговля
                требует ключей API и надлежащего управления рисками.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleCloseModal}>
            Подтвердить сделку (симуляция)
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UpbitBinanceArbitrageScanner;
