const express = require('express');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
app.use(express.json());

const email = process.env.NOLIO_EMAIL;
const password = process.env.NOLIO_PASSWORD;

async function createSessions({ athlete, startDate, sessions }) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.nolio.io/login');

  await page.type('input[type=email]', email);
  await page.type('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForNavigation();

  await page.goto('https://www.nolio.io/calendar/');
  await page.waitForSelector('input[placeholder="Rechercher un athlète"]');
  await page.type('input[placeholder="Rechercher un athlète"]', athlete);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForNavigation();

  const date = new Date(startDate);
  const isoWeek = date.toISOString().split('T')[0];
  await page.goto(`https://www.nolio.io/calendar/week/${isoWeek}`);
  await page.waitForTimeout(3000);

  for (const session of sessions) {
    const dayMap = {
      'LUNDI': 1,
      'MARDI': 2,
      'MERCREDI': 3,
      'JEUDI': 4,
      'VENDREDI': 5,
      'SAMEDI': 6,
      'DIMANCHE': 0
    };
    const dayOffset = dayMap[session.day.toUpperCase()];
    const targetDate = new Date(date);
    targetDate.setDate(date.getDate() + ((dayOffset - date.getDay() + 7) % 7));
    const formattedDate = targetDate.toISOString().split('T')[0];

    await page.goto(`https://www.nolio.io/calendar/day/${formattedDate}`);
    await page.waitForSelector('button[data-tooltip="Ajouter une séance"]');
    await page.click('button[data-tooltip="Ajouter une séance"]');
    await page.waitForSelector('input[name="title"]');
    await page.type('input[name="title"]', session.title);
    await page.type('textarea[name="comment"]', session.description);
    await page.click('button[type=submit]');
    await page.waitForTimeout(1000);
  }

  await browser.close();
}

app.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    await createSessions(payload);
    res.status(200).send({ status: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Erreur lors de la création des séances.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur Nolio Agent en ligne sur le port ${PORT}`);
});
