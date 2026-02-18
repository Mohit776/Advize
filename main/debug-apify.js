const { ApifyClient } = require('apify-client');
require('dotenv').config();

async function debugApify() {
    console.log('Debugging Apify Scraper Output...');

    const client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });

    // Test 1: resultsType: 'posts'
    console.log('\n--- Test 1: resultsType: "posts" ---');
    try {
        const runPosts = await client.actor("apify/instagram-scraper").call({
            directUrls: ["https://www.instagram.com/bhuvan.bam22/"],
            resultsLimit: 1,
            resultsType: "posts",
        });
        const { items: postsItems } = await client.dataset(runPosts.defaultDatasetId).listItems();
        if (postsItems.length > 0) {
            const post = postsItems[0];
            console.log('Top level keys:', Object.keys(post));
            if (post.owner) {
                console.log('Owner object keys:', Object.keys(post.owner));
                console.log('Owner followers:', post.owner.followersCount);
            } else {
                console.log('No owner object found.');
            }
            console.log('Top level followersCount:', post.followersCount);
            console.log('Top level postsCount:', post.postsCount);
        } else {
            console.log('No posts found.');
        }
    } catch (e) { console.error(e); }

    // Test 2: resultsType: 'details'
    console.log('\n--- Test 2: resultsType: "details" ---');
    try {
        const runDetails = await client.actor("apify/instagram-scraper").call({
            directUrls: ["https://www.instagram.com/bhuvan.bam22/"],
            resultsLimit: 1,
            resultsType: "details",
        });
        const { items: detailsItems } = await client.dataset(runDetails.defaultDatasetId).listItems();
        if (detailsItems.length > 0) {
            const detail = detailsItems[0];
            console.log('Detail keys:', Object.keys(detail));
            console.log('Followers:', detail.followersCount);
            console.log('Posts Count:', detail.postsCount);
            console.log('Latest Posts field?', detail.latestPosts ? 'Yes' : 'No');
        } else {
            console.log('No details found.');
        }
    } catch (e) { console.error(e); }
}

debugApify();
