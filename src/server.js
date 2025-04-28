const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const app = express();

app.use(cors());

// Эндпоинт для получения данных с appbit.net
app.get('/api/dex-prices', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.goto('https://appbit.net/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Ждем загрузки нужных элементов (настройте селекторы под актуальную структуру сайта)
    await page.waitForSelector('.market-table', { timeout: 5000 });
    
    const dexData = await page.evaluate(() => {
      const pairs = [];
      // Настройте селекторы под актуальную структуру appbit.net
      document.querySelectorAll('.market-table tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          pairs.push({
            pair: cells[0].innerText.trim(),
            price: parseFloat(cells[1].innerText.replace(/[^0-9.]/g, ''))
          });
        }
      });
      return pairs;
    });

    await browser.close();
    
    // Фильтруем только USDT пары
    const filteredData = dexData.filter(item => 
      item.pair.includes('USDT') && !isNaN(item.price)
    );
    
    res.json(filteredData);
  } catch (error) {
    console.error('DEX parsing error:', error);
    res.status(500).json({ error: 'Failed to fetch DEX data' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));