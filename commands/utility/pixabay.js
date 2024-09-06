const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagegen')
        .setDescription('Search for an image on Pixabay')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The search query for the image')
                .setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('query');

        try {
            const response = await axios.get(`https://pixabay.com/api/?key=${config.pixabayApiKey}&q=${encodeURIComponent(query)}`);
            const images = response.data.hits;

            if (images.length === 0) {
                return interaction.reply({ content: 'No images found for that query.' });
            }

            const image = images[Math.floor(Math.random() * images.length)];
            await interaction.reply({ content: image.largeImageURL });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while searching for the image.' });
        }
    },
};
