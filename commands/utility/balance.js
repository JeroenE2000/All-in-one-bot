const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../models/player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance.'),

    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            const player = await Player.findOne({ userId: userId });

            if (!player) {
                return interaction.reply(`${interaction.user.username}, you are not registered in the system.`);
            }

            await interaction.reply(`${interaction.user.username}, your current balance is ${player.balance} 💰.`);
        } catch (error) {
            console.error('Error retrieving balance:', error);
            await interaction.reply('There was an error retrieving your balance. Please try again later.');
        }
    }
};