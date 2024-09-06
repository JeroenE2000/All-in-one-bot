const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dog')
        .setDescription('Generates an image from the API'),

    async execute(interaction) {
        try {
            // Make a GET request to the API
            const response = await axios.get('https://dog.ceo/api/breeds/image/random');
            // Process the response and send the image to the user
            const imageUrl = response.data.message; // Changed from response.data.image_url
            await interaction.reply({ content: imageUrl });
        } catch (error) {
            console.error('Error generating image:', error);
            // Check if the interaction has already been replied to or deferred
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while generating the image.' });
            }
        }
    },
};