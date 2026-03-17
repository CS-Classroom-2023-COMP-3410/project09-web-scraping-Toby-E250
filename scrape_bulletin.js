const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

async function main() {
    const response = await axios.get('https://bulletin.du.edu/undergraduate/coursedescriptions/comp/');
    const $ = cheerio.load(response.data);

    const courses = [];

    $('.courseblock').each(function () {
        const titleText = $(this).find('.courseblocktitle').text().trim();
        const fullText = $(this).text().trim();

        const codeMatch = titleText.match(/COMP\s+(\d+)/);
        if (!codeMatch) return;

        const courseNum = parseInt(codeMatch[1]);
        if (courseNum < 3000) return;

        if (/prerequisite/i.test(fullText)) return;

        const titleMatch = titleText.match(/COMP\s+\d+\s+(.+?)\s*\(\d/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        courses.push({
            course: 'COMP-' + codeMatch[1],
            title: title
        });
    });

    await fs.outputJson('results/bulletin.json', { courses }, { spaces: 4 });
    console.log('Saved ' + courses.length + ' courses to results/bulletin.json');
}

main();