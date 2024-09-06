const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../models/player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Get some random money'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const now = new Date();

        try {
            let player = await Player.findOne({ userId: userId });

            if (!player) {
                // Register the user if not present
                player = new Player({
                    userId: userId,
                    username: interaction.user.username,
                });
            }

            // Check if 24 hours have passed since the last claim
            if (player.lastDailyClaim) {
                const timeDiff = now - new Date(player.lastDailyClaim);
                const hoursPassed = timeDiff / (1000 * 60 * 60);

                if (hoursPassed < 24) {
                    return interaction.reply(`${interaction.user.username}, you have already claimed your daily reward. Please try again in ${Math.ceil(24 - hoursPassed)} hours.`);
                }
            }

            // Give the reward and update the last claim time
            const coins = Math.floor(Math.random() * 1000) + 1;
            player.balance += coins;
            player.lastDailyClaim = now;
            await player.save();

            return interaction.reply(`${interaction.user.username}, you have claimed your daily reward of ${coins} coins.`);
        } catch (error) {
            console.error('Error retrieving balance:', error);
            await interaction.reply('There was an error retrieving your balance. Please try again later.');
        }
    }
};
