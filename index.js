// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));
app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));

// ====================== DOTENV ==========================
require("dotenv").config();

// ====================== DISCORD.JS ======================
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    PermissionsBitField
} = require("discord.js");

const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");

// ====================== CLIENT ======================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====================== ENV ======================
const {
    CANAL_BAN,
    STAFF_ROLE_ID,
    CANAL_MOD,
    CALL_24H,
    CANAL_BOAS_VINDAS,
    TOKEN
} = process.env;

// ====================== STAFF CHECK ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

// ====================== WARN DB ======================
const warns = new Map();

// =========================================================
// ====================== READY ============================
// =========================================================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ====================== BAN PANEL ======================
    const canalBan = await client.channels.fetch(CANAL_BAN).catch(() => null);

    if (canalBan) {
        const embed = new EmbedBuilder()
            .setTitle("🚫 Sistema de Moderação")
            .setDescription("Painel de moderação")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ban").setLabel("Ban").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("unban").setLabel("Unban").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("kick").setLabel("Kick").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("warn").setLabel("Warn").setStyle(ButtonStyle.Primary)
        );

        canalBan.send({ embeds: [embed], components: [row] });
    }

    // ====================== CALL 24H ======================
    try {
        const canalVC = await client.channels.fetch(CALL_24H).catch(() => null);

        if (canalVC) {
            const conn = joinVoiceChannel({
                channelId: canalVC.id,
                guildId: canalVC.guild.id,
                adapterCreator: canalVC.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            const player = createAudioPlayer();
            const resource = createAudioResource("silencio.mp3");

            player.play(resource);
            conn.subscribe(player);

            console.log("🔊 Call 24h conectado!");
        }
    } catch (err) {
        console.log("Erro VC:", err);
    }

    // ====================== MOD PANEL ======================
    const canalMod = await client.channels.fetch(CANAL_MOD).catch(() => null);

    if (canalMod) {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ Painel de Moderação")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ban").setLabel("Ban").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("unban").setLabel("Unban").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("kick").setLabel("Kick").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("warn").setLabel("Warn").setStyle(ButtonStyle.Primary)
        );

        canalMod.send({ embeds: [embed], components: [row] });
    }
});

// =========================================================
// ====================== MODERATION =======================
// =========================================================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    // 🔒 PERMISSÃO (não bloqueia registro nem modals internos)
    if ((interaction.isButton() || interaction.isModalSubmit()) &&
        !interaction.customId.includes("Registro") &&
        !interaction.customId.includes("modalRegistro") &&
        !isStaff(interaction.member)
    ) {
        return interaction.reply({
            content: "❌ Sem permissão",
            flags: 64
        });
    }

    // ================= MODALS =================
    if (interaction.customId === "ban_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", flags: 64 });

        await member.ban({ reason: motivo });

        return interaction.reply({ content: "Ban aplicado!", flags: 64 });
    }

    if (interaction.customId === "unban_modal") {
        const id = interaction.fields.getTextInputValue("id");
        await interaction.guild.bans.remove(id).catch(() => {});

        return interaction.reply({ content: "Unban aplicado!", flags: 64 });
    }

    if (interaction.customId === "kick_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", flags: 64 });

        await member.kick(motivo);

        return interaction.reply({ content: "Kick aplicado!", flags: 64 });
    }

    if (interaction.customId === "warn_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        if (!warns.has(id)) warns.set(id, []);
        warns.get(id).push(motivo);

        return interaction.reply({ content: "Warn aplicado!", flags: 64 });
    }

    // ================= BUTTON MODALS =================
    if (interaction.isButton()) {

        const modal = (id, title, fields) => {
            const m = new ModalBuilder().setCustomId(id).setTitle(title);

            m.addComponents(...fields.map(f =>
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(f.id)
                        .setLabel(f.label)
                        .setStyle(f.style)
                )
            ));

            return m;
        };

        if (interaction.customId === "ban") {
            return interaction.showModal(modal("ban_modal", "Banir Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short },
                { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
            ]));
        }

        if (interaction.customId === "unban") {
            return interaction.showModal(modal("unban_modal", "Desbanir Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short }
            ]));
        }

        if (interaction.customId === "kick") {
            return interaction.showModal(modal("kick_modal", "Kick Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short },
                { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
            ]));
        }

        if (interaction.customId === "warn") {
            return interaction.showModal(modal("warn_modal", "Warn Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short },
                { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
            ]));
        }
    }
});

// =========================================================
// ====================== BOAS-VINDAS ======================
// =========================================================
// ====================== BOAS-VINDAS ======================
client.on("guildMemberAdd", async (member) => {
    try {

        const canalBoasVindas = member.guild.channels.cache.get(process.env.CANAL_BOAS_VINDAS);

        if (!canalBoasVindas)
            return console.log("❌ Canal de boas-vindas não encontrado!");

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("🎉 Bem-vindo(a)!")
            .setDescription(`👋 Olá ${member}, seja bem-vindo(a) ao servidor!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: "💡 Sabia que...",
                    value: `Você é o **${member.guild.memberCount}º** membro a entrar no servidor!`,
                    inline: true
                },
                {
                    name: "🏷️ Tag do Usuário",
                    value: `\`${member.user.tag}\`\n(${member.id})`,
                    inline: true
                },
                {
                    name: "❓ Precisando de ajuda?",
                    value: `Caso você tenha alguma dúvida ou problema, chame a equipe!`,
                    inline: true
                },
                {
                    name: "⚠️ Evite punições",
                    value: `Leia as regras do servidor para evitar punições!`,
                    inline: false
                }
            )
            .setImage("https://cdn.discordapp.com/attachments/1401678843311427594/1506808671923994766/standard.gif?ex=6a1196ae&is=6a10452e&hm=93c394709ee1105e93eb4fb377a6a0a6e9db72cbbf98bb48037d3f5b2e2cb564&")
            .setFooter({
                text: "Todos os direitos reservados."
            })
            .setTimestamp();

        await canalBoasVindas.send({
            content: `🎉 ${member}`,
            embeds: [embed]
        });

    } catch (err) {
        console.log("Erro na mensagem de boas-vindas:", err);
    }
});

client.login(TOKEN);
