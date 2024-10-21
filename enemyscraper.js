const puppeteer = require('puppeteer');
const fs = require('fs'); // Require the file system module

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to the Battle Cats enemy wiki...');
    await page.goto('https://battlecats.miraheze.org/wiki/Enemy_Release_Order', { waitUntil: 'networkidle2' });

    await page.waitForSelector('table'); // Wait for the table to load

    console.log('Scraping the enemy links from the table...');
    const enemyLinks = await page.evaluate(() => {
        const enemies = [];
        const table = document.querySelector('table');

        const rows = table.querySelectorAll('tr'); // Get all rows (including header rows)

        rows.forEach((row, index) => {
            const columns = row.querySelectorAll('td'); // Only select rows with <td> elements (ignore <th> header rows)
            if (columns.length >= 3) { // We expect at least 3 columns: ID, Enemy Name, Type
                const enemyNameLink = columns[1].querySelector('a'); // Second column is the enemy name link
                const enemyType = columns[2].innerText.trim(); // Third column is the enemy type

                if (enemyNameLink) {
                    enemies.push({
                        index: index + 1,
                        name: enemyNameLink.innerText.trim(),  
                        type: enemyType,
                        url: 'https://battlecats.miraheze.org' + enemyNameLink.getAttribute('href') 
                    });
                }
            }
        });
        return enemies;
    });

    console.log(`Found ${enemyLinks.length} enemies`);

    for (let i = 0; i < enemyLinks.length; i++) {
        const enemy = enemyLinks[i];
        console.log(`Enemy #${enemy.index} - Navigating to ${enemy.name}'s page: ${enemy.url}`);

        await page.goto(enemy.url, { waitUntil: 'networkidle2' });

        // Extract the image from the enemy's page
        const enemyImage = await page.evaluate(() => {
            const figureElement = document.querySelector('figure.pi-item.pi-media.pi-image'); // Find the figure element
            const imgElement = figureElement ? figureElement.querySelector('img') : null; // Get the image element
            if (imgElement) {
                return imgElement.src.startsWith('//') ? 'https:' + imgElement.src : imgElement.src;
            }
            return null;
        });

        enemy.image = enemyImage;

        console.log(`Enemy #${enemy.index} (${enemy.name}) - Image: ${enemy.image}`);
    }

    // Write the enemy data to a JSON file
    fs.writeFile('enemiesData.json', JSON.stringify(enemyLinks, null, 2), (err) => {
        if (err) throw err;
        console.log('Enemy data has been saved to enemiesData.json!');
    });

    await browser.close();
})();
