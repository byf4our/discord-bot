const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

// 1. Client Yapılandırması
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Rolleri kontrol etmek için bu gerekli!
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// 2. Ayarlar (Bunları Railway'de 'Variables' kısmına eklemeyi unutma)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1479994227583619123"; 
const GUILD_ID = "1468726399287169137";
const CUSTOMER_ROLE = "1475497125017026741";
const TARGET_CHANNEL = "1468733324003377324";

// Mesaj hakkı sınırlı kullanıcılar
const usedUsers = new Set();

// 3. Bot Hazır Olduğunda
client.once('ready', async () => {
    console.log(`✅ Bot başarıyla giriş yaptı: ${client.user.tag}`);

    // Komut Tanımlama
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
    // Botları ve hedef kanal dışındakileri direkt ele
    if (message.author.bot || message.channel.id !== TARGET_CHANNEL) return;

    // Üye bilgisini kontrol et (cache'de yoksa çek)
    const member = message.member || await message.guild.members.fetch(message.author.id);

    // Eğer kullanıcıda Müşteri Rolü yoksa bot karışmasın
    if (!member.roles.cache.has(CUSTOMER_ROLE)) return;

    // Eğer daha önce mesaj atmışsa
    if (usedUsers.has(message.author.id)) {
        try {
            await message.delete();
            await message.author.send("❌ Üzgünüm, bu kanalda yalnızca 1 mesaj hakkınız bulunmaktadır.").catch(() => {});
        } catch (err) {
            console.log("Mesaj silinemedi veya DM atılamadı:", err.message);
        }
        return;
    }

    // İlk mesajını attı, listeye ekle
    usedUsers.add(message.author.id);
    console.log(`📌 ${message.author.tag} ilk mesajını gönderdi ve limiti doldu.`);
});

// 5. Slash Komut İşleyici
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'messagelimited') {
        // Admin kontrolü
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Bu komutu kullanmak için 'Yönetici' yetkin olmalı!", ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');

        if (usedUsers.has(targetUser.id)) {
            usedUsers.delete(targetUser.id);
            return interaction.reply({ content: `✅ **${targetUser.tag}** kullanıcısının mesaj hakkı sıfırlandı. Artık 1 mesaj daha atabilir.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `ℹ️ **${targetUser.tag}** zaten mesaj hakkını kullanmamış veya limiti yok.`, ephemeral: true });
        }
    }
});

// 6. Giriş İşlemi
if (!TOKEN) {
    console.error("❌ HATA: TOKEN bulunamadı! Railway Variables kısmına 'TOKEN' eklediğinden emin ol.");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ Giriş yapılamadı! Token yanlış olabilir veya Intent ayarların kapalı.");
    console.error(err);
});
