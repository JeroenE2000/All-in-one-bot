const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const Player = require('../../models/player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack against the bot!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('How much do you want to bet? (default 1000 💰 or type "all" to bet everything)')
                .setRequired(false)),

    async execute(interaction) {
        let bet = interaction.options.getString('bet') || '1000';
        const player1 = interaction.user;

        const player1Data = await getPlayerData(player1);

        if (bet.toLowerCase() === 'all') {
            bet = player1Data.balance;
        } else {
            bet = parseInt(bet);
        }

        if (isNaN(bet) || bet <= 0) {
            return interaction.reply(`${player1.username}, please provide a valid bet amount 💰.`);
        }

        if (bet > player1Data.balance) {
            return interaction.reply(`${player1.username}, you don't have enough money 💰 to place that bet!`);
        }

        try {
            const response = await axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
            const deckId = response.data.deck_id;

            const player1Hand = await drawCards(deckId, 2);
            const botHand = await drawCards(deckId, 2);

            const player1Score = calculateScore(player1Hand.cards);
            const botScore = calculateScore([botHand.cards[0]]);

            // Create the initial embed
            const embed = new EmbedBuilder()
                .setTitle('Blackjack Game Started!')
                .setDescription(`${player1.username} (${player1Score} points) vs Bot (${botScore} points + hidden)`)
                .setFooter({ text: `Deck ID: ${deckId}. Bet: ${bet}` })
                .addFields(
                    { name: `${player1.username}'s Cards`, value: formatHand(player1Hand.cards) + `\nScore: ${player1Score}`, inline: true },
                    { name: `Bot's Cards`, value: formatHand([botHand.cards[0]], true) + `\nScore: ${botScore} (hidden)`, inline: true }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hit')
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('stand')
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [embed], components: [row] });

            const filter = i => i.user.id === player1.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'hit') {
                    const newCard = await drawCards(deckId, 1);
                    if (newCard.cards && newCard.cards.length > 0) {
                        player1Hand.cards.push(...newCard.cards);
                        const updatedPlayer1Score = calculateScore(player1Hand.cards);
            
                        // Update the embed
                        const updatedEmbed = new EmbedBuilder(embed.toJSON()); // Create a new EmbedBuilder based on the original
                        
                        // Ensure the fields are initialized
                        if (!updatedEmbed.fields || updatedEmbed.fields.length < 2) {
                            updatedEmbed.setFields(
                                { name: `${player1.username}'s Cards`, value: formatHand(player1Hand.cards) + `\nScore: ${updatedPlayer1Score}`, inline: true },
                                { name: `Bot's Cards`, value: formatHand([botHand.cards[0]], true) + `\nScore: ${botScore} (hidden)`, inline: true }
                            );
                        } else {
                            updatedEmbed.fields[0].value = formatHand(player1Hand.cards) + `\nScore: ${updatedPlayer1Score}`;
                            updatedEmbed.setDescription(`${player1.username} (${updatedPlayer1Score} points) vs Bot (${botScore} points + hidden)`);
                        }
            
                        await i.update({ embeds: [updatedEmbed], components: [row] });
            
                        if (updatedPlayer1Score > 21) {
                            collector.stop('bust');
                            await i.followUp({ content: `${player1.username} busted with a score of ${updatedPlayer1Score}!`, components: [] });
                            await botPlay(deckId, botHand, player1, player1Hand, bet, interaction);
                        }
                    } else {
                        await i.update({ content: `Error drawing a card.`, components: [] });
                    }
                } else if (i.customId === 'stand') {
                    collector.stop('stand');
                    await botPlay(deckId, botHand, player1, player1Hand, bet, interaction);
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await interaction.editReply({ content: 'Time is up! The game has ended.', components: [] });
                }
            });
        } catch (error) {
            console.error('Error starting the game:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while starting the game.' });
            }
        }
    }
};

async function botPlay(deckId, botHand, player1, player1Hand, bet, interaction) {
    let score = calculateScore(botHand.cards);
    while (score < 17) {
        const newCard = await drawCards(deckId, 1);
        if (newCard.cards && newCard.cards.length > 0) {
            botHand.cards.push(...newCard.cards);
            score = calculateScore(botHand.cards);
        } else {
            break;
        }
    }

    const player1Score = calculateScore(player1Hand.cards);
    const botScore = calculateScore(botHand.cards);

    const embed = new EmbedBuilder()
        .setTitle('Game Over!')
        .setDescription(`${player1.username} (${player1Score} points) vs Bot (${botScore} points)`)
        .addFields(
            { name: `${player1.username}'s Final Hand`, value: formatHand(player1Hand.cards) + `\nScore: ${player1Score}`, inline: true },
            { name: `Bot's Final Hand`, value: formatHand(botHand.cards) + `\nScore: ${botScore}`, inline: true }
        );

    const winnings = calculateWinnings(player1Score, botScore, bet);
    const newBalance = await updatePlayerBalance(player1, winnings);

    if (winnings > 0) {
        embed.setDescription(`${player1.username} wins! You won ${winnings} 💰 and your new balance is ${newBalance} 💰.`);
    } else if (winnings < 0) {
        embed.setDescription(`${player1.username} loses! You lost ${-winnings} 💰 and your new balance is ${newBalance} 💰.`);
    } else {
        embed.setDescription('It\'s a tie!');
    }

    await interaction.editReply({ embeds: [embed], components: [] });
}

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

function formatHand(cards, hideSecondCard = false) {
    return cards.map((card, index) => {
        if (hideSecondCard && index === 1) return 'Hidden';
        return `[${card.value} of ${card.suit}](${card.image})`;
    }).join(', ');
}

async function drawCards(deckId, count) {
    const response = await axios.get(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`);
    return response.data;
}

function calculateScore(cards) {
    let score = 0;
    let hasAce = false;
    for (const card of cards) {
        if (['KING', 'QUEEN', 'JACK'].includes(card.value)) {
            score += 10;
        } else if (card.value === 'ACE') {
            hasAce = true;
            score += 11;
        } else {
            score += parseInt(card.value);
        }
    }
    if (hasAce && score > 21) {
        score -= 10;
    }
    return score;
}

function calculateWinnings(playerScore, botScore, betAmount) {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine if it's happy hour
    const isHappyHours = hour >= 21 && hour < 23;
    
    let winnings = 0;
    
    if (playerScore > 21) {
        winnings = -betAmount; // Player busts
    } else if (playerScore === 21 && playerScore > botScore) {
        winnings = isHappyHours ? 1.5 * betAmount * 2 : 1.5 * betAmount; // Player wins with 21
    } else if (botScore > 21 || playerScore > botScore) {
        winnings = isHappyHours ? 2 * betAmount : betAmount; // Player wins
    } else if (playerScore < botScore) {
        winnings = isHappyHours ? -2 * betAmount : -betAmount; // Bot wins
    }
    
    return winnings;
}

