const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('video')
        .setDescription('Search for a video on Pixabay')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The search query for the video')
                .setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('query');

        try {
            const response = await axios.get(`https://pixabay.com/api/videos/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}`);
            const videos = response.data.hits;

            if (videos.length === 0) {
                return interaction.reply({ content: 'No videos found for that query.', ephemeral: true });
            }

            const video = videos[Math.floor(Math.random() * videos.length)];
            const videoUrl = video.videos.small.url;

            if (!videoUrl) {
                return interaction.reply({ content: 'The video URL is missing or invalid.', ephemeral: true });
            }
                await interaction.reply({ content: videoUrl });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while searching for the video.', ephemeral: true });
        }
    },
};
