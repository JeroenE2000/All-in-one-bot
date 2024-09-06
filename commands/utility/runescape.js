const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { grandexchange } = require('runescape-api');

let grandExchangeCategories = [];
let currentCategoryPage = 0;

// Initialize Grand Exchange categories
async function initializeCategories() {
    try {
        grandExchangeCategories = await grandexchange.getCategories();
    } catch (error) {
        console.error('Failed to fetch Grand Exchange categories:', error);
    }
}

// Call initialization
initializeCategories();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ge')
        .setDescription('Search for item prices and details in the Grand Exchange.'),

    async execute(interaction) {
        if (grandExchangeCategories.length === 0) {
            await interaction.reply('The Grand Exchange categories have not been loaded yet. Please try again later.');
            return;
        }

        // Function to create category select menu
        const createCategorySelectMenu = (page) => {
            const categoriesPerPage = 25;
            const start = page * categoriesPerPage;
            const end = start + categoriesPerPage;
            const categoriesToDisplay = grandExchangeCategories.slice(start, end);

            const options = categoriesToDisplay.map(category => ({
                label: category.name,
                value: category.id.toString()
            }));

            return new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select-category')
                        .setPlaceholder('Select a category')
                        .addOptions(options)
                );
        };

        // Function to create pagination buttons
        const createPaginationButtons = () => {
            const row = new ActionRowBuilder();
            if (currentCategoryPage > 0) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev-page')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                );
            }
            if ((currentCategoryPage + 1) * 25 < grandExchangeCategories.length) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('next-page')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                );
            }
            return row;
        };

        const replyMessage = await interaction.reply({
            content: 'Please select a category:',
            components: [createCategorySelectMenu(currentCategoryPage), createPaginationButtons()],
            fetchReply: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'select-category') {
                const selectedCategoryId = i.values[0];
                await i.update({
                    content: `You selected category ID: ${selectedCategoryId}. Please enter the first letter of the item:`,
                    components: []
                });

                const itemFilter = response => response.author.id === interaction.user.id;
                const itemCollector = interaction.channel.createMessageCollector({ filter: itemFilter, time: 60000 });

                itemCollector.on('collect', async (itemMessage) => {
                    const firstLetter = itemMessage.content.trim().toLowerCase();
                    await fetchAndDisplayItems(selectedCategoryId, firstLetter, i, itemCollector);
                });
            }
        });
    }
};

async function fetchAndDisplayItems(categoryId, firstLetter, interaction, itemCollector) {
    try {
        const itemsResponse = await axios.get(`https://services.runescape.com/m=itemdb_rs/api/catalogue/items.json`, {
            params: {
                category: categoryId,
                alpha: firstLetter,
                page: 1
            }
        });
        const itemsData = itemsResponse.data;

        if (itemsData.items.length === 0) {
            await interaction.followUp('No items found with that initial letter. Please try again.');
            itemCollector.stop();
            return;
        }

        const itemOptions = itemsData.items.map(item => ({
            label: item.name,
            value: item.id.toString()
        }));

        const itemRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select-item')
                    .setPlaceholder('Select an item')
                    .addOptions(itemOptions)
            );

        await interaction.followUp({ content: 'Select an item:', components: [itemRow] });

        const itemSelectionFilter = i => i.customId === 'select-item' && i.user.id === interaction.user.id;
        const itemSelectionCollector = interaction.channel.createMessageComponentCollector({ filter: itemSelectionFilter, time: 60000 });

        itemSelectionCollector.on('collect', async (itemSelection) => {
            await displayItemDetails(itemSelection);
            itemSelectionCollector.stop();
        });

        itemCollector.stop();
    } catch (error) {
        console.error('Failed to retrieve items:', error);
        await interaction.followUp('Failed to retrieve items. Please try again later.');
    }
}

async function displayItemDetails(itemSelection) {
    const selectedItemId = itemSelection.values[0];
    try {
        const itemDetailResponse = await axios.get(`https://services.runescape.com/m=itemdb_rs/api/catalogue/detail.json`, {
            params: { item: selectedItemId }
        });
        const itemDetailData = itemDetailResponse.data.item;

        const embed = new EmbedBuilder()
            .setTitle(itemDetailData.name)
            .setDescription(itemDetailData.description)
            .setThumbnail(itemDetailData.icon_large)
            .addFields(
                { name: 'Price', value: itemDetailData.current.price, inline: true },
                { name: 'Trend', value: itemDetailData.current.trend, inline: true },
                { name: 'Members', value: itemDetailData.members.toString(), inline: true },
                { name: '30 Day Change', value: itemDetailData.day30.change, inline: true },
                { name: '90 Day Change', value: itemDetailData.day90.change, inline: true },
                { name: '180 Day Change', value: itemDetailData.day180.change, inline: true }
            );

        await itemSelection.update({ content: 'Item details:', components: [], embeds: [embed] });
    } catch (error) {
        console.error('Failed to retrieve item details:', error);
        await itemSelection.update({ content: 'Failed to retrieve item details. Please try again later.', components: [] });
    }
}
