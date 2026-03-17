const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

async function getEventsForMonth(startDate, endDate) {
    var url = 'https://www.du.edu/calendar?search=&start_date=' + startDate + '&end_date=' + endDate;
    var response = await axios.get(url);
    var $ = cheerio.load(response.data);

    var events = [];

    $('a[href*="/events/"]').each(function () {
        var title = $(this).find('h3').text().trim();
        var href = $(this).attr('href');
        if (!title || !href) return;

        var date = '';
        var time = '';

        $(this).find('div > div').each(function () {
            var text = $(this).text().trim();
            if (text.match(/^\w+ \d+$/)) date = text;
            if (text.match(/\d+:\d+/)) time = text;
        });

        var fullUrl = href.startsWith('http') ? href : 'https://www.du.edu' + href;
        events.push({ title: title, date: date, time: time, url: fullUrl });
    });

    return events;
}

async function getDescription(url) {
    try {
        var response = await axios.get(url, { timeout: 10000 });
        var $ = cheerio.load(response.data);
        var script = $('script[type="application/ld+json"]').first().html();
        if (script) {
            var data = JSON.parse(script);
            if (data.description) {
                var cleaned = data.description
                    .replace(/&amp;lt;/g, '<').replace(/&amp;gt;/g, '>')
                    .replace(/&amp;amp;/g, '&').replace(/&amp;nbsp;/g, ' ')
                    .replace(/&#039;/g, "'").replace(/&amp;/g, '&');
                return cheerio.load(cleaned).text().trim();
            }
        }
    } catch (e) {}
    return '';
}

async function main() {
    var allEvents = [];

    for (var month = 1; month <= 12; month++) {
        var start = '2025-' + String(month).padStart(2, '0') + '-01';
        var end;
        if (month === 12) {
            end = '2026-01-01';
        } else {
            end = '2025-' + String(month + 1).padStart(2, '0') + '-01';
        }

        console.log('Scraping ' + start + ' to ' + end);
        var monthEvents = await getEventsForMonth(start, end);
        console.log('  Found ' + monthEvents.length + ' events');
        allEvents = allEvents.concat(monthEvents);
    }

    console.log('Total events: ' + allEvents.length);
    console.log('Fetching descriptions from event pages...');

    var results = [];

    for (var i = 0; i < allEvents.length; i++) {
        var ev = allEvents[i];
        if (i % 20 === 0) console.log('Processing' + (i + 1) + '/' + allEvents.length);

        var description = await getDescription(ev.url);

        var event = { title: ev.title, date: ev.date };
        if (ev.time) event.time = ev.time;
        if (description) event.description = description;

        results.push(event);
    }

    await fs.outputJson('results/calendar_events.json', { events: results }, { spaces: 4 });
    console.log('Saved ' + results.length + ' events to results/calendar_events.json');
}

main();