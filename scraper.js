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

        // Extract all images within the cat_image_container for cat evolutions
        const catEvolutionImages = await page.evaluate(() => {
            const images = [];
            const imageContainers = document.querySelectorAll('.cat_image_container'); // Find all cat_image_container elements

            imageContainers.forEach(container => {
                const imgElement = container.querySelector('img'); // Find the image in each container
                if (imgElement) {
                    const imgSrc = imgElement.src.startsWith('//') ? 'https:' + imgElement.src : imgElement.src;
                    images.push({ src: imgSrc });
                }
            });

            return images;
        });

        // Extract all <th class="cat_descname"> elements within the specified table
        const catDescNames = await page.evaluate(() => {
            const table = document.querySelector('table.translation_en.mw-collapsible.bg-creamy-yellow.mw-made-collapsible'); // Select the table by class and id
            if (!table) return []; // Return empty array if table is not found
            
            const descElements = table.querySelectorAll('th.cat_descname'); // Look for all th.cat_descname within this table
            const descriptions = [];
            descElements.forEach((descElement) => {
                descriptions.push(descElement.innerText.trim()); // Extract the text content from each
            });
            return descriptions;
        });

        cat.images = catEvolutionImages;
        cat.catDescNames = catDescNames; // Add the description names to the cat object

        console.log(`Cat #${cat.index} (${cat.name}) - Descriptions: ${cat.catDescNames}`);
        console.log(`Images for Cat #${cat.index} (${cat.name}):`, cat.images); // Logging the index with images and descriptions
    }

    // Write the cat data to a JSON file
    fs.writeFile('catsData.json', JSON.stringify(catLinks, null, 2), (err) => {
        if (err) throw err;
        console.log('Cat data has been saved to catsData.json!');
    });

    await browser.close();
})();
