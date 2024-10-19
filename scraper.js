const puppeteer = require('puppeteer');
const fs = require('fs'); // Require the file system module

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to the Battle Cats wiki...');
    await page.goto('https://battlecats.miraheze.org/wiki/Cat_Release_Order', { waitUntil: 'networkidle2' });

    await page.waitForSelector('table'); // Wait for the table to load

    console.log('Scraping the cat links from the table...');
    const catLinks = await page.evaluate(() => {
        const cats = [];
        const table = document.querySelector('table'); 

        const rows = table.querySelectorAll('tbody tr'); 

        rows.forEach((row, index) => {
            const columns = row.querySelectorAll('td');
            if (columns.length >= 5) {
                const rarity = columns[1].innerText.trim(); 
                const catNameLink = columns[2].querySelector('a'); 
                const evolvedForms = columns[3].innerText.trim(); 

                if (catNameLink) {
                    cats.push({
                        index: index + 1, // Adding index here
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
        console.log(`Cat #${cat.index} - Navigating to ${cat.name}'s page: ${cat.url}`); // Logging the index

        await page.goto(cat.url, { waitUntil: 'networkidle2' });

        // Extract all images within the tabber__panel sections for cat evolutions
        const catEvolutionImages = await page.evaluate(() => {
            const images = [];
            const panels = document.querySelectorAll('.tabber__panel'); // Find all tabber__panel elements

            panels.forEach(panel => {
                const imgElement = panel.querySelector('img'); // Find the image in each panel
                if (imgElement) {
                    const imgSrc = imgElement.src.startsWith('//') ? 'https:' + imgElement.src : imgElement.src;
                    const title = panel.getAttribute('data-mw-tabber-title'); // Get the evolution form name
                    images.push({ form: title, src: imgSrc });
                }
            });
            return images;
        });

        cat.images = catEvolutionImages;
        console.log(`Images for Cat #${cat.index} (${cat.name}):`, cat.images); // Logging the index with images
    }

    // Write the cat data to a JSON file
    fs.writeFile('catsData.json', JSON.stringify(catLinks, null, 2), (err) => {
        if (err) throw err;
        console.log('Cat data has been saved to catsData.json!');
    });

    await browser.close();
})();
