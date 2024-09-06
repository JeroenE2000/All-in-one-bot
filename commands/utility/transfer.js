const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../models/player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer money to another user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to give money to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of money you want to give.')
                .setRequired(true)),

    async execute(interaction) {
        const sender = interaction.user;
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        if (sender.id === target.id) {
            return interaction.reply(`You cannot transfer money to yourself, ${sender.username}.`);
        }

        try {
            const senderData = await Player.findOne({ userId: sender.id });
            const targetData = await Player.findOne({ userId: target.id });

            if (!senderData) {
                return interaction.reply(`${sender.username}, you are not registered in the system.`);
            }

            if (!targetData) {
                return interaction.reply(`${sender.username}, the target user is not registered in the system.`);
            }

            // Validate amount
            if (amount <= 0) {
                return interaction.reply(`${sender.username}, please enter a valid amount.`);
            }

            // Check if the sender has enough money
            if (amount > senderData.balance) {
                return interaction.reply(`${sender.username}, you do not have enough money to transfer ${amount}.`);
            }

            // Update balances
            senderData.balance -= amount;
            targetData.balance += amount;

            // Save changes
            await senderData.save();
            await targetData.save();

            await interaction.reply(`${sender.username} has successfully transferred ${amount} to ${target.username}.`);
        } catch (error) {
            console.error('Error during transfer:', error);
            await interaction.reply('There was an error processing the transfer. Please try again later.');
        }
    }
};