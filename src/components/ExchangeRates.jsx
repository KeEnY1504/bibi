import React from 'react';
import { Card, Spinner, Table } from 'react-bootstrap';

const ExchangeRates = ({ rates, loading, cryptos }) => {
  const findBestRate = (crypto) => {
    const prices = rates.map(ex => ex[crypto]?.price || 0);
    return Math.max(...prices);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading exchange rates...</p>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {rates.map(exchange => (
        <div key={exchange.name} className="col-md-6 col-xl-4">
          <Card className="w-500 h-100 shadow">
            <Card.Header className="bg-dark text-white">
              <h5 className="mb-0">{exchange.name}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover className="mb-0">
                <tbody>
                  {cryptos.map(crypto => {
                    const price = exchange[crypto]?.price || 0;
                    const isBest = price === findBestRate(crypto);
                    
                    return (
                      <tr key={`${exchange.name}-${crypto}`}>
                        <td>{crypto}</td>
                        <td className="text-end">
                          <span className={`${isBest ? 'text-success fw-bold' : ''}`}>
                            ${price.toFixed(2)}
                          </span>
                          {exchange[crypto]?.note && (
                            <div className="text-muted small">{exchange[crypto].note}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default ExchangeRates;