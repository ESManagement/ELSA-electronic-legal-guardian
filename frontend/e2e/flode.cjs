// Användarflödestest mot den byggda demofilen (npm run build:demo). Kräver Playwright med Chromium.
// Körs: npm run e2e. Skärmbilder sparas i den katalog som anges som andra argument (standard: tmp).
const { chromium } = require('playwright');
const path = require('path');
const fil = 'file://' + path.resolve(process.argv[2] ?? path.join(__dirname, '../dist-demo/index.html'));
const ut = process.argv[3] ?? require('os').tmpdir();
const res = [];
const ok = (namn, villkor, info = '') => { res.push({ namn, ok: !!villkor, info }); };
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const fel = [];
  page.on('pageerror', (e) => fel.push(e.message));
  page.on('console', (m) => m.type() === 'error' && fel.push(m.text()));
  await page.goto(fil);
  const text = () => page.locator('body').innerText();

  // Hemsida
  ok('Hemsida: budskap', (await text()).includes('Verksamhetens data, analys och beslut'));
  ok('Hemsida: två dörrar', (await page.getByRole('heading', { name: 'Jag är kund' }).count()) === 1 && (await page.getByRole('heading', { name: 'Jag är anställd på ESM' }).count()) === 1);
  await page.getByPlaceholder('T.ex. årsräkning, energi, upphandling').fill('årsräkning');
  ok('Hemsida: sök uppgift', (await page.locator('.hs-traffar').innerText()).includes('Val & Överförmyndare'));
  ok('Hemsida: pris märkt som förslag', (await text()).includes('Priset är ett förslag och inte fastställt'));
  ok('Hemsida: inga referenser publicerade', (await text()).includes('Inga referenser är publicerade ännu'));
  await page.screenshot({ path: ut + '/hemsida.png', fullPage: false });
  // Boka demo
  const boka = page.locator('#boka');
  await boka.getByLabel('Organisation', { exact: true }).fill('Testkommun (fiktiv)');
  await boka.getByLabel('Ditt namn').fill('Test Testsson');
  await boka.getByLabel('E-post').fill('test@test.example');
  await boka.getByLabel('Typ av demo').selectOption('vertikaldemo');
  await boka.getByRole('button', { name: 'Boka demo' }).click();
  ok('Boka demo registreras', (await boka.innerText()).includes('Inget meddelande har skickats'));
  // Offert
  const off = page.locator('#offert');
  await off.getByLabel('Organisation', { exact: true }).fill('Ny Kund AB (fiktiv)');
  await off.getByLabel('Organisationsnummer').fill('556677-8890');
  await off.getByLabel('Namn', { exact: true }).fill('Ola');
  await off.getByLabel('E-post').fill('ola@ny.example');
  await off.getByLabel('Energi', { exact: true }).check();
  await off.getByRole('button', { name: 'Skicka offertförfrågan' }).click();
  ok('Offert: fel orgnr nekas', (await off.innerText()).includes('Kontrollsiffran stämmer inte'));
  await off.getByLabel('Organisationsnummer').fill('556016-0680');
  await off.getByRole('button', { name: 'Skicka offertförfrågan' }).click();
  ok('Offert: giltig registreras', (await off.innerText()).includes('Inget meddelande har skickats'));

  // Kunddörren → Fia
  await page.getByRole('link', { name: 'Fortsätt till demoinloggning' }).first().click();
  ok('Login: simulerad inloggning beskriven', (await text()).includes('Simulerad inloggning'));
  await page.getByRole('button', { name: /Fia Fastighet/ }).click();
  await page.waitForSelector('.es-start');
  ok('ELSA START: 32 moduler', (await page.locator('.es-modul').count()) === 32, String(await page.locator('.es-modul').count()));
  ok('ELSA START: Energi öppen för Fia', !(await page.locator('.es-modul', { hasText: 'Energi' }).first().getAttribute('class')).includes('last'));
  ok('ELSA START: Val & Ö låst för Fia', (await page.locator('.es-modul', { hasText: 'Val & Överförmyndare' }).getAttribute('class')).includes('last'));
  await page.screenshot({ path: ut + '/elsa-start.png' });
  // Alla moduler: tillbaka-väg
  const lankar = await page.locator('.es-modul').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  let tillbakaOk = 0;
  for (const l of lankar) {
    await page.goto(fil + l);
    const t = await page.locator('main').innerText();
    if (t.includes('← ELSA START') && t.includes('Modulprofil')) tillbakaOk++;
  }
  ok('Alla 32 modulsidor har ← ELSA START och profil', tillbakaOk === 32, String(tillbakaOk));
  await page.getByRole('link', { name: '← ELSA START' }).first().click();
  ok('Tillbaka-länken leder till ELSA START', (await page.locator('.es-start').count()) === 1);
  // Låst modul visar inga data
  await page.goto(fil + '#/modul/val-overformyndare');
  ok('Låst modul: ingen arbetsyta, låsmeddelande', (await text()).includes('Låst för dig') && (await page.getByRole('link', { name: 'Öppna arbetsytan' }).count()) === 0);
  // Energi
  await page.goto(fil + '#/energi');
  await page.getByRole('button', { name: 'Läs in och kontrollera' }).click();
  ok('Energi: trend kräver granskning', (await text()).includes('Kräver granskning'));
  ok('Energi: summa', (await text()).includes('156'));
  ok('Energi: ingen besparing', (await text()).includes('Beräknas inte'));
  await page.getByPlaceholder('Granskningskommentar').fill('Rimlig säsongsprofil');
  await page.getByRole('button', { name: 'Fastställ trenden' }).click();
  ok('Energi: fastställd', (await text()).includes('Fastställd av fia'));
  await page.screenshot({ path: ut + '/energi.png', fullPage: true });
  // Kundisolering i gränssnittet
  await page.goto(fil + '#/projekt/PRJ-DEMOSTAD-1');
  ok('Fia kan inte öppna Demostads projekt', (await text()).includes('finns inte eller du saknar behörighet'));
  await page.goto(fil + '#/projekt/PRJ-DEMOFAST-1');
  ok('Fia öppnar eget projekt', (await text()).includes('Energiöversyn TEST-BYGGNAD-01'));
  await page.screenshot({ path: ut + '/kundresa.png', fullPage: true });
  await page.goto(fil + '#/esm/crm');
  ok('Fia ser inte CRM', (await text()).includes('Ingen behörighet till organisationen'));
  await page.goto(fil + '#/organisation');
  ok('Fia (admin) ser användare och roller', (await text()).includes('Frida Förvaltare'));

  // Byt till Lars (läsare)
  await page.getByLabel('Byt exempelanvändare').selectOption('lars');
  await page.goto(fil + '#/projekt/PRJ-DEMOSTAD-1');
  ok('Läsare ser projekt men kan inte ändra', (await text()).includes('Du har läsbehörighet') && (await page.getByRole('button', { name: 'Markera klart' }).count()) === 0);
  await page.goto(fil + '#/organisation');
  ok('Läsare nekas administration', (await text()).includes('Läsare får inte administrera'));

  // Sigge (admin Demostad) godkänner steg 11
  await page.getByLabel('Byt exempelanvändare').selectOption('sigge');
  await page.goto(fil + '#/projekt/PRJ-DEMOSTAD-1');
  await page.getByRole('button', { name: /^12/ }).click();
  ok('Steg 12 spärrat före godkännande', (await text()).includes('Steg 12 väntar på steg 11'));
  await page.getByRole('button', { name: /^11/ }).click();
  await page.getByPlaceholder('Vad kunden godkänner').fill('Pilot för 20 ärenden godkänd');
  await page.getByRole('button', { name: 'Registrera kundens godkännande' }).click();
  await page.getByRole('button', { name: 'Markera klart' }).click();
  ok('Godkännande registrerat', (await text()).includes('Kunden har godkänt genomförande'));
  await page.getByRole('button', { name: /^12/ }).click();
  ok('Steg 12 startbart efter godkännande', (await page.getByRole('button', { name: 'Starta steg' }).isEnabled()));

  // Anna (OF) kommer fortfarande åt årsräkningsgranskningen
  await page.getByLabel('Byt exempelanvändare').selectOption('anna');
  await page.goto(fil + '#/oversikt');
  ok('Anna: översikt Val & Ö fungerar', (await text()).includes('Handläggare'));
  await page.goto(fil + '#/arenden/AR-SYNT-1');
  ok('Anna: granskning av årsräkning', (await text()).includes('Årsräkning'));

  // ESM: Erik flyttar offerten, Eva godkänner
  await page.getByLabel('Byt exempelanvändare').selectOption('erik');
  await page.goto(fil + '#/esm/crm');
  ok('CRM: demobokning syns', (await text()).includes('Testkommun (fiktiv)'));
  const kort = page.locator('.crm-kort', { hasText: 'Ny Kund AB' });
  await kort.getByRole('button', { name: '→ Offert' }).click();
  await kort.getByPlaceholder('Avtalsreferens').fill('AVT-DEMO-1');
  await kort.getByRole('button', { name: '→ Avtal' }).click();
  ok('CRM: avtal skapar inbjudningsutkast', (await text()).includes('ola@ny.example') && (await text()).includes('Utkast'));
  await page.locator('.radlista').getByRole('button', { name: 'Godkänn' }).first().click();
  ok('CRM: säljare kan inte godkänna inbjudan', (await text()).includes('Endast administratör kan godkänna inbjudan'));
  await page.getByLabel('Byt exempelanvändare').selectOption('eva');
  await page.goto(fil + '#/esm/crm');
  await page.locator('.radlista').getByRole('button', { name: 'Godkänn' }).first().click();
  ok('CRM: ESM-admin godkänner, ej skickad', (await text()).includes('Godkänd – ej skickad'));
  await page.screenshot({ path: ut + '/crm.png', fullPage: true });

  // Logga ut → hemsidan, mobil
  await page.getByRole('button', { name: 'Logga ut' }).click();
  ok('Utloggning visar hemsidan', (await text()).includes('Jag är kund'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fil);
  const bred = await page.evaluate(() => document.documentElement.scrollWidth);
  ok('Mobil: ingen horisontell scroll', bred <= 390, String(bred));
  ok('Mobil: Boka demo synlig', await page.getByRole('link', { name: 'Boka demo' }).first().isVisible());
  await page.screenshot({ path: ut + '/hemsida-mobil.png' });
  // Tangentbord: första tabbstopp
  await page.keyboard.press('Tab');
  const fokus = await page.evaluate(() => document.activeElement?.textContent);
  ok('Tangentbord: fokus på första länken', !!fokus, fokus ?? '');

  ok('Inga konsolfel', fel.length === 0, fel.join(' | '));
  await b.close();
  for (const r of res) console.log(`${r.ok ? 'GODKÄND' : 'UNDERKÄND'}  ${r.namn}${r.info ? '  [' + r.info + ']' : ''}`);
  console.log(`${res.filter((r) => r.ok).length}/${res.length}`);
  process.exitCode = res.every((r) => r.ok) ? 0 : 1;
})();
