const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

// 1. Client Yapılandırması (Gerekli tüm izinler eklendi)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// 2. Ayarlar (Railway Variables kısmına TOKEN eklemeyi unutma)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1479994227583619123"; 
const GUILD_ID = "1468726399287169137";
const CUSTOMER_ROLE = "1475497125017026741";
const TARGET_CHANNEL = "1468733324003377324";

// Kullanıcı limit takibi
const usedUsers = new Set();

// 3. Bot Hazır Olduğunda Komutları Yükle
client.once('ready', async () => {
    console.log(`✅ Bot aktif: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('messagelimited')
            .setDescription('Kullanıcının mesaj hakkını sıfırlar')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Hakkı sıfırlanacak kullanıcı')
                    .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log("Slash komutları yükleniyor...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✅ Slash komutları başarıyla senkronize edildi.");
    } catch (err) {
        console.error("Komut yükleme hatası:", err);
    }
});

// 4. Mesaj Kontrol Mantığı
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL) return;

    try {
        const member = message.member || await message.guild.members.fetch(message.author.id);

        // Müşteri rolü yoksa işlem yapma
        if (!member.roles.cache.has(CUSTOMER_ROLE)) return;

        // Daha önce yazmış mı?
        if (usedUsers.has(message.author.id)) {
            await message.delete().catch(() => {});
            await message.author.send("❌ Üzgünüm, bu kanalda yalnızca 1 mesaj hakkınız bulunmaktadır.").catch(() => {});
            return;
        }

        // İlk mesajıysa listeye ekle
        usedUsers.add(message.author.id);
        console.log(`📌 ${message.author.tag} limitlendi.`);
    } catch (err) {
        console.error("Mesaj kontrol hatası:", err);
    }
});

// 5. Slash Komut İşleyici
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'messagelimited') {
        // Yetki kontrolü
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Bu komut için Yönetici yetkisi gerekir!", ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');

        if (usedUsers.has(targetUser.id)) {
            usedUsers.delete(targetUser.id);
            return interaction.reply({ content: `✅ **${targetUser.tag}** kullanıcısının mesaj hakkı sıfırlandı.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `ℹ️ Bu kullanıcı zaten limitli değil.`, ephemeral: true });
        }
    }
});

// 6. Giriş İşlemi
if (!TOKEN) {
    console.error("❌ HATA: Railway Variables kısmında TOKEN bulunamadı!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ Giriş başarısız! Intent'lerin açık olduğundan emin ol.");
    console.error(err);
});
