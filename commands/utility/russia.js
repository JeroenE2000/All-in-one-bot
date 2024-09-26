const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('russia')
        .setDescription('Join the game and play Russian Roulette!'),
    async execute(interaction) {
        const player1 = interaction.user;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join2')
                    .setLabel('Join as Player 2')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({
            content: `${player1.username} has started a game! Waiting for Player 2 to join...`,
            components: [row],
        });

        const filter = (i) => i.customId === 'join2' && i.user.id !== player1.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        let player2 = null;

        collector.on('collect', async (i) => {
            if (!player2) {
                player2 = i.user;
                await i.update({ content: `${player2.username} has joined as Player 2!`, components: [] });

                collector.stop()

                await interaction.followUp(`${player1.username} and ${player2.username} have joined. Let the game begin!`);
                
                await playRussianRoulette(interaction, player1, player2);
            }
        });

        collector.on('end', async () => {
            if (!player2) {
                await interaction.followUp('The game could not start because no one joined as Player 2.');
            }
        });
    },
};

async function playRussianRoulette(interaction, player1, player2) {
    const bulletChamber = ['🔫', '🔫', '🔫', '🔫', '🔫', '💥'];
    let chamberSpin = bulletChamber.sort(() => Math.random() - 0.5);  

    await interaction.followUp('🔄 Spinning the chamber...');
    await sleep(1500); 

    for (let i = 0; i < 6; i++) {  
        const player = i % 2 === 0 ? player1 : player2;
        const currentSlot = chamberSpin.pop();

        await interaction.followUp(`${player.username} pulls the trigger... ${currentSlot}`);

        if (currentSlot === '💥') {
            await interaction.followUp(`${player.username} has lost the game! 💀`);
            await interaction.followUp(`${player1.username} and ${player2.username} have finished the game.`);
            return;
        }
        await sleep(2000);
    }

    await interaction.followUp('Nobody got hit this time. The game is over.');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
