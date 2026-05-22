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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====================== ENV ======================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;

const CANAL_BAN = process.env.CANAL_BAN;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const TOKEN = process.env.TOKEN;

// ====================== FUNÇÃO STAFF ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

// ====================== BOT ONLINE ========================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ===== SISTEMA A7 =====
    const canal = await client.channels.fetch(CANAL_PEDIR_SET);

    const embed = new EmbedBuilder()
        .setTitle("Sistema Família A7")
        .setDescription("Registro A7.\n\nSolicite SET usando o botão abaixo.")
        .setColor("#f1c40f");

    const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("abrirRegistro")
            .setLabel("Registro")
            .setStyle(ButtonStyle.Primary)
    );

    await canal.send({ embeds: [embed], components: [btn] });

    // ===== PAINEL BAN =====
    const canalBan = await client.channels.fetch(CANAL_BAN).catch(() => null);

    if (canalBan) {
        const painel = new EmbedBuilder()
            .setTitle("🚫 Sistema de Moderação")
            .setDescription("Use os botões para banir ou desbanir usuários.")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ban_open")
                .setLabel("Banir usuário")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("unban_open")
                .setLabel("Desbanir usuário")
                .setStyle(ButtonStyle.Success)
        );

        canalBan.send({ embeds: [painel], components: [row] });
    }

    // ===== CALL 24H =====
    try {
        const canalVC = client.channels.cache.get(process.env.CALL_24H);

        if (canalVC) {
            const conexao = joinVoiceChannel({
                channelId: canalVC.id,
                guildId: canalVC.guild.id,
                adapterCreator: canalVC.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            const player = createAudioPlayer();
            const resource = createAudioResource("silencio.mp3");

            player.play(resource);
            conexao.subscribe(player);

            console.log("🔊 Bot conectado em call 24h!");
        }
    } catch (err) {
        console.log("Erro VC:", err);
    }
});

// ====================== REGISTRO A7 ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (interaction.isButton() && interaction.customId === "abrirRegistro") {

        const modal = new ModalBuilder()
            .setCustomId("modalRegistro")
            .setTitle("Solicitação de Set");

        const nome = new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Seu nome")
            .setStyle(TextInputStyle.Short);

        const id = new TextInputBuilder()
            .setCustomId("iduser")
            .setLabel("Seu ID")
            .setStyle(TextInputStyle.Short);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(id)
        );

        return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modalRegistro") {

        const nome = interaction.fields.getTextInputValue("nome");
        const iduser = interaction.fields.getTextInputValue("iduser");

        const canal = await client.channels.fetch(CANAL_ACEITA_SET);

        const embed = new EmbedBuilder()
            .setTitle("Novo Pedido de Registro")
            .setColor("#3498db")
            .addFields(
                { name: "Usuário", value: `${interaction.user}` },
                { name: "Nome", value: nome },
                { name: "ID", value: iduser }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aprovar_${interaction.user.id}`)
                .setLabel("Aprovar")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`negar_${interaction.user.id}`)
                .setLabel("Negar")
                .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "Enviado!", ephemeral: true });
    }
});

// ====================== APROVAR / NEGAR ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isButton()) return;

    const [acao, userId] = interaction.customId.split("_");
    if (!["aprovar", "negar"].includes(acao)) return;

    const membro = await interaction.guild.members.fetch(userId);
    const embedOriginal = interaction.message.embeds[0];

    const nome = embedOriginal.fields.find(f => f.name === "Nome")?.value;

    if (acao === "aprovar") {
        await membro.setNickname(`A7 ${nome}`);
        await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

        await interaction.update({
            content: "Aprovado!",
            embeds: [],
            components: []
        });
    }

    if (acao === "negar") {
        await membro.kick("Negado");

        await interaction.update({
            content: "Negado!",
            embeds: [],
            components: []
        });
    }
});

// ====================== PVALL ======================
client.on("messageCreate", async (message) => {

    if (!message.content.startsWith("!pvall")) return;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("Sem permissão!");
    }

    const texto = message.content.split(" ").slice(1).join(" ");

    const members = await message.guild.members.fetch();

    let enviados = 0;

    members.forEach(m => {
        if (!m.user.bot) {
            m.send(texto).then(() => enviados++).catch(() => {});
        }
    });

    message.reply("Enviado para membros!");
});

const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require("discord.js");

// ====================== DB SIMPLES WARN ======================
const warns = new Map();

// ====================== STAFF CHECK ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(process.env.STAFF_ROLE_ID)
    );
}

// ====================== LOG SYSTEM ======================
async function sendLog(client, type, userId, reason, staff) {
    try {
        const canal = await client.channels.fetch(process.env.CANAL_LOG);

        const embed = new EmbedBuilder()
            .setTitle(`📌 ${type}`)
            .addFields(
                { name: "Usuário", value: `<@${userId}> (${userId})` },
                { name: "Motivo", value: reason || "Nenhum" },
                { name: "Staff", value: `<@${staff}>` }
            )
            .setColor("Yellow")
            .setTimestamp();

        canal.send({ embeds: [embed] });
    } catch (e) {
        console.log("Erro log:", e);
    }
}

// ====================== PAINEL ======================
client.on("ready", async () => {
    try {
        const canal = await client.channels.fetch(process.env.CANAL_MOD);

        const embed = new EmbedBuilder()
            .setTitle("🛡️ Painel de Moderação")
            .setDescription("Sistema completo de staff")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ban").setLabel("Ban").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("unban").setLabel("Unban").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("kick").setLabel("Kick").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("warn").setLabel("Warn").setStyle(ButtonStyle.Primary)
        );

        canal.send({ embeds: [embed], components: [row] });

    } catch (e) {
        console.log(e);
    }
});

// ====================== INTERACTIONS ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    // 🔒 STAFF ONLY
    if ((interaction.isButton() || interaction.isModalSubmit()) && !isStaff(interaction.member)) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {

        // BAN
        if (interaction.customId === "ban") {
            const modal = new ModalBuilder()
                .setCustomId("ban_modal")
                .setTitle("Banir Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("id")
                        .setLabel("ID do usuário")
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("motivo")
                        .setLabel("Motivo")
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

            return interaction.showModal(modal);
        }

        // UNBAN
        if (interaction.customId === "unban") {
            const modal = new ModalBuilder()
                .setCustomId("unban_modal")
                .setTitle("Desbanir Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("id")
                        .setLabel("ID do usuário")
                        .setStyle(TextInputStyle.Short)
                )
            );

            return interaction.showModal(modal);
        }

        // KICK
        if (interaction.customId === "kick") {
            const modal = new ModalBuilder()
                .setCustomId("kick_modal")
                .setTitle("Expulsar Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("id")
                        .setLabel("ID do usuário")
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("motivo")
                        .setLabel("Motivo")
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

            return interaction.showModal(modal);
        }

        // WARN
        if (interaction.customId === "warn") {
            const modal = new ModalBuilder()
                .setCustomId("warn_modal")
                .setTitle("Warn Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("id")
                        .setLabel("ID do usuário")
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("motivo")
                        .setLabel("Motivo")
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

            return interaction.showModal(modal);
        }
    }

    // ================= BAN REAL =================
    if (interaction.customId === "ban_modal") {

        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", ephemeral: true });

        await member.ban({ reason: motivo });

        await sendLog(client, "BAN", id, motivo, interaction.user.id);

        return interaction.reply({ content: "✅ Ban aplicado!", ephemeral: true });
    }

    // ================= UNBAN REAL =================
    if (interaction.customId === "unban_modal") {

        const id = interaction.fields.getTextInputValue("id");

        await interaction.guild.bans.remove(id).catch(() => {});

        await sendLog(client, "UNBAN", id, "Sem motivo", interaction.user.id);

        return interaction.reply({ content: "✅ Unban aplicado!", ephemeral: true });
    }

    // ================= KICK =================
    if (interaction.customId === "kick_modal") {

        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", ephemeral: true });

        await member.kick(motivo);

        await sendLog(client, "KICK", id, motivo, interaction.user.id);

        return interaction.reply({ content: "✅ Kick aplicado!", ephemeral: true });
    }

    // ================= WARN =================
    if (interaction.customId === "warn_modal") {

        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        if (!warns.has(id)) warns.set(id, []);
        warns.get(id).push(motivo);

        await sendLog(client, "WARN", id, motivo, interaction.user.id);

        return interaction.reply({ content: "⚠️ Warn aplicado!", ephemeral: true });
    }
});
client.login(TOKEN);
