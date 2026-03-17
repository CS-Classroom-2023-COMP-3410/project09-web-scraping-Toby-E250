const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

async function main() {
    const response = await axios.get('https://denverpioneers.com/index.aspx');
    const $ = cheerio.load(response.data);

    var scoreboard = null;

    $('script').each(function () {
        var text = $(this).html();
        var match = text.match(/var obj = (\{.*?"type":"events".*?\});/s);
        if (match) {
            scoreboard = JSON.parse(match[1]);
        }
    });

    var events = [];

    for (var i = 0; i < scoreboard.data.length; i++) {
        var game = scoreboard.data[i];
        var dateObj = new Date(game.date);
        var dateStr = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        events.push({
            duTeam: game.sport.title,
            opponent: game.opponent.name,
            date: dateStr
        });
    }

    await fs.outputJson('results/athletic_events.json', { events }, { spaces: 4 });
    console.log('Saved ' + events.length + ' events to results/athletic_events.json');
}

main();