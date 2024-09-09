const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/player');
const rouletteWheel = require('../../helpers/roulette-wheel');
const colorMap = require('../../helpers/color-map');

const colorMapping = {
    ':green_circle:': '#00FF00',
    ':red_circle:': '#FF0000',
    ':black_circle:': '#000000'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel and place your bets!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('How much do you want to bet? (default 1000 💰 or type "all" to bet everything)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('What color do you want to bet on? (RED, BLACK, GREEN)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('What number do you want to bet on? (0-36)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const betOption = interaction.options.getString('bet');
        const betColorInput = interaction.options.getString('color').toLowerCase();
        const betNumber = interaction.options.getInteger('number');
        const player = interaction.user;

        const betColor = colorMap[betColorInput] || null;
        let betAmount = betOption.toLowerCase() === 'all' ? 0 : parseInt(betOption);
        const playerData = await getPlayerData(player);

        if (isNaN(betAmount) || betAmount <= 0) {
            return interaction.editReply(`${player.username}, please provide a valid bet amount 💰.`);
        }
        if (betOption.toLowerCase() === 'all') betAmount = playerData.balance;
        if (betAmount > playerData.balance) return interaction.editReply(`${player.username}, you don't have enough money 💰 to place that bet!`);
        if (!betColor && betNumber === null) return interaction.editReply(`${player.username}, please place a bet on either a color or a number!`);
        if (betNumber !== null && (isNaN(betNumber) || betNumber < 0 || betNumber > 36)) return interaction.editReply(`${player.username}, please place a valid number between 0 and 36!`);
        if (!colorMap[betColorInput]) return interaction.editReply(`${player.username}, please provide a valid color: RED, BLACK, or GREEN.`);

        // Simulate roulette spin with animation
        const animationSteps = 10;
        let currentStep = 0;

        const resultEmbed = new EmbedBuilder()
            .setTitle('🎰 Roulette is spinning...')
            .setDescription(`Spinning... [0 (:green_circle:)]`)
            .setColor('#CCCCCC');

        await interaction.editReply({ content: null, embeds: [resultEmbed] });

        const animationInterval = setInterval(async () => {
            if (currentStep >= animationSteps) {
                clearInterval(animationInterval);

                const result = getRandomResult();
                const winnings = calculateWinnings(betAmount, betColor, betNumber, result.color, result.number);
                const newBalance = await updatePlayerBalance(player, winnings);

                const embed = createResultEmbed(result, betAmount, winnings, newBalance);
                await interaction.editReply({ content: null, embeds: [embed] });
                return;
            }

            const spinning = getRandomResult();
            const spinningColor = colorMapping[spinning.color] || '#CCCCCC';

            resultEmbed.setDescription(`Spinning... [${spinning.number} (${spinning.color})]`)
                .setColor(spinningColor);

            await interaction.editReply({ content: null, embeds: [resultEmbed] });
            currentStep++;
        }, 500);
    }
};

async function getPlayerData(user) {
    let player = await Player.findOne({ userId: user.id });
    if (!player) {
        player = new Player({
            userId: user.id,
            username: user.username,
            balance: 10000
        });
        await player.save();
    }
    return player;
}

async function updatePlayerBalance(user, amount) {
    const player = await Player.findOne({ userId: user.id });
    if (player) {
        player.balance += amount;
        await player.save();
        return player.balance;
    }
    return null;
}

function calculateWinnings(betAmount, betColor, betNumber, resultColor, resultNumber) {
    let winnings = 0;
    if (betColor && betColor === resultColor) winnings += betAmount * 2; // Color bet
    if (betNumber !== null && betNumber == resultNumber) winnings += betAmount * 35; // Number bet
    if (winnings === 0) winnings -= betAmount; // No win
    return winnings;
}

function getRandomResult() {
    const randomIndex = Math.floor(Math.random() * rouletteWheel.length);
    return rouletteWheel[randomIndex];
}

function createResultEmbed(result, betAmount, winnings, newBalance) {
    const title = winnings > 0 ? '🎉 You won!' : winnings < 0 ? '😢 You lost!' : '😐 No win';
    const description = `The roulette stopped at **${result.number} (${result.color})**`;
    let resultMessage, embedColor;
    if (winnings > 0) resultMessage = `You won ${winnings} 💰! Your new balance is ${newBalance} 💰.`, embedColor = '#00FF00';
    else if (winnings < 0) resultMessage = `You lost ${-winnings} 💰. Your new balance is ${newBalance} 💰.`, embedColor = '#FF0000';
    else resultMessage = `Your bet did not win. Your balance remains ${newBalance} 💰.`, embedColor = '#CCCCCC';

    return new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(title)
        .setDescription(description)
        .addFields(
            { name: 'Bet Amount', value: `${betAmount} 💰`, inline: true },
            { name: 'Result', value: resultMessage, inline: false }
        );
}
