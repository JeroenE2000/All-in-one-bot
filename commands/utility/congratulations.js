const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/player');
const axios = require('axios'); // Import axios

module.exports = {
    data: new SlashCommandBuilder()
        .setName('congrats')
        .setDescription('Congratulate someone on their birthday')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to congratulate')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const congrats = await Player.findOne({ userId: target.id });

        if (!congrats) {
            return interaction.reply(`${target.username} is not registered in the system.`);
        }
       
        // Search for a Happy Birthday GIF
        const gifUrl = 'https://api.giphy.com/v1/gifs/search?api_key=zoq9FYXtEDiiDpGY2rxztoJO22rit2QT&q=happy+birthday&limit=1'; // Replace with your Giphy API key

        let gif;
        try {
            const response = await axios.get(gifUrl);
            const data = response.data;

            // Ensure data.data exists and is an array with length
            if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
                gif = data.data[0].images.original.url; // Access the original GIF URL
            } else {
                gif = 'https://media.tenor.com/images/1f0e09a6792384b10f6b5ff2d4fc6b0a/tenor.gif'; // Fallback GIF
            }
        } catch (error) {
            console.error('Error fetching GIF:', error);
            gif = 'https://media.tenor.com/images/1f0e09a6792384b10f6b5ff2d4fc6b0a/tenor.gif'; // Fallback GIF
        }

        // Create the response with GIF
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`Happy Birthday, ${target.username}!`)
            .setDescription('gefeliciteerd met je verjaardag! 🎉')
            .setImage(gif);

        await interaction.reply({ embeds: [embed] });
    }
};
