const puppeteer = require('puppeteer');
const fs = require('fs'); 
(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to the Battle Cats wiki...');
    await page.goto('https://battlecats.miraheze.org/wiki/Cat_Release_Order', { waitUntil: 'networkidle2' });

    await page.waitForSelector('table');

    console.log('Scraping the cat links from the table...');
    const catLinks = await page.evaluate(() => {
        const cats = [];
        const table = document.querySelector('table');

        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const columns = row.querySelectorAll('td');
            if (columns.length >= 5) {
                const rarity = columns[1].innerText.trim();
                const catNameLink = columns[2].querySelector('a');
                const evolvedForms = columns[3].innerText.trim();

                if (catNameLink) {
                    cats.push({
                        name: catNameLink.innerText.trim(),
                        rarity: rarity,
                        forms: evolvedForms,
                        url: 'https://battlecats.miraheze.org' + catNameLink.getAttribute('href')
                    });
                }
            }
        });
        return cats;
    });

    console.log(`Found ${catLinks.length} cats`);

    for (let i = 0; i < catLinks.length; i++) {
        const cat = catLinks[i];
        console.log(`Navigating to ${cat.name}'s page: ${cat.url}`);

        await page.goto(cat.url, { waitUntil: 'networkidle2' });

        const catImageSrc = await page.evaluate(() => {
            const imageElement = document.querySelector('a.mw-file-description img');
            if (imageElement) {
                return imageElement.src.startsWith('//') ? 'https:' + imageElement.src : imageElement.src;
            }
            return null;
        });

        cat.image = catImageSrc;
        console.log(`Image for ${cat.name}: ${cat.image}`);
    }

    fs.writeFileSync('catsData.json', JSON.stringify(catLinks, null, 2));
    
    console.table(catLinks);
    await browser.close();
})();
