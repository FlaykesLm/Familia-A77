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

// ====================== ENV SET + MOD ======================
const {
    CANAL_PEDIR_SET,
    CANAL_ACEITA_SET,
    CARGO_APROVADO,
    CARGO_APROVADO_2,

    CANAL_BAN,
    STAFF_ROLE_ID,
    CANAL_MOD,
    CALL_24H,
    CANAL_BOAS_VINDAS,
    TOKEN
} = process.env;

// ====================== DB ======================
const warns = new Map();

// ====================== STAFF CHECK ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

// =========================================================
// ====================== READY ============================
// =========================================================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ===== SET PANEL =====
    const canal = await client.channels.fetch(CANAL_PEDIR_SET).catch(() => null);

    if (canal) {
        const embed = new EmbedBuilder()
            .setTitle("Sistema Família Do7")
            .setDescription("Registro A7.\n\nSolicite SET usando o botão abaixo.\nPreencha com atenção!")
            .addFields({
                name: "📌 Lembretes",
                value: "• A resenha aqui é garantida.\n• Não leve tudo a sério.",
            })
            .setColor("#f1c40f");

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("abrirRegistro")
                .setLabel("Registro")
                .setStyle(ButtonStyle.Primary)
        );

        await canal.send({ embeds: [embed], components: [btn] });
        console.log("📩 Mensagem de registro enviada!");
    }

    // ===== MOD PANEL =====
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
// ====================== INTERACTIONS (ÚNICO) =============
// =========================================================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    // 🔒 PROTEÇÃO ANTI CRASH
    if (interaction.replied || interaction.deferred) return;

    // ====================== SET SYSTEM ======================
    if (interaction.isButton() && interaction.customId === "abrirRegistro") {

        const modal = new ModalBuilder()
            .setCustomId("modalRegistro")
            .setTitle("Solicitação de Set");

        const nome = new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Seu nome*")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        const id = new TextInputBuilder()
            .setCustomId("iduser")
            .setLabel("Seu ID*")
            .setRequired(true)
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

        const canal = await client.channels.fetch(CANAL_ACEITA_SET).catch(() => null);

        if (!canal) return;

        const embed = new EmbedBuilder()
            .setTitle("Novo Pedido de Registro")
            .setColor("#3498db")
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: "Usuário", value: `${interaction.user}` },
                { name: "Nome Informado", value: nome },
                { name: "ID Informado", value: iduser }
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

        return interaction.reply({
            content: "Seu pedido foi enviado!",
            flags: 64
        });
    }

    // ====================== APPROVE / DENY ======================
    if (interaction.isButton() && interaction.customId.startsWith("aprovar_") || interaction.customId.startsWith("negar_")) {

        const [acao, userId] = interaction.customId.split("_");

        const membro = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;

        const embedOriginal = interaction.message.embeds[0];
        const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
        const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

        if (acao === "aprovar") {

            await membro.setNickname(`A7 ${nomeInformado}`).catch(() => {});
            await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]).catch(() => {});

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Registro Aprovado")
                        .setDescription(`Usuário ${membro} aprovado`)
                ],
                components: []
            });
        }

        if (acao === "negar") {

            await membro.kick().catch(() => {});

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Registro Negado")
                        .setDescription(`Usuário ${membro.user.tag} expulso`)
                ],
                components: []
            });
        }
    }

    // ====================== MODALS MOD ======================
    if (interaction.isModalSubmit()) {

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
    }

    // ====================== BUTTON MOD ======================
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

        if (interaction.customId === "ban") return interaction.showModal(modal("ban_modal", "Banir Usuário", [
            { id: "id", label: "ID", style: TextInputStyle.Short },
            { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
        ]));

        if (interaction.customId === "unban") return interaction.showModal(modal("unban_modal", "Desbanir Usuário", [
            { id: "id", label: "ID", style: TextInputStyle.Short }
        ]));

        if (interaction.customId === "kick") return interaction.showModal(modal("kick_modal", "Kick Usuário", [
            { id: "id", label: "ID", style: TextInputStyle.Short },
            { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
        ]));

        if (interaction.customId === "warn") return interaction.showModal(modal("warn_modal", "Warn Usuário", [
            { id: "id", label: "ID", style: TextInputStyle.Short },
            { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
        ]));
    }
});

// ====================== LOGIN ======================
client.login(TOKEN);
