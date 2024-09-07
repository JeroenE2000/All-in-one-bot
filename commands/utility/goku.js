const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const imagesPath = path.join(__dirname, '..', '..', 'images');
const files = fs.readdirSync(imagesPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('goku')
        .setDescription('Get a Goku image.'),

    async execute(interaction) {
        const file = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(imagesPath, file); 

        // Create an attachment and send it
        const attachment = new AttachmentBuilder(filePath);
        await interaction.reply({ content: 'Here is a Goku image:', files: [attachment] });
    }
};
