const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../models/player');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Get the leaderboard of the richest players.'),

    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            const players = await Player.find().sort({ balance: -1 }).limit(10);

            if (!players) {
                return interaction.reply('No players found.');
            }

            const leaderboard = players.map((player, index) => {
                return `${index + 1}. ${player.username} - ${player.balance} 💰`;
            });
            
            await interaction.reply(leaderboard.join('\n'));
            
        } catch (error) {
            console.error('Error retrieving balance:', error);
            await interaction.reply('There was an error retrieving your balance. Please try again later.');
        }
    }
};