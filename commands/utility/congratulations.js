const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios'); // Import axios
const config = require('../../config.json');

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

        // Search for a random Happy Birthday GIF
        const gifUrl = `https://api.giphy.com/v1/gifs/random?api_key=${config.giphyApiKey}&tag=happy+birthday`;

        let gif;
        try {
            const response = await axios.get(gifUrl);
            const data = response.data;

            if (data && data.data && data.data.images && data.data.images.original && data.data.images.original.url) {
                gif = data.data.images.original.url;
            } 
        } catch (error) {
            console.error('Error fetching GIF:', error);
        }

        // Create the response with GIF and mention everyone
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`Happy Birthday, ${target.username}!`)
            .setDescription('gefeliciteerd met je verjaardag! 🎉')
            .setImage(gif);

        await interaction.reply({ embeds: [embed] });
    }
};
