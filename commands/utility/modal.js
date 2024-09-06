const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

let apiCallCount = 0;
let countStartTime = Date.now();

const movieOptions = ['action', 'comedy', 'horror', 'romance', 'sci-fi'];
const sportOptions = ['sports', 'gaming', 'politics', 'animals', 'celebrities'];
const funnyOptions = ['jokes', 'pranks', 'fails', 'reactions', 'puns'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gif')
        .setDescription('Generates a random gif from a API based on the choice')
        .addStringOption(option => 
            option.setName('category')
            .setDescription('The category of the gif')
            .setRequired(true)
            .addChoices(
                { name: 'Funny', value: 'funny' },
                { name: 'Sport', value: 'sport' },
                { name: 'Movie', value: 'movie' },
            )),

    async execute(interaction) {
        const category = interaction.options.getString('category');

        // If the API has been called 100 times in the last hour, stop and inform the user
        if (apiCallCount >= 100) {
            await interaction.reply({ content: 'The gif generation limit has been reached. Please try again in an hour.' });
            return;
        }

        try {
            // Generate a random offset
            const offset = Math.floor(Math.random() * 100);

            // Select a random value based on the category
            let value;
            switch (category) {
                case 'movie':
                    value = movieOptions[Math.floor(Math.random() * movieOptions.length)];
                    break;
                case 'sport':
                    value = sportOptions[Math.floor(Math.random() * sportOptions.length)];
                    break;
                case 'funny':
                    value = funnyOptions[Math.floor(Math.random() * funnyOptions.length)];
                    break;
            }

            // Make a GET request to the GIPHY API
            const response = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=zoq9FYXtEDiiDpGY2rxztoJO22rit2QT&q=${value}&limit=1&offset=${offset}&rating=g&lang=en`);

            // Process the response and send the gif to the user
            if (response.data.data && response.data.data[0]) {
                const gifUrl = response.data.data[0].images.original.url;
                await interaction.reply({ content: gifUrl });
            } else {
                console.error('No data returned from the API');
                await interaction.reply({ content: 'No gif found.' });
            }

            // Increment the API call count
            apiCallCount++;

            // If it's been more than an hour since the count started, reset the count and the start time
            const currentTime = Date.now();
            if (currentTime - countStartTime >= 60 * 60 * 1000) {
                apiCallCount = 1;
                countStartTime = currentTime;
            }

            console.log(`API has been called ${apiCallCount} times in the last hour.`);
        } catch (error) {
            console.error('Error generating gif:', error);
            await interaction.reply({ content: 'An error occurred while generating the gif.' });
        }
    },
};