const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// AYARLAR
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1479994227583619123"; // bot id
const GUILD_ID = "1468726399287169137";

const CUSTOMER_ROLE = "1475497125017026741";
const TARGET_CHANNEL = "1468733324003377324";

// kullanıcı mesaj hakkı veritabanı (basit)
const usedUsers = new Set();

// BOT READY
client.once('ready', async () => {
    console.log(`✅ Bot aktif: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('messagelimited')
            .setDescription('Kullanıcının mesaj hakkını sıfırlar')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Kullanıcı')
                    .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✅ Slash komut yüklendi");
    } catch (err) {
        console.error(err);
    }
});

// MESAJ KONTROL
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // sadece belirli kanal
    if (message.channel.id !== TARGET_CHANNEL) return;

    // müşteri mi?
    if (!message.member.roles.cache.has(CUSTOMER_ROLE)) return;

    // daha önce yazmış mı?
    if (usedUsers.has(message.author.id)) {
        try {
            await message.author.send("❌ Daha önce mesaj limitini kullandın!");
        } catch {
            console.log("DM gönderilemedi");
        }
        await message.delete().catch(() => {});
        return;
    }

    // ilk mesaj
    usedUsers.add(message.author.id);
});

// SLASH KOMUT
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'messagelimited') {

        // admin kontrol
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Yetkin yok!", ephemeral: true });
        }

        const user = interaction.options.getUser('user');

        usedUsers.delete(user.id);

        interaction.reply({
            content: `✅ ${user.tag} kullanıcısının mesaj hakkı sıfırlandı.`,
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);
